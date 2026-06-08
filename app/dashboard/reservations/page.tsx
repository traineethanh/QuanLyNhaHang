import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { ReservationsContent } from "./reservations-content";
import { ThemeProvider } from "@/components/theme-provider";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";

export const dynamic = "force-dynamic";

async function getReservationsData() {
  const supabase = await createClient();

  // Fetch song song danh sách đặt bàn và danh sách bàn (Đã sửa để JOIN lấy thêm thông tin Area/Tầng)
  const [reservationsRes, tablesRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, table:tables(*, area:areas(*))") // Lấy thông tin khu vực của bàn trong lịch hẹn
      .order("reservation_time", { ascending: true }),

    supabase
      .from("tables")
      .select("*, area:areas(*)") // 🔥 SỬA CHỖ NÀY: Lấy kèm thông tin tầng/khu vực của tất cả các bàn
      .eq("is_active", true),
  ]);

  return {
    reservations: reservationsRes.data || [],
    tables: tablesRes.data || [],
  };
}

export default async function ReservationsPage() {
  // ==================== ⚡LOGIC BẢO MẬT  ====================
  const supabase = await createClient();

  // 1. Lấy thông tin phiên đăng nhập hiện tại
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // 2. Kiểm tra vai trò thực tế (Role) từ Database
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;

  // 3. CHẶN QUYỀN: Nếu không phải Quản lý (manager) hoặc Thu ngân (cashier), đá ngược về trang dashboard ngay lập tức
  if (userRole !== "manager" && userRole !== "cashier") {
    redirect("/dashboard");
  }
  // =========================================================================

  const data = await getReservationsData();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Header title="Quản lý đặt bàn (Reservations)" />
      <main className="flex-1 p-4 md:p-6 overflow-auto bg-muted/30">
        <ReservationsContent {...data} />
      </main>
    </ThemeProvider>
  );
}

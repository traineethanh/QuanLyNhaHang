import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";

// Chống lưu cache theo đúng kiến trúc của bạn
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Khởi tạo client phía Server bằng Cookie Store
  const supabase = await createClient();

  // 2. Lấy thông tin tài khoản hiện tại
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // 3. Truy vấn trực tiếp thông tin quyền (Role) của User từ bảng profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/error");
  }

  const userRole = profile.role as UserRole;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* SidebarProvider mặc định đã là full màn hình, không bọc thêm div h-screen bên ngoài nó */}
      <SidebarProvider>
        <AppSidebar />

        {/* Vùng chứa nội dung trang Page: flex-1 sẽ tự chiếm nốt diện tích còn lại của màn hình */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarProvider>
    </ThemeProvider>
  );
}

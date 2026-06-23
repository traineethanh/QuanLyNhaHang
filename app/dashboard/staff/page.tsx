// app/dashboard/staff/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { StaffContent } from "./staff-content";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function getStaffData() {
  const supabase = await createClient();

  // 1. Lấy toàn bộ danh sách hồ sơ nhân viên trong hệ thống
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profileError) {
    console.error("Lỗi khi lấy danh sách nhân viên:", profileError);
  }

  // 2. CHỈ lấy danh sách chấm công của những ca/ngày CHƯA THANH TOÁN LƯƠNG để tính tích lũy
  const { data: attendanceLogs, error: logError } = await supabase
    .from("attendance_logs")
    .select(
      `
      employee_id,
      status,
      late_minutes,
      shifts ( total_hours )
    `,
    )
    .eq("payment_status", "unpaid");

  if (logError) {
    console.error("Lỗi khi lấy log chấm công chưa thanh toán:", logError);
  }

  // 3. Tính toán tổng số giờ làm việc tích lũy cho từng nhân sự
  const profilesWithHours = (profiles || []).map((profile) => {
    const employeeLogs = (attendanceLogs || []).filter(
      (log) => log.employee_id === profile.id,
    );

    const totalHours = employeeLogs.reduce((sum, log) => {
      // Ép kiểu shifts từ câu query
      const shiftHours = (log.shifts as any)?.total_hours || 0;

      if (log.status === "present") {
        return sum + Number(shiftHours);
      } else if (log.status === "late") {
        // Khấu trừ số phút đi muộn (số phút / 60)
        const penaltyHours = (log.late_minutes || 0) / 60;
        return sum + Math.max(0, Number(shiftHours) - penaltyHours);
      }
      return sum; // Nghỉ (absent) hoặc vắng mặt tính 0 giờ
    }, 0);

    return {
      ...profile,
      total_working_hours: totalHours,
    };
  });

  return {
    profiles: profilesWithHours,
  };
}

export default async function StaffPage() {
  // ==================== ⚡LOGIC BẢO MẬT ====================
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;

  if (userRole !== "manager") {
    redirect("/dashboard");
  }

  const { profiles } = await getStaffData();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Header
        title="Nhân sự & Lương"
        // description="Quản lý hồ sơ nhân sự, phê duyệt công nhật và chốt quyết toán lương."
      />
      <StaffContent profiles={profiles} />
    </div>
  );
}

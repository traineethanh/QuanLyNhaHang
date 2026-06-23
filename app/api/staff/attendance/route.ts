// app/api/staff/attendance/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sử dụng Service Role Key để có quyền ghi đè cấu hình bypass RLS khi chốt công tập trung
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 🟢 1. API CHỐT CÔNG TẬP TRUNG CUỐI NGÀY CA LÀM
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendanceRecords, date } = body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return NextResponse.json(
        { error: "Dữ liệu chấm công không hợp lệ" },
        { status: 400 },
      );
    }

    // Định dạng ngày dạng YYYY-MM-DD theo chuẩn múi giờ địa phương Việt Nam
    const logDate = date || new Date().toLocaleDateString("sv-SE");

    // Ánh xạ dữ liệu để Upsert
    const upsertData = attendanceRecords.map((rec) => ({
      employee_id: rec.employee_id,
      shift_id: rec.shift_id,
      attendance_date: logDate,
      status: rec.status,
      late_minutes: rec.status === "late" ? Number(rec.late_minutes || 0) : 0,
      is_locked: true,
      payment_status: "unpaid", // Luôn lưu mặc định ban đầu là chưa thanh toán lương
    }));

    const { error } = await supabaseAdmin
      .from("attendance_logs")
      .upsert(upsertData, {
        onConflict: "employee_id,shift_id,attendance_date",
      });

    if (error) throw error;

    return NextResponse.json(
      { message: "Ghi nhận nhật ký ca công thành công!" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔴 2. API QUYẾT TOÁN LƯƠNG - CHUYỂN TRẠNG THÁI SANG PAID (LÀM SẠCH QUỸ GIỜ CHU KỲ MỚI)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { employeeId } = body;

    let query = supabaseAdmin
      .from("attendance_logs")
      .update({ payment_status: "paid" })
      .eq("payment_status", "unpaid");

    // Nếu truyền employeeId cụ thể thì quyết toán riêng cho người đó, không truyền thì quyết toán tất cả
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json(
      { message: "Quyết toán hoàn tất, quỹ giờ làm việc đã được làm mới!" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

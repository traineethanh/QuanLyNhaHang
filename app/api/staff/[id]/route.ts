// app/api/staff/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚠️ QUAN TRỌNG: Sử dụng SERVICE_ROLE_KEY để kích hoạt quyền auth.admin bypass RLS
// nhằm cập nhật trực tiếp mật khẩu và email của User khác trong hệ thống Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Đảm bảo bạn đã khai báo khóa này trong file .env.local
);

// API: CẬP NHẬT CHỨC VỤ, TRẠNG THÁI, THÔNG TIN CÁ NHÂN, EMAIL HOẶC MẬT KHẨU NHÂN VIÊN
export async function PATCH(
  request: Request,
  context: any, // Sử dụng cấu trúc context để tương thích an toàn với Node.js 16/Next.js phiên bản hiện tại
) {
  try {
    // 1. Cơ chế bóc tách params thích ứng linh hoạt phiên bản Next.js trên máy bạn
    const paramsResolved =
      context.params && typeof context.params.then === "function"
        ? await context.params
        : context.params;

    const id = paramsResolved?.id;

    // Chặn rác dữ liệu truyền từ Frontend
    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json(
        { error: "Mã định danh nhân viên (ID) không hợp lệ hoặc bị thiếu" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updateData: any = {};
    const authUpdateData: any = {}; // Object chứa dữ liệu cập nhật riêng cho bảng Supabase Auth (Email/Password)

    // 2. Ép kiểu bảo vệ và dọn sạch dữ liệu trước khi chèn vào database

    // Cập nhật Chức vụ (Role)
    if (
      body.role &&
      ["manager", "cashier", "waiter", "kitchen"].includes(body.role)
    ) {
      updateData.role = String(body.role);
    }

    // Cập nhật Trạng thái hoạt động (Active/Lock)
    if (body.is_active !== undefined) {
      updateData.is_active =
        body.is_active === "undefined" || body.is_active === null
          ? true
          : Boolean(body.is_active);
    }

    // Cập nhật Họ và tên
    if (body.full_name !== undefined) {
      updateData.full_name = String(body.full_name).trim();
    }

    // Cập nhật Số điện thoại (Xử lý linh hoạt chuỗi trống hoặc null)
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? String(body.phone).trim() : null;
    }

    // Cập nhật Mức lương theo giờ
    if (body.hourly_rate !== undefined) {
      updateData.hourly_rate = Number(body.hourly_rate);
    }

    // [BỔ SUNG] Xử lý cập nhật EMAIL mới
    if (body.new_email !== undefined && body.new_email !== null) {
      const emailStr = String(body.new_email).trim();
      if (emailStr.length > 0) {
        authUpdateData.email = emailStr;
        authUpdateData.email_confirm = true; // Tự động xác thực email mới để tránh kẹt trạng thái chờ xác nhận
      }
    }

    // [BỔ SUNG] Xử lý cập nhật MẬT KHẨU mới
    if (body.new_password !== undefined && body.new_password !== null) {
      const passwordStr = String(body.new_password);
      if (passwordStr.trim().length >= 6) {
        authUpdateData.password = passwordStr;
      }
    }

    // 3. Tiến hành cập nhật vào hệ thống Supabase Auth bằng quyền Admin tối cao nếu có yêu cầu đổi email/mật khẩu
    if (Object.keys(authUpdateData).length > 0) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData);

      if (authError) {
        console.error(
          "Lỗi Supabase khi cập nhật Auth (Email/Password):",
          authError,
        );
        return NextResponse.json(
          { error: `Lỗi cập nhật tài khoản đăng nhập: ${authError.message}` },
          { status: 400 },
        );
      }
    }

    // Chặn trường hợp gửi request rỗng không thay đổi gì ở cả thông tin lẫn tài khoản đăng nhập
    if (
      Object.keys(updateData).length === 0 &&
      Object.keys(authUpdateData).length === 0
    ) {
      return NextResponse.json(
        { error: "Không có thông tin nào được yêu cầu thay đổi" },
        { status: 400 },
      );
    }

    // Nếu không thay đổi hồ sơ cá nhân mà chỉ thay đổi mật khẩu/email, trả về thành công luôn
    if (Object.keys(updateData).length === 0) {
      // Lấy thông tin hiện tại từ bảng profiles để trả về giao diện cấu trúc cũ khớp đồng bộ
      const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      return NextResponse.json(currentProfile, { status: 200 });
    }

    updateData.updated_at = new Date().toISOString();

    // 4. Tiến hành cập nhật dữ liệu vào bảng public.profiles trên Supabase
    const { data: updatedProfile, error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Lỗi Supabase khi cập nhật thông tin nhân viên:", error);
      return NextResponse.json(
        { error: `Lỗi Supabase: ${error.message}` },
        { status: 400 },
      );
    }

    // Bóc tách lấy object đầu tiên của mảng trả về
    return NextResponse.json(
      updatedProfile && updatedProfile.length > 0 ? updatedProfile[0] : null,
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

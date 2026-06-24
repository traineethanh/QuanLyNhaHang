// app/api/staff/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚠️ QUAN TRỌNG: Sử dụng SERVICE_ROLE_KEY để kích hoạt quyền auth.admin bypass RLS tạo User
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Đảm bảo bạn đã khai báo khóa này trong file .env.local
);

// API: TẠO TÀI KHOẢN VÀ HỒ SƠ NHÂN VIÊN MỚI
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role, phone, hourly_rate } = body;

    // 1. Kiểm tra dữ liệu đầu vào bắt buộc
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ các trường bắt buộc" },
        { status: 400 },
      );
    }

    // 2. Bước 1: Tạo tài khoản đăng nhập trong hệ thống Supabase Auth bằng quyền Admin
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true, // Tự động xác thực email để nhân viên đăng nhập được ngay mà không cần check hòm thư
      });

    if (authError) {
      console.error("Lỗi tạo Auth User:", authError);
      return NextResponse.json(
        { error: `Lỗi hệ thống Auth: ${authError.message}` },
        { status: 400 },
      );
    }

    const userId = authUser.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Không thể khởi tạo mã định danh User ID" },
        { status: 500 },
      );
    }

    // 3. Bước 2: Lấy userId vừa sinh ra để chèn hồ sơ chi tiết vào bảng public.profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: userId, // Khóa ngoại đồng bộ 1-1 link sang auth.users
          full_name: String(full_name).trim(),
          role: String(role),
          phone: phone ? String(phone).trim() : null,
          is_active: true,
          hourly_rate: hourly_rate ? Number(hourly_rate) : 0, // Lưu mức lương theo giờ
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error("Lỗi tạo hồ sơ Profiles:", profileError);
      // Cơ chế dọn rác tự động: Nếu tạo hồ sơ lỗi, tiến hành xóa tài khoản Auth vừa sinh ra để tránh kẹt dữ liệu
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Lỗi lưu bảng Profiles: ${profileError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Tạo tài khoản nhân viên thành công", data: profileData },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

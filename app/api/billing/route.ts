// app/api/billing/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Quy tắc Bảo mật RLS: Khởi tạo kết nối có nạp cookie store bắt buộc có await
    const supabase = await createClient();

    // Lấy ID của nhân viên Thu ngân đang đăng nhập thực hiện giao dịch
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cashierId = user ? user.id : null;

    const body = await request.json();
    const {
      order_ids,
      table_id,
      amount,
      payment_method,
      discount,
      received_amount,
      change_amount,
      note,
    } = body;

    // 2. Thanh lọc dữ liệu rác đầu vào an toàn
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Danh sách ID đơn hàng không hợp lệ" },
        { status: 400 },
      );
    }

    // Bước A: Ghi nhận lịch sử giao dịch vào bảng thanh toán `payments` cho đơn hàng tổng đầu tiên làm gốc
    const mainOrderId = order_ids[0];
    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: mainOrderId,
      cashier_id: cashierId,
      amount: Number(amount) || 0,
      payment_method: payment_method || "cash",
      status: "paid",
      received_amount: Number(received_amount) || 0,
      change_amount: Number(change_amount) || 0,
      note: note && note.trim() !== "" ? note.trim() : null,
    });

    if (paymentError) {
      return NextResponse.json(
        { error: `Lỗi ghi nhận thanh toán: ${paymentError.message}` },
        { status: 400 },
      );
    }

    // Bước B: Cập nhật trạng thái đồng loạt của tất cả các hóa đơn con trùng bàn thành 'completed'
    const { error: ordersUpdateError } = await supabase
      .from("orders")
      .update({
        status: "completed",
        discount: Number(discount) || 0,
        updated_at: new Date().toISOString(),
      })
      .in("id", order_ids);

    if (ordersUpdateError) {
      return NextResponse.json(
        { error: `Lỗi đóng trạng thái đơn hàng: ${ordersUpdateError.message}` },
        { status: 400 },
      );
    }

    // Bước C: ĐỒNG BỘ NGHIỆP VỤ - Chuyển trạng thái bàn ăn từ Có khách ăn uống sang Dọn dẹp (cleaning)
    if (table_id && table_id !== "takeaway") {
      const { error: tableUpdateError } = await supabase
        .from("tables")
        .update({ status: "cleaning" })
        .eq("id", table_id);

      if (tableUpdateError) {
        console.error(
          "Không thể chuyển trạng thái bàn sang dọn dẹp:",
          tableUpdateError.message,
        );
      }

      // =========================================================================
      // 🔥 TỰ ĐỘNG ĐÓNG VÒNG ĐỜI LỊCH ĐẶT BÀN KHI KHÁCH THANH TOÁN RA VỀ
      // =========================================================================
      // Tìm và cập nhật toàn bộ lịch đặt trước của bàn này đang có trạng thái 'seated' sang 'completed'
      const { error: reservationUpdateError } = await supabase
        .from("reservations")
        .update({ status: "completed" })
        .eq("table_id", table_id)
        .eq("status", "seated"); // Chỉ xử lý những khách đang ngồi ăn thực tế tại bàn này

      if (reservationUpdateError) {
        console.error(
          "Lỗi tự động đóng lịch đặt bàn sang completed:",
          reservationUpdateError.message,
        );
      }
    }

    // Trả kết quả thành công rực rỡ về cho giao diện Thu ngân
    return NextResponse.json(
      {
        success: true,
        message:
          "Hóa đơn đã được chốt thành công. Lịch đặt bàn đã đóng hoàn tất & Bàn ăn đã chuyển sang trạng thái chờ dọn dẹp!",
      },
      { status: 200 },
    );
  } catch (catchError: any) {
    console.error("Lỗi máy chủ trong quá trình thanh toán:", catchError);
    return NextResponse.json(
      { error: catchError.message || "Lỗi hệ thống nội bộ" },
      { status: 500 },
    );
  }
}

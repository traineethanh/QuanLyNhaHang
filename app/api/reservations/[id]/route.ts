// app/api/reservations/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: any) {
  try {
    const paramsResolved =
      context.params && typeof context.params.then === "function"
        ? await context.params
        : context.params;
    const reservationId = paramsResolved?.id;

    if (!reservationId) {
      return NextResponse.json(
        { error: "Thiếu mã ID của lịch hẹn cần xử lý" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { status, table_id } = body; // Các trạng thái: pending | confirmed | seated | no_show | cancelled

    if (!status) {
      return NextResponse.json(
        { error: "Thiếu thông tin hành động trạng thái cập nhật" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Chuẩn bị object cập nhật động
    const updatePayload: any = { status: status };
    if (table_id && table_id !== "none") {
      updatePayload.table_id = table_id;
    }

    // 1. Cập nhật trạng thái của đơn đặt bàn
    const { data: updatedRes, error: resError } = await supabase
      .from("reservations")
      .update(updatePayload)
      .eq("id", reservationId)
      .select()
      .single();

    if (resError || !updatedRes) {
      return NextResponse.json(
        { error: `Lỗi cập nhật lịch hẹn: ${resError?.message}` },
        { status: 400 },
      );
    }

    const finalTableId = table_id || updatedRes.table_id;

    // =========================================================================
    // 🔥 KỊCH BẢN CHECK-IN: LIÊN KẾT TRỰC TIẾP LUỒNG BÁN HÀNG POS (TỰ ĐỘNG SINH ORDER)
    // =========================================================================
    if (status === "seated" && finalTableId) {
      // Hệ thống tự động mở một đơn hàng (Order) mới gắn liền với số bàn và số khách đã đặt
      const { error: orderError } = await supabase.from("orders").insert({
        table_id: finalTableId,
        status: "opened", // Trạng thái đơn hàng đang mở để phục vụ gọi món
        guest_count: updatedRes.guest_count || 2,
        note: updatedRes.note
          ? `[Khách đặt trước]: ${updatedRes.note}`
          : "Đơn hàng tự động mở từ lịch đặt bàn",
      });

      if (orderError) {
        console.error("Lỗi tự động mở hóa đơn POS bán hàng:", orderError);
      }
    }

    // =========================================================================
    // 📊 ĐỒNG BỘ SƠ ĐỒ PHÒNG BÀN REAL-TIME
    // =========================================================================
    if (finalTableId) {
      if (status === "confirmed") {
        // Khóa bàn -> Chuyển sang trạng thái Đã đặt trước
        await supabase
          .from("tables")
          .update({ status: "reserved" })
          .eq("id", finalTableId);
      } else if (status === "seated") {
        // Khách ngồi ăn -> Chuyển sang Có khách sử dụng
        await supabase
          .from("tables")
          .update({ status: "occupied" })
          .eq("id", finalTableId);
      } else if (status === "cancelled" || status === "no_show") {
        // Hủy lịch hoặc Quá hạn không đến -> Giải phóng bàn ngay lập tức về bàn trống
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", finalTableId);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Cập nhật tiến độ điều phối lịch đặt bàn thành công",
        reservation: updatedRes,
      },
      { status: 200 },
    );
  } catch (catchError: any) {
    console.error("Lỗi hệ thống điều phối đặt bàn:", catchError);
    return NextResponse.json(
      { error: catchError.message || "Lỗi hệ thống nội bộ" },
      { status: 500 },
    );
  }
}

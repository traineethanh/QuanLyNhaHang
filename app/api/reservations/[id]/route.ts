// app/api/reservations/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    const { status, table_id } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Thiếu thông tin hành động trạng thái cập nhật" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const updatePayload: any = { status: status };
    if (table_id && table_id !== "none") {
      updatePayload.table_id = table_id;
    }

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

    // 🔥 TẠO ORDER MỚI BÊN POS KHI KHÁCH ĐẾN NHẬN BÀN
    if (status === "seated" && finalTableId) {
      const { error: orderError } = await supabase.from("orders").insert({
        table_id: finalTableId,
        status: "opened",
        guest_count: updatedRes.guest_count || 2,
        note: updatedRes.note
          ? `[Khách đặt trước]: ${updatedRes.note}`
          : "Đơn hàng tự động mở",
      });
      if (orderError) console.error("Lỗi tự động mở hóa đơn POS:", orderError);
    }

    // 📊 ĐỒNG BỘ TRẠNG THÁI BÀN (NHẢ BÀN / KHÓA BÀN CHUẨN)
    if (finalTableId) {
      // 1. Lấy trạng thái hiện tại thực tế của Bàn đó dưới DB
      const { data: currentTable } = await supabase
        .from("tables")
        .select("status")
        .eq("id", finalTableId)
        .single();

      if (status === "seated") {
        // Khách nhận bàn -> Bàn chuyển sang đang có khách (Occupied)
        await supabase
          .from("tables")
          .update({ status: "occupied", reservation_conflict: false })
          .eq("id", finalTableId);
      } else if (status === "cancelled" || status === "no_show") {
        // Nếu hủy/quá hạn: CHỈ nhả bàn về Trống (Available) NẾU bàn đó ĐANG BỊ KHÓA (Reserved)
        // NẾU đang có khách khác ăn (Occupied) thì tuyệt đối không đụng vào!
        if (currentTable && currentTable.status === "reserved") {
          await supabase
            .from("tables")
            .update({ status: "available", reservation_conflict: false })
            .eq("id", finalTableId);
        }
      }
      // Lưu ý: Không cần bắt status === 'confirmed' ở đây nữa vì hàm quét 90 phút (autoLock) sẽ lo việc khóa bàn
    }

    return NextResponse.json(
      {
        success: true,
        message: "Cập nhật thành công",
        reservation: updatedRes,
      },
      { status: 200 },
    );
  } catch (catchError: any) {
    console.error("Lỗi hệ thống điều phối đặt bàn:", catchError);
    return NextResponse.json(
      { error: catchError.message || "Lỗi nội bộ" },
      { status: 500 },
    );
  }
}

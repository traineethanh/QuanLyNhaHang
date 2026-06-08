// app/api/reservations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      customer_name,
      customer_phone,
      guest_count,
      reservation_time,
      table_id,
      note,
    } = body;

    if (!customer_name || !customer_phone || !reservation_time) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ các thông tin bắt buộc (*)" },
        { status: 400 },
      );
    }

    const targetTableId = table_id === "none" || !table_id ? null : table_id;

    // Quy tắc nghiệp vụ chuẩn: Có gán bàn cụ thể thì khóa bàn luôn (confirmed), ngược lại là chờ xếp bàn (pending)
    const initialStatus = targetTableId ? "confirmed" : "pending";

    const { data: newReservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        guest_count: Math.max(1, parseInt(guest_count) || 2),
        reservation_time: new Date(reservation_time).toISOString(),
        table_id: targetTableId,
        note: note && note.trim() !== "" ? note.trim() : null,
        status: initialStatus,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Lỗi lưu lịch đặt bàn: ${insertError.message}` },
        { status: 400 },
      );
    }

    // Nếu gán bàn ngay, cập nhật trạng thái bàn vật lý sang 'reserved' để chặn trùng lịch
    if (initialStatus === "confirmed" && targetTableId) {
      await supabase
        .from("tables")
        .update({ status: "reserved" })
        .eq("id", targetTableId);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lịch đặt bàn đã được tiếp nhận thành công trên hệ thống",
        reservation: newReservation,
      },
      { status: 201 },
    );
  } catch (catchError: any) {
    return NextResponse.json(
      { error: catchError.message || "Lỗi xử lý server" },
      { status: 500 },
    );
  }
}

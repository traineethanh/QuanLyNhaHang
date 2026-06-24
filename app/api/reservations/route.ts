// app/api/reservations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 🕵️‍♂️ HÀM THUẬT TOÁN QUÉT NGẦM: Tự động quét khóa giữ bàn trước giờ hẹn 1 tiếng 30 phút
 */
async function autoLockTablesForReservations(supabase: any) {
  try {
    const now = new Date(); // Lấy time tuyệt đối hiện tại

    // 1. Kéo tất cả đơn lịch đã được xác nhận (confirmed)
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("id, table_id, reservation_time, status")
      .eq("status", "confirmed");

    if (resError || !reservations) return;

    for (const res of reservations) {
      if (!res.table_id) continue;

      // Do dữ liệu dưới DB đã lưu chuẩn UTC, hàm getTime() trừ nhau sẽ ra kết quả chính xác tuyệt đối
      const resTime = new Date(res.reservation_time);
      const timeDiffMinutes = (resTime.getTime() - now.getTime()) / (1000 * 60);

      // Điều kiện kích hoạt: Còn ít hơn hoặc bằng 90 phút (1h30p) và giờ hẹn chưa trôi qua
      if (timeDiffMinutes <= 90 && timeDiffMinutes > 0) {
        const { data: table } = await supabase
          .from("tables")
          .select("status")
          .eq("id", res.table_id)
          .single();

        if (table) {
          if (table.status === "available" || table.status === "cleaning") {
            await supabase
              .from("tables")
              .update({ status: "reserved" })
              .eq("id", res.table_id);
          } else if (table.status === "occupied") {
            await supabase
              .from("tables")
              .update({ reservation_conflict: true })
              .eq("id", res.table_id);
          }
        }
      }
    }
  } catch (error) {
    console.error("Lỗi quy trình tự động khóa bàn:", error);
  }
}

/**
 * API: LẤY DANH SÁCH LỊCH ĐẶT BÀN + KÍCH HOẠT QUÉT KHÓA BÀN TỰ ĐỘNG
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // KÍCH HOẠT QUÉT TỰ ĐỘNG TRƯỚC
    await autoLockTablesForReservations(supabase);

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .order("reservation_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: reservations },
      { status: 200 },
    );
  } catch (catchError: any) {
    return NextResponse.json(
      { success: false, error: catchError.message },
      { status: 500 },
    );
  }
}

/**
 * API: TIẾP NHẬN TẠO MỚI LỊCH ĐẶT BÀN TỪ KHÁCH HÀNG
 */
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
    const initialStatus = "confirmed";

    // 🔥 SỬA TẠI ĐÂY: Thêm đuôi +07:00 để định dạng đúng múi giờ Việt Nam trước khi chuyển sang .toISOString() đưa vào DB
    const accurateVNDate = new Date(`${reservation_time}+07:00`);

    const { data: newReservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        guest_count: Math.max(1, parseInt(guest_count) || 2),
        reservation_time: accurateVNDate.toISOString(), // Đưa chuỗi chuẩn hóa lưu trữ an toàn
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

    // 🔥 SỬA TẠI ĐÂY: Tính toán so khớp khóa giữ bàn thời gian thực (Real-time) ngay khi tạo
    if (targetTableId) {
      const targetTimeMs = accurateVNDate.getTime();
      const nowMs = Date.now();
      const timeDiffMins = (targetTimeMs - nowMs) / (1000 * 60);

      // Thỏa mãn điều kiện: Đặt ăn trong vòng 90 phút đổ lại
      if (timeDiffMins <= 90 && timeDiffMins > 0) {
        const { data: tableCheck } = await supabase
          .from("tables")
          .select("status")
          .eq("id", targetTableId)
          .single();

        // Chỉ khóa nếu bàn đang trống hoặc dọn dẹp
        if (
          tableCheck &&
          (tableCheck.status === "available" ||
            tableCheck.status === "cleaning")
        ) {
          await supabase
            .from("tables")
            .update({ status: "reserved" })
            .eq("id", targetTableId);
        }
      }
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

// app/api/staff/shifts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // Kiểm tra lại đường dẫn helper dự án của bạn

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("id, shift_name, total_hours")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Lỗi Supabase query shifts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(shifts, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

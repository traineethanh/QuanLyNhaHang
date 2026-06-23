import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();

  // ==================== ⚡ LOGIC BẢO MẬT PHÂN QUYỀN ====================
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Chưa đăng nhập hệ thống" },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;
  if (userRole !== "manager") {
    return NextResponse.json(
      { error: "Không có quyền truy cập chức năng này" },
      { status: 403 },
    );
  }
  // =========================================================================

  try {
    const body = await request.json();
    const { code, name, base_uom, min_stock_level, category_id } = body;

    if (!name || !base_uom || !category_id) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc (Tên, Đơn vị gốc, Nhóm)" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ingredients")
      .insert([
        {
          code: code ? String(code).trim() : null,
          name: String(name).trim(),
          base_uom: String(base_uom).trim(),
          min_stock_level: Number(min_stock_level) || 0,
          category_id: category_id,
        },
      ])
      .select(
        `
        id, code, name, base_uom, min_stock_level, category_id,
        ingredient_categories ( name )
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // TODO: Hoàn thiện logic xử lý kho phụ trợ sau
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi hệ thống nội bộ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  // ==================== ⚡ LOGIC BẢO MẬT PHÂN QUYỀN ====================
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Chưa đăng nhập hệ thống" },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;
  if (userRole !== "manager") {
    return NextResponse.json(
      { error: "Không có quyền truy cập chức năng này" },
      { status: 403 },
    );
  }
  // =========================================================================

  try {
    const body = await request.json();
    const { batch_id, ingredient_id, new_quantity } = body;

    // Kiểm tra đầu vào hợp lệ (Chỉ cần không âm, tăng hay giảm đều được chấp nhận)
    if (
      !batch_id ||
      !ingredient_id ||
      new_quantity === undefined ||
      Number(new_quantity) < 0
    ) {
      return NextResponse.json(
        { error: "Dữ liệu đầu vào không hợp lệ hoặc số lượng nhỏ hơn 0" },
        { status: 400 },
      );
    }

    // BƯỚC 1: Lấy thông tin kho (warehouse_id) của lô hàng hiện tại trước khi cập nhật
    const { data: currentBatch, error: fetchBatchError } = await supabase
      .from("inventory_batches")
      .select("warehouse_id")
      .eq("id", batch_id)
      .single();

    if (fetchBatchError || !currentBatch) {
      throw new Error(
        `Không tìm thấy thông tin lô hàng cần sửa: ${fetchBatchError?.message}`,
      );
    }

    const targetWarehouseId = currentBatch.warehouse_id;

    // BƯỚC 2: Tiến hành cập nhật số lượng mới trực tiếp vào bảng lô hàng
    const { error: updateBatchError } = await supabase
      .from("inventory_batches")
      .update({ current_quantity: Number(new_quantity) })
      .eq("id", batch_id);

    if (updateBatchError) {
      throw new Error(`[Lỗi cập nhật lô]: ${updateBatchError.message}`);
    }

    // BƯỚC 3: Lấy lại danh sách toàn bộ lô hàng của nguyên liệu này (để tính toán đồng bộ)
    const { data: allBatches, error: refreshError } = await supabase
      .from("inventory_batches")
      .select("*")
      .eq("ingredient_id", ingredient_id)
      .order("received_at", { ascending: false });

    if (refreshError) {
      throw new Error(`[Lỗi tải lại danh sách lô]: ${refreshError.message}`);
    }

    // BƯỚC 4: Tính toán tổng lượng tồn kho của riêng Kho chứa lô hàng này
    const warehouseBatches =
      allBatches?.filter((b) => b.warehouse_id === targetWarehouseId) || [];
    const totalWarehouseInventory = warehouseBatches.reduce(
      (sum, b) => sum + (Number(b.current_quantity) || 0),
      0,
    );

    // BƯỚC 5: Đồng bộ cập nhật (Upsert) trực tiếp vào bảng tổng hợp `inventory_stock`
    const { error: upsertStockError } = await supabase
      .from("inventory_stock")
      .upsert(
        {
          warehouse_id: targetWarehouseId,
          ingredient_id: ingredient_id,
          total_inventory: totalWarehouseInventory,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "warehouse_id,ingredient_id" }, // Khớp theo bộ khóa duy nhất của bạn
      );

    if (upsertStockError) {
      throw new Error(
        `[Lỗi đồng bộ bảng inventory_stock]: ${upsertStockError.message}`,
      );
    }

    // BƯỚC 6: Tính toán tổng lượng tồn kho trên toàn hệ thống (Tất cả các kho cộng lại) để trả về giao diện
    const grandTotalInventory =
      allBatches?.reduce(
        (sum, b) => sum + (Number(b.current_quantity) || 0),
        0,
      ) || 0;

    return NextResponse.json({
      success: true,
      data: {
        total_inventory: grandTotalInventory,
        inventory_batches: allBatches || [],
      },
    });
  } catch (error: any) {
    console.error("Lỗi đồng bộ kho:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi hệ thống khi cập nhật và đồng bộ kho" },
      { status: 500 },
    );
  }
}

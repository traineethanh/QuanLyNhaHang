// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MenuItem } from "@/lib/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const waiterId = user ? user.id : null;

    const body = await request.json();
    const { table_id, guest_count, items, note, action_type, is_customer } =
      body;

    if (
      !table_id ||
      table_id === "none" ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Dữ liệu giỏ hàng trống" },
        { status: 400 },
      );
    }

    const menuItemIds = items.map((i: any) => i.menu_item_id);
    const { data: dbMenuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, price")
      .in("id", menuItemIds);

    if (menuError || !dbMenuItems) {
      return NextResponse.json(
        { error: "Không thể xác thực món ăn" },
        { status: 400 },
      );
    }

    let calculatedSubtotal = 0;
    const sanitizedOrderItems = items.map((item: any) => {
      const matchedDbItem = (dbMenuItems as MenuItem[]).find(
        (dbItem) => dbItem.id === item.menu_item_id,
      );
      if (!matchedDbItem)
        throw new Error(`Món ăn ID ${item.menu_item_id} không tồn tại`);

      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const unitPrice = matchedDbItem.price;
      const itemTotalPrice = unitPrice * quantity;
      calculatedSubtotal += itemTotalPrice;

      return {
        menu_item_id: item.menu_item_id,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: itemTotalPrice,
        note: item.note && item.note.trim() !== "" ? item.note.trim() : null,
        status: "pending",
      };
    });

    // =========================================================================
    // 🛡️ CHẶN BẢO VỆ BACKEND: KIỂM TRA ĐỊNH LƯỢNG KHO TRƯỚC KHI CHO TẠO ĐƠN
    // =========================================================================
    const { data: activeRecipes } = await supabase
      .from("recipes")
      .select("menu_item_id, ingredient_id, quantity_required")
      .in("menu_item_id", menuItemIds);

    const ingredientMapToSubtract = new Map<string, number>();
    if (activeRecipes && activeRecipes.length > 0) {
      sanitizedOrderItems.forEach((orderItem) => {
        const itemRecipes = activeRecipes.filter(
          (r) => r.menu_item_id === orderItem.menu_item_id,
        );
        itemRecipes.forEach((recipe) => {
          const totalRequired =
            orderItem.quantity * Number(recipe.quantity_required);
          const currentAccumulated =
            ingredientMapToSubtract.get(recipe.ingredient_id) || 0;
          ingredientMapToSubtract.set(
            recipe.ingredient_id,
            currentAccumulated + totalRequired,
          );
        });
      });
    }

    // Kiểm tra xem lượng tồn kho tổng có đủ đáp ứng nhu cầu gọi món hay không
    for (const [
      ingredientId,
      totalNeededAmount,
    ] of ingredientMapToSubtract.entries()) {
      const { data: stockCheck } = await supabase
        .from("inventory_stock")
        .select("total_inventory")
        .eq("ingredient_id", ingredientId)
        .maybeSingle();

      const currentAvailable = Number(stockCheck?.total_inventory) || 0;
      if (currentAvailable < totalNeededAmount) {
        return NextResponse.json(
          {
            error: `Không thể đặt đơn! Kho không đủ nguyên liệu chế biến (Thiếu lượng yêu cầu của ID: ${ingredientId})`,
          },
          { status: 400 },
        );
      }
    }

    // =========================================================================
    // 📝 KHỞI TẠO ĐƠN HÀNG KHI ĐÃ ĐỦ ĐIỀU KIỆN KHO
    // =========================================================================
    const calculatedTax = calculatedSubtotal * 0.1;
    const calculatedTotal = calculatedSubtotal + calculatedTax;
    const defaultStatus = is_customer ? "pending" : "confirmed";
    const finalStatus =
      action_type === "immediate_pay" ? "paid" : defaultStatus;

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: table_id,
        waiter_id: waiterId,
        status: finalStatus,
        subtotal: calculatedSubtotal,
        discount: 0,
        tax: calculatedTax,
        total: calculatedTotal,
        note: note && note.trim() !== "" ? note.trim() : null,
        guest_count: Math.max(1, parseInt(guest_count) || 1),
        is_takeaway: false,
      })
      .select("id, order_number")
      .single();

    if (orderError || !newOrder) {
      return NextResponse.json(
        { error: `Lỗi tạo đơn: ${orderError.message}` },
        { status: 400 },
      );
    }

    const finalOrderItems = sanitizedOrderItems.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }));
    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(finalOrderItems);

    if (itemsInsertError) {
      return NextResponse.json(
        { error: `Lỗi lưu chi tiết đơn hàng: ${itemsInsertError.message}` },
        { status: 400 },
      );
    }

    await supabase
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", table_id);

    // =========================================================================
    // 📦 THỰC THI THUẬT TOÁN FIFO: KHẤU TRỪ TRONG LÔ HÀNG (BATCH) & ĐỒNG BỘ KHO TỔNG
    // =========================================================================
    try {
      for (const [
        ingredientId,
        totalNeededAmount,
      ] of ingredientMapToSubtract.entries()) {
        let remainingAmountToSubtract = totalNeededAmount;

        // 1. Tìm các lô hàng có số lượng > 0, xếp theo ngày nhập kho cũ nhất lên trước (FIFO)
        const { data: activeBatches } = await supabase
          .from("inventory_batches")
          .select("id, current_quantity, batch_code")
          .eq("ingredient_id", ingredientId)
          .gt("current_quantity", 0)
          .order("received_at", { ascending: true });

        if (activeBatches && activeBatches.length > 0) {
          for (const batch of activeBatches) {
            if (remainingAmountToSubtract <= 0) break;

            const currentBatchQty = Number(batch.current_quantity) || 0;

            if (currentBatchQty >= remainingAmountToSubtract) {
              // Lô hiện tại đủ dùng -> Trừ một phần lô, kết thúc luồng
              const newBatchQty = currentBatchQty - remainingAmountToSubtract;
              await supabase
                .from("inventory_batches")
                .update({ current_quantity: newBatchQty })
                .eq("id", batch.id);

              remainingAmountToSubtract = 0;
            } else {
              // Lô hiện tại không đủ -> Trừ sạch lô về 0, chuyển sang trừ tiếp lô sau
              remainingAmountToSubtract -= currentBatchQty;
              await supabase
                .from("inventory_batches")
                .update({ current_quantity: 0 })
                .eq("id", batch.id);
            }
          }
        }

        // 2. Đồng bộ cập nhật lại tổng tồn kho trong bảng `inventory_stock`
        const { data: stockData } = await supabase
          .from("inventory_stock")
          .select("id, total_inventory")
          .eq("ingredient_id", ingredientId)
          .maybeSingle();

        if (stockData) {
          const currentStock = Number(stockData.total_inventory) || 0;
          // Hạ kho an toàn, đảm bảo không bao giờ bị số âm nhờ bước chặn ở trên
          const newStockAmount = Math.max(0, currentStock - totalNeededAmount);

          await supabase
            .from("inventory_stock")
            .update({
              total_inventory: newStockAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", stockData.id);
        }
      }
    } catch (inventoryError) {
      console.error("Lỗi chạy ngầm trừ kho định lượng FIFO:", inventoryError);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Đơn đặt món mới đã được khởi tạo thành công và đã khấu trừ kho theo lô!",
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
      },
      { status: 201 },
    );
  } catch (catchError: any) {
    return NextResponse.json(
      { error: catchError.message || "Lỗi hệ thống nội bộ" },
      { status: 500 },
    );
  }
}

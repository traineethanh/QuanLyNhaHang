// app/api/inventory/check-availability/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 🔥 THẦN CHÚ CHỐNG CACHE: Ép Next.js luôn quét Database mới nhất mỗi khi POS gọi API
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Lấy kho tổng chuẩn xác theo cấu trúc DDL (ingredient_id, total_inventory)
    const { data: stocks, error: stockError } = await supabase
      .from("inventory_stock")
      .select("ingredient_id, total_inventory");

    if (stockError) throw stockError;

    // Tạo bản đồ Map tra cứu nhanh tồn kho: { [ingredient_id]: số_lượng_tồn }
    const stockMap: Record<string, number> = {};
    stocks?.forEach((s) => {
      stockMap[s.ingredient_id] =
        (stockMap[s.ingredient_id] || 0) + Number(s.total_inventory);
    });

    // 2. Lấy định lượng công thức món ăn
    // 💡 Hãy đổi tên bảng 'recipes' bên dưới thành tên bảng thực tế của bạn nếu có khác biệt
    const { data: recipes, error: recipeError } = await supabase
      .from("recipes")
      .select("menu_item_id, ingredient_id, quantity_required");

    if (recipeError) throw recipeError;

    // 3. Tiến hành thuật toán chia định lượng để tìm ra số suất tối đa làm được
    const availability: Record<
      string,
      { stock_status: string; max_quantity: number }
    > = {};

    // Gom nhóm công thức theo từng menu_item_id
    const recipeByItem: Record<string, typeof recipes> = {};
    recipes?.forEach((r) => {
      if (!recipeByItem[r.menu_item_id]) recipeByItem[r.menu_item_id] = [];
      recipeByItem[r.menu_item_id].push(r);
    });

    // Tính toán số suất ăn dựa trên nguyên liệu có giới hạn thấp nhất (Nguyên liệu thắt nút cổ chai)
    Object.keys(recipeByItem).forEach((menuItemId) => {
      const requirements = recipeByItem[menuItemId];
      let maxPossibleOrders = Infinity; // Giả định ban đầu làm được vô số suất

      requirements.forEach((req) => {
        const availableStock = stockMap[req.ingredient_id] || 0;
        const requiredQty = Number(req.quantity_required) || 0;

        if (requiredQty > 0) {
          const possibleOrders = Math.floor(availableStock / requiredQty);
          if (possibleOrders < maxPossibleOrders) {
            maxPossibleOrders = possibleOrders;
          }
        }
      });

      // Nếu món ăn không cấu hình nguyên liệu hoặc lỗi tính toán thì đưa về 0
      if (maxPossibleOrders === Infinity) maxPossibleOrders = 0;

      // Trả về đúng cấu trúc đối tượng mà file pos-content.tsx đang cần để check hiển thị
      availability[menuItemId] = {
        stock_status: maxPossibleOrders > 0 ? "in_stock" : "out_stock",
        max_quantity: maxPossibleOrders,
      };
    });

    // 4. Trả kết quả về cho POS kèm cấu hình Header chặn đứng cache trình duyệt
    return NextResponse.json(
      { success: true, availability },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error: any) {
    console.error("Lỗi API check-availability:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

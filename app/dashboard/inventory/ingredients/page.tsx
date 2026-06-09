import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { IngredientsContent } from "./ingredients-content";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function getInitialIngredientsData() {
  const supabase = await createClient();

  // Kéo dữ liệu từ 4 bảng độc lập chạy song song
  const [
    { data: categories },
    { data: ingredients },
    { data: stocks },
    { data: batches },
  ] = await Promise.all([
    supabase
      .from("ingredient_categories")
      .select("id, name, description")
      .order("name"),
    supabase
      .from("ingredients")
      .select(
        `
        id, code, name, base_uom, min_stock_level, category_id,
        ingredient_categories ( name )
      `,
      )
      .order("name"),
    supabase
      .from("inventory_stock")
      .select("id, ingredient_id, total_inventory, warehouse_id"),
    supabase
      .from("inventory_batches")
      .select(
        "id, batch_code, received_at, current_quantity, expiry_date, ingredient_id, warehouse_id",
      ),
  ]);

  // Ánh xạ gộp mảng dữ liệu chuẩn xác đổ xuống Frontend
  const formattedIngredients = ingredients?.map((ing) => {
    // Tìm bản ghi kho tổng của nguyên liệu này
    const stockInfo = stocks?.find((s) => s.ingredient_id === ing.id);
    const totalStock = stockInfo ? Number(stockInfo.total_inventory) : 0;

    // ✅ ĐÃ SỬA: Lấy đúng cột warehouse_id từ bảng kho tổng
    const realWarehouseId = stockInfo ? stockInfo.warehouse_id : "";

    // ✅ ĐÃ SỬA: Lọc lô hàng đối chiếu chuẩn xác warehouse_id với realWarehouseId
    const matchingBatches = batches
      ? batches.filter(
          (b) =>
            b.ingredient_id === ing.id && b.warehouse_id === realWarehouseId,
        )
      : [];

    const catInfo = Array.isArray(ing.ingredient_categories)
      ? ing.ingredient_categories[0]
      : ing.ingredient_categories;

    return {
      id: ing.id,
      code: ing.code,
      name: ing.name,
      base_uom: ing.base_uom,
      min_stock_level: ing.min_stock_level,
      category_id: ing.category_id,
      ingredient_categories: catInfo,

      // Đồng bộ toàn bộ thuộc tính phục vụ giao diện hiển thị
      total_inventory: totalStock,
      warehouse_id: realWarehouseId,
      inventory_batches: matchingBatches, // Mảng lô hàng bây giờ đã có dữ liệu thực tế!
    };
  });

  return {
    initialCategories: categories || [],
    initialIngredients: formattedIngredients || [],
  };
}
export default async function IngredientsPage() {
  // ==================== ⚡ LOGIC BẢO MẬT PHÂN QUYỀN ====================
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;

  if (userRole !== "manager") {
    redirect("/dashboard");
  }
  // =========================================================================

  const data = await getInitialIngredientsData();

  return (
    <>
      <Header title="Danh mục nguyên liệu" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <IngredientsContent
          initialCategories={data.initialCategories}
          initialIngredients={data.initialIngredients}
        />
      </main>
    </>
  );
}

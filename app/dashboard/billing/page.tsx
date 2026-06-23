// app/dashboard/billing/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { BillingContent } from "./billing-content";

export const revalidate = 10;

async function getBillingData() {
  const supabase = await createClient();

  // 1. Mốc thời gian ngày hôm nay (dùng để tính doanh thu hôm nay)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Mốc thời gian 30 ngày trước (dùng để lấy lịch sử đơn hàng cho bộ lọc)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Lấy dữ liệu trong vòng 30 ngày qua
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: orders }, { data: todayPayments }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
        *,
        table:tables(*),
        items:order_items(*, menu_item:menu_items(*))
      `,
      )
      .gte("created_at", thirtyDaysAgo.toISOString()) // 🔥 THAY ĐỔI TẠI ĐÂY: Lấy đơn 30 ngày qua để bộ lọc ngày hoạt động được
      .order("created_at", { ascending: false }),

    supabase
      .from("payments")
      .select("*")
      .eq("status", "paid")
      .gte("created_at", today.toISOString()), // 💎 GIỮ NGUYÊN: Để tính chính xác doanh thu của riêng ngày hôm nay
  ]);

  const todayRevenue =
    todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const todayTransactions = todayPayments?.length || 0;

  return {
    orders: orders || [],
    stats: {
      todayRevenue,
      todayTransactions,
    },
  };
}

export default async function BillingPage() {
  const { orders, stats } = await getBillingData();

  return (
    <div className="space-y-6">
      <Header
        title="Thanh toán & Hóa đơn"
        // description="Xử lý thanh toán hóa đơn bàn ăn và quản lý nhật ký giao dịch."
      />
      <BillingContent orders={orders} stats={stats} />
    </div>
  );
}

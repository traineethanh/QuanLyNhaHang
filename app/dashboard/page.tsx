// app/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { DashboardContent } from "./dashboard-content";
import { Table, Area, Order, MenuItem } from "@/lib/types/database";

async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date();

  // Mốc bắt đầu ngày hôm nay (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mốc bắt đầu ngày hôm qua và kết thúc ngày hôm qua
  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(today);

  // Mốc 7 ngày trước để quét dữ liệu làm biểu đồ
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // 1. Chạy song song toàn bộ các câu lệnh truy vấn dữ liệu nền từ Database
  const [
    { data: tables },
    { data: areas },
    { data: recentOrdersData },
    { data: activeOrdersData },
    { data: weeklyPaymentsData },
    { data: allOrderItems },
  ] = await Promise.all([
    supabase
      .from("tables")
      .select("*, area:areas(*)")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("areas")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("orders")
      .select("*, table:tables(*)")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("orders")
      .select("id")
      .not("status", "in", '("completed","cancelled","paid")'),

    supabase
      .from("payments")
      .select("amount, created_at")
      .eq("status", "paid")
      .gte("created_at", sevenDaysAgoISO),

    supabase
      .from("order_items")
      .select("quantity, menu_item:menu_items(id, name, price, image_url)")
      .gte("created_at", sevenDaysAgoISO),
  ]);

  // ========================================================
  // 🍳 XỬ LÝ 5 HÓA ĐƠN GẦN NHẤT & TOP MÓN BÁN CHẠY
  // ========================================================
  const recentOrderIds = recentOrdersData?.map((o) => o.id) || [];
  const { data: recentItemsData } =
    recentOrderIds.length > 0
      ? await supabase
          .from("order_items")
          .select("*, menu_item:menu_items(name, price)")
          .in("order_id", recentOrderIds)
      : { data: [] };

  const recentOrdersWithItems =
    recentOrdersData?.map((order) => ({
      ...order,
      order_items:
        recentItemsData?.filter((item) => item.order_id === order.id) || [],
    })) || [];

  const itemSalesMap: { [key: string]: any } = {};
  allOrderItems?.forEach((item: any) => {
    const menuItem = item.menu_item;
    if (!menuItem) return;
    if (!itemSalesMap[menuItem.id]) {
      itemSalesMap[menuItem.id] = {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        image_url: menuItem.image_url,
        total_sold: 0,
      };
    }
    itemSalesMap[menuItem.id].total_sold += item.quantity || 0;
  });

  const topSellingItems = Object.values(itemSalesMap)
    .sort((a: any, b: any) => b.total_sold - a.total_sold)
    .slice(0, 5) as (MenuItem & { total_sold: number })[];

  // ========================================================
  // 📈 XỬ LÝ BIỂU ĐỒ DOANH THU 7 NGÀY
  // ========================================================
  const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const revenueData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const dayName = weekdayNames[d.getDay()];

    const dayRevenue =
      weeklyPaymentsData?.reduce((sum, payment) => {
        const pDate = new Date(payment.created_at);
        const pDateStr = `${String(pDate.getDate()).padStart(2, "0")}/${String(pDate.getMonth() + 1).padStart(2, "0")}`;
        return pDateStr === dateStr ? sum + (Number(payment.amount) || 0) : sum;
      }, 0) || 0;

    revenueData.push({ name: `${dayName} (${dateStr})`, revenue: dayRevenue });
  }

  // ========================================================
  // 📊 TÍNH TOÁN CÁC CHỈ SỐ KPI VÀ TỶ LỆ TĂNG TRƯỞNG REAL-TIME
  // ========================================================

  // 1. Dữ liệu thanh toán ngày hôm nay
  const todayPayments =
    weeklyPaymentsData?.filter((p) => new Date(p.created_at) >= today) || [];
  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const todayOrders = todayPayments.length;

  // 2. Dữ liệu thanh toán ngày hôm qua (Bóc tách từ mảng tuần)
  const yesterdayPayments =
    weeklyPaymentsData?.filter((p) => {
      const pDate = new Date(p.created_at);
      return pDate >= yesterdayStart && pDate < yesterdayEnd;
    }) || [];
  const yesterdayRevenue = yesterdayPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const yesterdayOrders = yesterdayPayments.length;

  // 3. Tính toán tỷ lệ phần trăm tăng trưởng (%) doanh thu
  let revenueTrend = 0;
  if (yesterdayRevenue > 0) {
    revenueTrend = parseFloat(
      (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1),
    );
  } else if (todayRevenue > 0) {
    revenueTrend = 100; // Hôm qua không bán được gì, hôm nay bán được -> coi như tăng trưởng 100%
  }

  // 4. Tính toán tỷ lệ phần trăm tăng trưởng (%) số lượng đơn
  let ordersTrend = 0;
  if (yesterdayOrders > 0) {
    ordersTrend = parseFloat(
      (((todayOrders - yesterdayOrders) / yesterdayOrders) * 100).toFixed(1),
    );
  } else if (todayOrders > 0) {
    ordersTrend = 100;
  }

  const occupiedTables =
    tables?.filter((t) => t.status === "occupied").length || 0;
  const availableTables =
    tables?.filter((t) => t.status === "available").length || 0;
  const reservedTables =
    tables?.filter((t) => t.status === "reserved").length || 0;

  return {
    tables: tables || [],
    areas: areas || [],
    recentOrders: recentOrdersWithItems,
    topSellingItems,
    revenueData,
    stats: {
      todayRevenue,
      todayOrders,
      revenueTrend, // Bản ghi % doanh thu mới
      ordersTrend, // Bản ghi % đơn hàng mới
      activeOrders: activeOrdersData?.length || 0,
      occupiedTables,
      totalTables: tables?.length || 0,
      availableTables,
      reservedTables,
    },
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <DashboardContent {...data} />
      </main>
    </>
  );
}

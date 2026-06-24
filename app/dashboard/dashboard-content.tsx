// app/dashboard/dashboard-content.tsx
"use client";

import { DollarSign, ShoppingCart, Clock, Grid3X3 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  StatCard,
  TableOverview,
  RecentOrders,
  TopSellingItems,
  RevenueChart,
} from "@/components/dashboard";
import { Table, Area, Order, MenuItem } from "@/lib/types/database";

interface DashboardContentProps {
  tables: (Table & { area?: Area })[];
  areas: Area[];
  recentOrders: (Order & { table?: Table })[];
  topSellingItems: (MenuItem & { total_sold: number })[];
  revenueData: { name: string; revenue: number }[];
  stats: {
    todayRevenue: number;
    todayOrders: number;
    revenueTrend: number; // 🔥 ĐÃ THÊM MỚI
    ordersTrend: number; // 🔥 ĐÃ THÊM MỚI
    activeOrders: number;
    occupiedTables: number;
    totalTables: number;
    availableTables: number;
    reservedTables: number;
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function DashboardContent({
  tables,
  areas,
  recentOrders,
  topSellingItems,
  revenueData,
  stats,
}: DashboardContentProps) {
  const [sessionTime, setSessionTime] = useState<string>("");

  useEffect(() => {
    const startTime = localStorage.getItem("session_start_time");
    if (!startTime) return;

    const updateClock = () => {
      const diff = Date.now() - parseInt(startTime);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setSessionTime(`${hours}g ${minutes}ph`);
    };

    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-1">
      {/* Intro banner */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600">
              Tổng quan quản lý
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Bảng điều khiển nhà hàng
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Xem nhanh tình trạng bàn, doanh thu và đơn hàng trong ngày
            </p>
          </div>
          {sessionTime && (
            <div className="self-start rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 shadow-sm dark:bg-amber-950/40 dark:text-amber-400 sm:self-center">
              ⏱️ Thời gian hoạt động: {sessionTime}
            </div>
          )}
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Doanh thu hôm nay"
          value={formatCurrency(stats.todayRevenue)}
          icon={DollarSign}
          // 🔥 ĐÃ SỬA: Lấy giá trị tuyệt đối Math.abs và kiểm tra nếu >= 0 thì là tăng trưởng dương
          trend={{
            value: Math.abs(stats.revenueTrend),
            isPositive: stats.revenueTrend >= 0,
          }}
          description="so với hôm qua"
          iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
        />
        <StatCard
          title="Đơn hàng hôm nay"
          value={stats.todayOrders}
          icon={ShoppingCart}
          // 🔥 ĐÃ SỬA: Tự động đổi màu xanh (tăng) / màu đỏ (giảm) tùy theo giá trị ordersTrend
          trend={{
            value: Math.abs(stats.ordersTrend),
            isPositive: stats.ordersTrend >= 0,
          }}
          description="so với hôm qua"
          iconClassName="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
        />
        <StatCard
          title="Đơn đang xử lý"
          value={stats.activeOrders}
          icon={Clock}
          description="đang chờ phục vụ"
          iconClassName="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
        />
        <StatCard
          title="Bàn trống"
          value={`${stats.availableTables}/${stats.totalTables}`}
          icon={Grid3X3}
          description={`${stats.occupiedTables} có khách, ${stats.reservedTables} đã đặt`}
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
      </div>

      {/* Khu vực sơ đồ trạng thái bàn real-time */}
      <TableOverview tables={tables} areas={areas} />

      {/* Khu vực phân tích dữ liệu */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <div className="lg:col-span-1">
          <TopSellingItems items={topSellingItems} />
        </div>
      </div>

      {/* Nhật ký hoạt động */}
      <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 pb-2">
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Hóa đơn vừa thanh toán gần đây
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nhật ký cập nhật dòng tiền thực thu tức thời tại các quầy.
          </p>
        </div>
        <RecentOrders orders={recentOrders} />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Order, Table } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Utensils,
} from "lucide-react";
import Link from "next/link";

interface RecentOrdersProps {
  orders: (Order & {
    table?: Table;
    order_items?: any[]; // Nhận thêm danh sách món ăn đi kèm từ server query
  })[];
}

const statusConfig = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  },
  preparing: {
    label: "Đang nấu",
    className: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  },
  ready: {
    label: "Sẵn sàng",
    className: "bg-green-500/20 text-green-700 dark:text-green-400",
  },
  served: { label: "Đã phục vụ", className: "bg-primary/20 text-primary" },
  completed: {
    label: "Hoàn thành",
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-destructive/20 text-destructive",
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  // Quản lý ID của đơn hàng đang được bấm mở rộng Dropdown xem chi tiết
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null); // Bấm lại đơn cũ thì đóng lại
    } else {
      setExpandedOrderId(orderId); // Bấm đơn mới thì mở ra
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg">Đơn hàng gần đây</CardTitle>
          <p className="text-sm text-muted-foreground">
            Theo dõi nhanh đơn hàng mới nhất trong ngày.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/billing" className="flex items-center gap-1">
            Xem tất cả
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[320px] pr-4">
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-muted/40 bg-muted/5 text-muted-foreground">
                Chưa có đơn hàng nào trong ngày
              </div>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-border bg-card transition duration-200 hover:shadow-xs"
                  >
                    {/* KHỐI TIÊU ĐỀ ĐƠN HÀNG - CLICK VÀO ĐÂY ĐỂ ĐÓNG/MỞ DROPDOWN */}
                    <div
                      onClick={() => toggleExpand(order.id)}
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            #{order.order_number || order.id.substring(0, 5)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              statusConfig[order.status]?.className ||
                                statusConfig["completed"].className,
                            )}
                          >
                            {statusConfig[order.status]?.label || "Hoàn thành"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>{order.table?.name || "Mang về"}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(order.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-500">
                            {formatCurrency(order.total)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.guest_count || 0} khách
                          </div>
                        </div>
                        {/* Mũi tên trạng thái xoay lên/xuống */}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        )}
                      </div>
                    </div>

                    {/* 🔽 PHẦN Ô DROPDOWN HIỂN THỊ CHI TIẾT MÓN ĂN KHI ĐƯỢC CHỌN */}
                    {isExpanded && (
                      <div className="border-t border-dashed border-border bg-muted/10 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5" /> Chi tiết món ăn
                          đã gọi
                        </h4>

                        <div className="space-y-1.5">
                          {order.order_items && order.order_items.length > 0 ? (
                            order.order_items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {item.menu_item?.name || "Món ăn hệ thống"}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">
                                    x{item.quantity}
                                  </span>
                                </div>
                                <span className="font-medium text-muted-foreground">
                                  {formatCurrency(
                                    (item.price_at_order ||
                                      item.menu_item?.price ||
                                      0) * item.quantity,
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs italic text-muted-foreground py-1">
                              (Chưa đồng bộ chi tiết món, vui lòng đảm bảo file
                              page.tsx đã được nạp sub-query `order_items`)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

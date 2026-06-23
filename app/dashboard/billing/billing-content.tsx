// app/dashboard/billing/billing-content.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Order, Table, OrderItem, MenuItem } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  CheckCircle,
  Printer,
  Search,
  Calendar,
  Filter,
  History,
  ArrowRight,
} from "lucide-react";

// Định nghĩa Interface riêng biệt tránh lỗi cú pháp inline khi biên dịch
export interface ExtendedOrder extends Order {
  table?: Table;
  items?: (OrderItem & { menu_item?: MenuItem })[];
  payment_method?: string;
  payments?: any[]; // Dự phòng trường hợp dữ liệu quan hệ từ Supabase kết nối qua bảng payments
}

interface BillingContentProps {
  orders: ExtendedOrder[];
  stats: {
    todayRevenue: number;
    todayTransactions: number;
  };
}

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const paymentMethods = [
  { value: "cash", label: "Tiền mặt", icon: Banknote },
  { value: "card", label: "Thẻ", icon: CreditCard },
  { value: "transfer", label: "Chuyển khoản", icon: Building2 },
  { value: "qr", label: "QR Code", icon: QrCode },
];

export function BillingContent({ orders, stats }: BillingContentProps) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // --- LẤY NGÀY MẶC ĐỊNH CHO BỘ LỌC KHOẢNG NGÀY ---
  const todayStr = new Date().toISOString().split("T")[0];
  // Mặc định Ngày bắt đầu là đầu tháng hiện tại
  const firstDayOfMonthStr = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  })();

  // --- STATE BỘ LỌC LỊCH SỬ ---
  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  // --- TINH NĂNG CỐT LÕI: GỘP CÁC ĐƠN HÀNG CỦA CÙNG 1 BÀN ---
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: any } = {};

    orders.forEach((order) => {
      if (order.status?.toLowerCase() === "completed") return;

      const tableId = order.table_id || "takeaway";

      if (!groups[tableId]) {
        groups[tableId] = {
          ...order,
          items: [...(order.items || [])],
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          total: Number(order.total),
          order_ids: [order.id],
        };
      } else {
        groups[tableId].items = [
          ...groups[tableId].items,
          ...(order.items || []),
        ];
        groups[tableId].subtotal += Number(order.subtotal);
        groups[tableId].tax += Number(order.tax);
        groups[tableId].total += Number(order.total);
        groups[tableId].order_ids.push(order.id);
      }
    });

    return Object.values(groups);
  }, [orders]);

  // --- LOGIC LỌC DANH SÁCH LỊCH SỬ ĐÃ ĐƯỢC FIX LỖI TRIỆT ĐỂ ---
  const filteredCompletedOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Chỉ lấy đơn đã hoàn thành
      if (order.status?.toLowerCase() !== "completed") return false;

      // 2. Lọc theo khoảng ngày tạo đơn (Chuẩn theo Giờ Địa Phương - Local Time)
      const localDate = new Date(order.created_at);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      const orderDateStr = `${year}-${month}-${day}`;

      if (startDate && orderDateStr < startDate) return false;
      if (endDate && orderDateStr > endDate) return false;

      // 3. Lọc phương thức thanh toán an toàn (Bảo vệ khi bị undefined)
      // Thử lấy từ order.payment_method hoặc từ mảng quan hệ payments nếu có
      const actualPaymentMethod =
        order.payment_method ||
        (order.payments && order.payments[0]?.payment_method);
      if (filterPayment !== "all") {
        if (!actualPaymentMethod || actualPaymentMethod !== filterPayment)
          return false;
      }

      // 4. Tìm kiếm theo mã đơn hoặc tên bàn
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesOrderNum = order.order_number?.toString().includes(query);
        const matchesTableName = order.table?.name
          ?.toLowerCase()
          .includes(query);
        if (!matchesOrderNum && !matchesTableName) return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, filterPayment, searchQuery]);

  const todayRevenue = stats.todayRevenue;
  const completedTransactionsCount = stats.todayTransactions;

  const averagePerOrder =
    completedTransactionsCount > 0
      ? todayRevenue / completedTransactionsCount
      : 0;
  const highestOrderTotal =
    orders.filter((o) => o.status?.toLowerCase() === "completed").length > 0
      ? Math.max(
          ...orders
            .filter((o) => o.status?.toLowerCase() === "completed")
            .map((o) => Number(o.total) || 0),
        )
      : 0;
  const totalPendingBillingCount = groupedOrders.length;

  const handlePayment = (order: any) => {
    setSelectedOrder(order);
    const orderTotal = order.total || 0;
    setReceivedAmount(orderTotal.toString());
    setDiscount("");
    setPaymentMethod("cash");
    setIsPaymentDialogOpen(true);
  };

  const handlePrintBill = () => {
    setIsPrinting(true);
    setTimeout(() => setIsPrinting(false), 500);
  };

  const calculateTotal = () => {
    if (!selectedOrder)
      return { subtotal: 0, discountAmount: 0, tax: 0, total: 0 };
    const subtotal = selectedOrder.subtotal || 0;
    const discountAmount = parseFloat(discount) || 0;
    const tax = 0;
    const total = Math.max(0, subtotal - discountAmount);
    return { subtotal, discountAmount, tax, total };
  };

  const { subtotal, discountAmount, total } = calculateTotal();
  const received = parseFloat(receivedAmount) || 0;
  const change = received - total;

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;

    try {
      setIsPrinting(true);

      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_ids: selectedOrder.order_ids || [selectedOrder.id],
          table_id: selectedOrder.table_id || "takeaway",
          amount: total,
          payment_method: paymentMethod,
          discount: parseFloat(discount) || 0,
          received_amount:
            paymentMethod === "cash" ? parseFloat(receivedAmount) || 0 : total,
          change_amount: paymentMethod === "cash" ? change : 0,
          note: `Thanh toán qua phân hệ Billing hệ thống`,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Thanh toán thất bại");

      setIsPaymentDialogOpen(false);
      router.refresh();

      alert("Hóa đơn đã được chốt thành công!");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Không thể chốt thanh toán. Vui lòng thử lại!");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Khối thẻ Thống kê Tài chính */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none bg-rose-500/5 shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 font-bold">
              $
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                Doanh thu hôm nay
              </p>
              <h3 className="text-2xl font-black tracking-tight text-rose-700">
                {formatCurrency(todayRevenue)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-emerald-500/5 shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
              $
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                Trung bình/Đơn
              </p>
              <h3 className="text-2xl font-black tracking-tight text-emerald-700">
                {formatCurrency(averagePerOrder)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-blue-500/5 shadow-xs rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 font-bold">
              📈
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                Đơn cao nhất
              </p>
              <h3 className="text-2xl font-black tracking-tight text-blue-700">
                {formatCurrency(highestOrderTotal)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-none bg-indigo-500/5 shadow-xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-sm">
              📊
            </div>
            <div className="min-w-0 flex items-baseline gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Số giao dịch thành công:
              </p>
              <h4 className="text-xl font-black tracking-tight text-indigo-700">
                {completedTransactionsCount}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-amber-500/5 shadow-xs rounded-xl">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
              💵
            </div>
            <div className="min-w-0 flex items-baseline gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Đơn hàng chờ thanh toán:
              </p>
              <h4 className="text-xl font-black tracking-tight text-amber-700">
                {totalPendingBillingCount}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vùng hiển thị danh sách các bàn chờ chốt thanh toán */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Đơn hàng chờ thanh toán
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Danh sách {groupedOrders.length} nhóm đơn hàng theo bàn đang chờ
                hoàn tất thanh toán.
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-destructive">
                {groupedOrders.length}
              </p>
              <p className="text-xs text-muted-foreground block mt-1">
                bàn chờ
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                Không có đơn hàng chờ thanh toán
              </p>
              <p className="text-sm">
                Tất cả đơn hàng đã được hoàn tất thanh toán.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedOrders.map((order) => (
                <Card
                  key={order.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="p-4 pb-3 bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          #{order.order_number}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(order.created_at)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {order.table?.name || "🛍️ Mang về"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="mb-3 text-xs text-muted-foreground">
                      <span className="font-medium">
                        👥 {order.guest_count} khách
                      </span>
                    </div>

                    <ScrollArea className="h-[100px] mb-4 rounded-lg border border-border/50 p-3">
                      <div className="space-y-2 text-sm">
                        {order.items?.map((item: any, dynamicIdx: number) => (
                          <div
                            key={`${item.id}-${dynamicIdx}`}
                            className="flex justify-between items-start gap-2"
                          >
                            <span className="text-muted-foreground flex-1">
                              <span className="font-medium text-foreground">
                                {item.quantity}x
                              </span>{" "}
                              {item.menu_item?.name}
                            </span>
                            <span className="font-medium whitespace-nowrap">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between mb-4 bg-primary/5 p-3 rounded-lg">
                      <span className="text-sm font-medium">
                        Tổng cộng (Đã gộp)
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handlePayment(order)}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Thanh toán ngay
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nhật ký lịch sử hóa đơn */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle className="text-xl font-bold">
                  Nhật ký hóa đơn đã thanh toán
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tra cứu, xem lại và in lại các hóa đơn đã chốt hoàn thành
                  trong hệ thống.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-4 pt-2">
            {/* Cụm bộ lọc Khoảng ngày */}
            <div className="lg:col-span-6 space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Lọc theo khoảng ngày tạo đơn
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-xl text-sm w-full"
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-xl text-sm w-full"
                />
              </div>
            </div>

            {/* Cụm bộ lọc Phương thức */}
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Filter className="h-3 w-3" /> Hình thức thanh toán
              </Label>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue placeholder="Tất cả hình thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hình thức</SelectItem>
                  <SelectItem value="cash">💵 Tiền mặt</SelectItem>
                  <SelectItem value="card">💳 Quẹt thẻ</SelectItem>
                  <SelectItem value="transfer">🏦 Chuyển khoản</SelectItem>
                  <SelectItem value="qr">📱 Quét mã QR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cụm ô Tìm kiếm nhanh */}
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Search className="h-3 w-3" /> Tìm kiếm nhanh
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Số hóa đơn, tên bàn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4 w-[120px]">Mã đơn</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Phòng / Bàn</th>
                  <th className="p-4 text-center">Số khách</th>
                  <th className="p-4">Thanh toán</th>
                  <th className="p-4 text-right">Tổng hóa đơn</th>
                  <th className="p-4 text-center w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Không tìm thấy hóa đơn nào khớp với khoảng ngày hoặc điều
                      kiện lọc đã chọn.
                    </td>
                  </tr>
                ) : (
                  filteredCompletedOrders.map((order) => {
                    const currentMethod =
                      order.payment_method ||
                      (order.payments && order.payments[0]?.payment_method) ||
                      "cash";
                    const method = paymentMethods.find(
                      (m) => m.value === currentMethod,
                    ) || {
                      label: "Tiền mặt",
                      icon: Banknote,
                    };
                    return (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-muted/20 transition-colors last:border-none"
                      >
                        <td className="p-4 font-bold text-slate-800">
                          #{order.order_number}
                        </td>
                        <td className="p-4 text-xs space-y-0.5">
                          <div className="font-semibold">
                            {formatTime(order.created_at)}
                          </div>
                          <div className="text-muted-foreground">
                            {formatDate(order.created_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className="font-medium bg-slate-50"
                          >
                            {order.table?.name || "🛍️ Mang về"}
                          </Badge>
                        </td>
                        <td className="p-4 text-center text-muted-foreground">
                          {order.guest_count}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <method.icon className="h-3.5 w-3.5 text-slate-500" />
                            <span>{method.label}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:text-primary rounded-lg"
                            onClick={() => {
                              setSelectedOrder({
                                ...order,
                                order_ids: [order.id],
                              });
                              setReceivedAmount((order.total || 0).toString());
                              setDiscount((order.discount || 0).toString());
                              setPaymentMethod(currentMethod);
                              setIsPaymentDialogOpen(true);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hộp thoại Dialog Xem Chi Tiết / Xử lý thanh toán */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0">
            <DialogTitle className="text-xl font-black">
              Thanh toán đơn #{selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vui lòng kiểm tra thông tin và hoàn tất thủ tục chốt hóa đơn.
            </DialogDescription>

            <div className="mt-3 space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">
                  Phòng/Bàn:
                </span>
                <span className="text-foreground">
                  {selectedOrder?.table?.name || "🛍️ Mang về"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold">
                  Khách:
                </span>
                <span className="text-foreground">
                  {selectedOrder?.guest_count} người
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Chi tiết món ăn (Đơn gộp)
              </Label>
              <ScrollArea className="h-[130px] rounded-xl border border-border/60 p-3 bg-muted/10">
                {selectedOrder?.items?.map((item: any, dynamicIdx: number) => (
                  <div
                    key={`${item.id}-${dynamicIdx}`}
                    className="flex justify-between py-1 text-sm border-b border-dashed border-border/40 last:border-none"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-orange-600">
                        {item.quantity}x
                      </span>{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.menu_item?.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrency(item.total_price)}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chọn phương thức thanh toán
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={
                      paymentMethod === method.value ? "default" : "outline"
                    }
                    className="flex-col h-auto py-2.5 rounded-xl border transition-all"
                    onClick={() => setPaymentMethod(method.value)}
                    disabled={
                      selectedOrder?.status?.toLowerCase() === "completed"
                    }
                  >
                    <method.icon className="h-4 w-4 mb-1" />
                    <span className="text-[11px] font-bold">
                      {method.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="discount"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Giảm giá (VND)
              </Label>
              <Input
                id="discount"
                type="number"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="rounded-xl h-9"
                disabled={selectedOrder?.status?.toLowerCase() === "completed"}
              />
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="received"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Tiền khách đưa (VND)
                </Label>
                <Input
                  id="received"
                  type="number"
                  placeholder="0"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="rounded-xl h-10 text-lg font-bold text-primary"
                  disabled={
                    selectedOrder?.status?.toLowerCase() === "completed"
                  }
                />
              </div>
            )}

            <div className="space-y-2 pt-3 border-t border-border/80">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Tạm tính</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-xs bg-green-500/10 border border-green-500/20 px-2 py-1.5 rounded-lg">
                  <span className="text-green-700 font-bold">Giảm giá</span>
                  <span className="text-green-700 font-black">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              <Separator className="my-1" />

              <div className="flex justify-between items-center font-black text-base bg-primary/10 px-3 py-2.5 rounded-xl border border-primary/20">
                <span className="text-slate-800">Tổng cộng</span>
                <span className="text-xl text-primary font-black tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>

              {paymentMethod === "cash" && received > 0 && (
                <div
                  className={cn(
                    "flex justify-between items-center font-bold px-3 py-2 rounded-xl text-xs border",
                    change >= 0
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-700 border-rose-500/20",
                  )}
                >
                  <span>
                    {change >= 0 ? "Tiền thừa trả khách" : "Khách còn thiếu"}
                  </span>
                  <span className="text-sm font-black">
                    {formatCurrency(Math.abs(change))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/15 flex gap-2 justify-end shrink-0 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              className="font-bold rounded-xl h-9"
            >
              Đóng lại
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrintBill}
              disabled={isPrinting}
              className="font-bold rounded-xl h-9"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              {isPrinting ? "Đang in..." : "In bill"}
            </Button>
            {selectedOrder?.status?.toLowerCase() !== "completed" && (
              <Button
                type="button"
                className="font-black rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmPayment}
                disabled={
                  isPrinting || (paymentMethod === "cash" && change < 0)
                }
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                {isPrinting ? "Đang xử lý..." : "Chốt thanh toán"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

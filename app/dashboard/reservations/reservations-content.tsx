// app/dashboard/reservations/reservations-content.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Phone,
  User,
  Plus,
  CheckCircle2,
  CalendarCheck,
  HelpCircle,
  AlertTriangle,
  Search,
  Layers,
} from "lucide-react";

interface ReservationsContentProps {
  reservations: any[];
  tables: any[];
}

const statusConfig = {
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-blue-500/10 text-blue-600 border-none font-bold",
  },
  seated: {
    label: "Đang ăn (Seated)",
    className: "bg-emerald-500/10 text-emerald-600 border-none font-bold",
  },
  no_show: {
    label: "Quá hạn (No-Show)",
    className: "bg-purple-500/10 text-purple-600 border-none font-bold",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-rose-500/10 text-rose-600 border-none font-bold",
  },
};

export function ReservationsContent({
  reservations,
  tables,
}: ReservationsContentProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const [checkDate, setCheckDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [checkTime, setCheckTime] = useState("19:00");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    guest_count: "2",
    reservation_time: "",
    table_id: "none",
    note: "",
  });

  const upcomingLockReservations = useMemo(() => {
    const now = new Date();
    return reservations.filter((res) => {
      if (res.status !== "confirmed") return false;
      const resTime = new Date(res.reservation_time);
      const timeDiffMinutes = (resTime.getTime() - now.getTime()) / (1000 * 60);
      return timeDiffMinutes <= 90 && timeDiffMinutes > 0;
    });
  }, [reservations]);

  const availabilityReport = useMemo(() => {
    if (!checkDate || !checkTime)
      return { available: [], occupiedOrReserved: [] };

    const targetDateTime = new Date(`${checkDate}T${checkTime}:00`);
    const targetTimeMs = targetDateTime.getTime();

    const NINETY_MINS_MS = 90 * 60 * 1000;

    const activeReservationsAtSlot = reservations.filter((res) => {
      if (res.status === "cancelled" || res.status === "no_show") return false;
      const resTimeMs = new Date(res.reservation_time).getTime();
      return Math.abs(resTimeMs - targetTimeMs) <= NINETY_MINS_MS;
    });

    const busyTableIdsFromReservations = activeReservationsAtSlot
      .map((res) => res.table_id)
      .filter(Boolean);

    const available: any[] = [];
    const occupiedOrReserved: any[] = [];

    tables.forEach((table) => {
      const isReservedInSlot = busyTableIdsFromReservations.includes(table.id);
      const isOccupiedRightNow =
        table.status === "occupied" ||
        table.status === "cleaning" ||
        table.status === "reserved";

      if (isReservedInSlot || isOccupiedRightNow) {
        occupiedOrReserved.push(table);
      } else {
        available.push(table);
      }
    });

    return { available, occupiedOrReserved };
  }, [checkDate, checkTime, reservations, tables]);

  const openNewBookingModal = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      guest_count: "2",
      reservation_time: `${checkDate}T${checkTime}`,
      table_id: "none",
      note: "",
    });
    setIsModalOpen(true);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading("create");

      // Tạo lịch đặt bàn
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "confirmed" }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Có lỗi xảy ra khi tạo lịch đặt");
        return;
      }

      // 🔥 FIX LỖI KHÓA BÀN SỚM: Ép sơ đồ bàn nhả khóa nếu chưa tới 1h30 phút
      if (formData.table_id && formData.table_id !== "none") {
        const targetTimeMs = new Date(formData.reservation_time).getTime();
        const nowMs = Date.now();
        const timeDiffMins = (targetTimeMs - nowMs) / (1000 * 60);

        const tableInfo = tables.find((t) => t.id === formData.table_id);

        if (timeDiffMins > 90) {
          // Nếu thời gian > 90p, đảm bảo bàn vẫn 'available' để khách khác dùng tạm
          if (tableInfo && tableInfo.status !== "occupied") {
            await fetch(`/api/tables/${formData.table_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "available" }),
            });
          }
        } else {
          // Nếu < 90p, lập tức khóa bàn thành 'reserved'
          if (tableInfo && tableInfo.status === "available") {
            await fetch(`/api/tables/${formData.table_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "reserved" }),
            });
          }
        }
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  // Cập nhật hàm xử lý trạng thái để truyền thêm tableId
  const handleUpdateStatus = async (
    id: string,
    newStatus: string,
    tableId?: string,
  ) => {
    try {
      setLoading(id);

      // 1. Cập nhật trạng thái lịch hẹn
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Không thể cập nhật trạng thái");
        return;
      }

      // 🔥 FIX LỖI TRẢ BÀN: Đồng bộ lại trạng thái cho Sơ đồ bàn
      if (tableId) {
        const tableInfo = tables.find((t) => t.id === tableId);

        if (newStatus === "cancelled" || newStatus === "no_show") {
          // Chỉ trả trạng thái trống NẾU bàn đang bị khóa (reserved).
          // Khỏi cần chuyển lại nếu bàn đang có khách (occupied).
          if (tableInfo && tableInfo.status === "reserved") {
            await fetch(`/api/tables/${tableId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "available" }),
            });
          }
        } else if (newStatus === "seated") {
          // Tự động báo Sơ đồ bàn là có khách khi ấn 'Nhận bàn & Mở đơn POS'
          if (tableInfo && tableInfo.status !== "occupied") {
            await fetch(`/api/tables/${tableId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "occupied" }),
            });
          }
        }
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      const query = searchQuery.toLowerCase();
      const matchQuery = query
        ? (res.customer_phone && res.customer_phone.includes(query)) ||
          (res.customer_name && res.customer_name.toLowerCase().includes(query))
        : true;
      return matchQuery;
    });
  }, [reservations, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: reservations.length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      seated: reservations.filter((r) => r.status === "seated").length,
      cancelled_noshow: reservations.filter(
        (r) => r.status === "cancelled" || r.status === "no_show",
      ).length,
    };
  }, [reservations]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1">
      {upcomingLockReservations.length > 0 && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50 shadow-sm animate-pulse">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">
                Chú ý: Có {upcomingLockReservations.length} bàn sắp đến giờ hẹn
                (dưới 1h30 phút)
              </h4>
              <p className="text-xs text-amber-700/80 mt-0.5">
                Hệ thống đang ưu tiên giữ các bàn này, vui lòng không xếp khách
                vãng lai mới.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Tổng lịch hẹn
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {stats.total}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
              <CalendarIcon size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Đã giữ bàn</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {stats.confirmed}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <CalendarCheck size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Đang ngồi ăn</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {stats.seated}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Hủy / Quá hạn
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {stats.cancelled_noshow}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-2 border-slate-100 shadow-md overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Search size={18} className="text-indigo-600" /> Kiểm tra nhanh
                tình trạng bàn trống
              </h2>
              <p className="text-xs text-slate-500">
                Hệ thống quét tự động cả lịch đặt trước 1h30 phút và tình trạng
                có khách thực tế trên sơ đồ.
              </p>
            </div>
            <Button
              onClick={openNewBookingModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl px-4 py-5 h-auto shadow-sm flex items-center gap-1.5 self-start md:self-auto"
            >
              <Plus size={18} /> Thêm lịch đặt bàn
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <CalendarIcon size={13} /> Chọn ngày đến
              </Label>
              <Input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                className="rounded-xl h-11 border-slate-200 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Clock size={13} /> Khung giờ hẹn
              </Label>
              <Input
                type="time"
                value={checkTime}
                onChange={(e) => setCheckTime(e.target.value)}
                className="rounded-xl h-11 border-slate-200 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Phone size={13} /> Tìm nhanh tên/SĐT khách
              </Label>
              <Input
                type="text"
                placeholder="Tìm kiếm khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl h-11 border-slate-200 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <h4 className="font-bold text-emerald-700 mb-2 flex items-center gap-1">
              🟢 BÀN TRỐNG KHẢ DỤNG ({availabilityReport.available.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-auto">
              {availabilityReport.available.length === 0 ? (
                <p className="text-slate-400 italic">Hết bàn trống phù hợp!</p>
              ) : (
                availabilityReport.available.map((t: any) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="bg-emerald-50/50 text-emerald-700 border-emerald-200 px-2 py-1 font-bold rounded-lg"
                  >
                    {t.name} ({t.area?.name || "Khu vực"})
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 shadow-sm">
            <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-1">
              🔴 BÀN ĐÃ BẬN / TRÙNG LỊCH / CÓ KHÁCH (
              {availabilityReport.occupiedOrReserved.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-auto">
              {availabilityReport.occupiedOrReserved.length === 0 ? (
                <p className="text-slate-400 italic">Không có bàn bận.</p>
              ) : (
                availabilityReport.occupiedOrReserved.map((t: any) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="bg-slate-100 text-slate-600 border-slate-200 px-2 py-1 font-medium rounded-lg line-through"
                  >
                    {t.name} ({t.area?.name || "Khu vực"})
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="confirmed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl h-12 gap-1">
          <TabsTrigger
            value="confirmed"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 shadow-none"
          >
            Đã giữ bàn ({stats.confirmed})
          </TabsTrigger>
          <TabsTrigger
            value="seated"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 shadow-none"
          >
            Đang ăn ({stats.seated})
          </TabsTrigger>
          <TabsTrigger
            value="cancelled_noshow"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-rose-600 shadow-none"
          >
            Đã hủy / Quá hạn ({stats.cancelled_noshow})
          </TabsTrigger>
        </TabsList>

        {["confirmed", "seated", "cancelled_noshow"].map((tabKey) => {
          const listByStatus = filteredReservations.filter((r) => {
            if (tabKey === "cancelled_noshow")
              return r.status === "cancelled" || r.status === "no_show";
            return r.status === tabKey;
          });

          return (
            <TabsContent key={tabKey} value={tabKey} className="mt-4 space-y-3">
              {listByStatus.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl italic text-xs">
                  Không có lịch đặt bàn nào ở mục này.
                </div>
              ) : (
                listByStatus.map((res) => (
                  <Card
                    key={res.id}
                    className="rounded-2xl border-slate-100 hover:border-slate-200 transition-all shadow-sm bg-white dark:bg-slate-900"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User size={16} className="text-slate-400" />{" "}
                            {res.customer_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              statusConfig[
                                res.status as keyof typeof statusConfig
                              ]?.className
                            }
                          >
                            {
                              statusConfig[
                                res.status as keyof typeof statusConfig
                              ]?.label
                            }
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-300 font-bold">
                            <Phone size={13} className="text-indigo-500" />{" "}
                            {res.customer_phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-indigo-500" />{" "}
                            {new Date(res.reservation_time).toLocaleString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              },
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={13} className="text-indigo-500" />{" "}
                            {res.guest_count} khách
                          </span>

                          <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md dark:bg-indigo-950/50 dark:text-indigo-300">
                            🪑{" "}
                            {res.table?.name
                              ? `Bàn: ${res.table.name} ${res.table.area?.name ? `(${res.table.area.name})` : ""}`
                              : "Chưa gán số bàn"}
                          </span>
                        </div>

                        {res.note && (
                          <p className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 italic max-w-2xl">
                            📝 Yêu cầu khách: {res.note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {loading === res.id && (
                          <span className="text-xs text-slate-400 animate-pulse mr-2">
                            Đang đồng bộ...
                          </span>
                        )}

                        {res.status === "confirmed" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl h-9 text-xs shadow-sm flex items-center gap-1"
                              // Đã thêm res.table_id
                              onClick={() =>
                                handleUpdateStatus(
                                  res.id,
                                  "seated",
                                  res.table_id,
                                )
                              }
                            >
                              <CheckCircle2 size={14} /> Nhận bàn & Mở đơn POS
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl h-9 text-xs"
                              // Đã thêm res.table_id
                              onClick={() =>
                                handleUpdateStatus(
                                  res.id,
                                  "cancelled",
                                  res.table_id,
                                )
                              }
                            >
                              Hủy lịch
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-200 hover:bg-purple-50 font-bold rounded-xl h-9 text-xs"
                              // Đã thêm res.table_id
                              onClick={() =>
                                handleUpdateStatus(
                                  res.id,
                                  "no_show",
                                  res.table_id,
                                )
                              }
                            >
                              Quá hạn
                            </Button>
                          </>
                        )}

                        {res.status === "seated" && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 border-none font-extrabold px-3 py-2 rounded-xl text-xs"
                          >
                            ✓ Đang phục vụ tại bàn ăn POS
                          </Badge>
                        )}

                        {res.status === "no_show" && (
                          <Badge
                            variant="outline"
                            className="bg-purple-500/10 text-purple-700 border-none font-extrabold px-3 py-2 rounded-xl text-xs"
                          >
                            ⚠ Khách không đến (Đã dọn bàn trống)
                          </Badge>
                        )}

                        {res.status === "cancelled" && (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-700 border-none font-extrabold px-3 py-2 rounded-xl text-xs"
                          >
                            ✕ Lịch hẹn đã hủy bỏ
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-auto rounded-3xl p-6 shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="text-indigo-600" /> Phiếu Ghi Nhận Đặt Bàn Nhà
              Hàng
            </DialogTitle>
            <DialogDescription className="text-xs">
              Điền các thông tin cốt lõi của khách hàng. Sơ đồ bàn sẽ tự động
              giữ chỗ khi khoảng thời gian chạm ngưỡng 1h30 phút.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReservation} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="customer_name"
                  className="text-xs font-bold text-slate-700"
                >
                  Họ tên khách hàng (*)
                </Label>
                <Input
                  id="customer_name"
                  required
                  placeholder="Tên người đặt..."
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  className="rounded-xl h-10 border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="customer_phone"
                  className="text-xs font-bold text-slate-700"
                >
                  Số điện thoại liên hệ (*)
                </Label>
                <Input
                  id="customer_phone"
                  required
                  placeholder="Số điện thoại..."
                  value={formData.customer_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_phone: e.target.value })
                  }
                  className="rounded-xl h-10 border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="guest_count"
                  className="text-xs font-bold text-slate-700"
                >
                  Số lượng khách đến
                </Label>
                <Input
                  id="guest_count"
                  type="number"
                  min="1"
                  value={formData.guest_count}
                  onChange={(e) =>
                    setFormData({ ...formData, guest_count: e.target.value })
                  }
                  className="rounded-xl h-10 border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="reservation_time"
                  className="text-xs font-bold text-slate-700"
                >
                  Ngày giờ đến ăn (*)
                </Label>
                <Input
                  id="reservation_time"
                  type="datetime-local"
                  required
                  value={formData.reservation_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reservation_time: e.target.value,
                    })
                  }
                  className="rounded-xl h-10 border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="table_id"
                className="text-xs font-bold text-slate-700"
              >
                Gán số bàn cụ thể
              </Label>
              <Select
                value={formData.table_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, table_id: value })
                }
              >
                <SelectTrigger
                  id="table_id"
                  className="rounded-xl h-10 border-slate-200 text-xs"
                >
                  <SelectValue placeholder="Chọn một bàn trống khả dụng" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="none">
                    Chờ xếp số bàn sau (Xếp tại quầy sau)
                  </SelectItem>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.area?.name || "Khu vực"}) - Sức chứa:{" "}
                      {table.capacity || 4} người
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="note"
                className="text-xs font-bold text-slate-700"
              >
                Ghi chú yêu cầu setup đặc biệt (Nếu có)
              </Label>
              <Textarea
                id="note"
                placeholder="Ví dụ: Khách cần ghế ăn dặm trẻ em, tổ chức kỷ niệm ngày cưới cần chuẩn bị nến..."
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                className="rounded-xl min-h-[70px] border-slate-200 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl font-bold text-xs h-10"
              >
                Đóng lại
              </Button>
              <Button
                type="submit"
                disabled={loading === "create"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-10 shadow-sm px-5"
              >
                {loading === "create" ? "Đang lưu..." : "Ghi nhận lịch hẹn"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

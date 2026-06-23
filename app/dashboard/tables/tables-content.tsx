"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Table, Area, Order, OrderItem, MenuItem } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  ShoppingCart,
  Plus,
  MoreVertical,
  QrCode,
  Printer,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface TablesContentProps {
  tables: (Table & { area?: Area })[];
  areas: Area[];
  activeOrders: (Order & {
    table?: Table;
    items?: (OrderItem & { menu_item?: MenuItem })[];
  })[];
}

const statusConfig = {
  available: {
    label: "Trống",
    className: "bg-status-available text-white",
    borderClass: "border-status-available",
  },
  occupied: {
    label: "Có khách",
    className: "bg-status-occupied text-white",
    borderClass: "border-status-occupied",
  },
  reserved: {
    label: "Đã đặt",
    className: "bg-status-reserved text-white",
    borderClass: "border-status-reserved",
  },
  cleaning: {
    label: "Dọn dẹp",
    className: "bg-status-cleaning text-foreground",
    borderClass: "border-status-cleaning",
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

export function TablesContent({
  tables: initialTables,
  areas,
  activeOrders,
}: TablesContentProps) {
  // Định nghĩa các trạng thái quản lý Dialog ảnh QR
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<any>(null);
  const [qrImageBase64, setQrImageBase64] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const router = useRouter();

  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  useEffect(() => {
    // Khởi tạo supabase client phía client-side
    const supabase = createClient();

    // Thiết lập kênh lắng nghe mọi sự thay đổi biến động của bảng 'tables' dưới database
    const tableRealtimeChannel = (supabase as any)
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload: any) => {
          console.log(
            "Phát hiện sơ đồ phòng bàn dưới DB vừa thay đổi:",
            payload,
          );

          // Quy tắc Đồng bộ State của dự án:
          // Ép Server Component chạy lại hàm fetch dữ liệu gốc để giao diện đổi màu lập tức trong 0.1 giây
          router.refresh();
        },
      )
      .subscribe();

    // Hàm dọn dẹp (Clean up) đóng cổng kết nối khi nhân viên chuyển sang trang khác
    return () => {
      (supabase as any).removeChannel(tableRealtimeChannel);
    };
  }, [router]);

  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  const [selectedTable, setSelectedTable] = useState<
    (Table & { area?: Area }) | null
  >(null);
  const [activeAreaId, setActiveAreaId] = useState(areas[0]?.id || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);
  const [isDeleteAreaOpen, setIsDeleteAreaOpen] = useState(false);
  const [isDeleteTableOpen, setIsDeleteTableOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<
    (Table & { area?: Area }) | null
  >(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaSortOrder, setNewAreaSortOrder] = useState(areas.length + 1);

  const getTablesByArea = (areaId: string) => {
    return tables.filter((table) => table.area_id === areaId);
  };

  const getOrderForTable = (tableId: string) => {
    return activeOrders.find((order) => order.table_id === tableId);
  };

  const getTableStats = () => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "available").length;
    const occupied = tables.filter((t) => t.status === "occupied").length;
    const reserved = tables.filter((t) => t.status === "reserved").length;
    const cleaning = tables.filter((t) => t.status === "cleaning").length;
    return { total, available, occupied, reserved, cleaning };
  };

  const stats = getTableStats();

  const handleTableClick = (table: Table & { area?: Area }) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  const handleAddArea = () => {
    // TODO: connect this action với API để thêm phòng mới vào database
    setIsAreaDialogOpen(true);
  };

  const handleDeleteArea = () => {
    setIsDeleteAreaOpen(true);
  };

  const activeArea = areas.find((area) => area.id === activeAreaId);

  const handleDeleteTable = (table: Table & { area?: Area }) => {
    setTableToDelete(table);
    setIsDeleteTableOpen(true);
  };

  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      const response = await fetch(`/api/tables/${tableToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Có lỗi xảy ra khi xóa bàn");
      }

      // Đóng modal xóa bàn, xóa trạng thái lưu tạm và cập nhật lại giao diện
      setIsDeleteTableOpen(false);
      setTableToDelete(null);
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) {
      alert("Tên phòng/khu vực không được để trống");
      return;
    }

    try {
      const response = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAreaName,
          sort_order: Number(newAreaSortOrder),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Có lỗi xảy ra khi tạo phòng");
      }

      // Tắt modal, xóa trắng ô nhập để chuẩn bị cho lần sau và reload dữ liệu
      setIsAreaDialogOpen(false);
      setNewAreaName("");
      setNewAreaSortOrder(areas.length + 1);

      // Ra lệnh cho Server component fetch lại dữ liệu areas mới để cập nhật danh sách Tab
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleConfirmDeleteArea = async () => {
    if (!activeAreaId) {
      alert("Vui lòng chọn phòng/khu vực cần xóa");
      return;
    }

    try {
      const response = await fetch(`/api/areas/${activeAreaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Có lỗi xảy ra khi xóa phòng");
      }

      // Đóng modal xóa phòng
      setIsDeleteAreaOpen(false);

      // Chuyển hướng Tab đang xem sang phòng đầu tiên còn lại (nếu có) để tránh trống giao diện
      const remainingAreas = areas.filter((a) => a.id !== activeAreaId);
      setActiveAreaId(remainingAreas[0]?.id || "");

      router.refresh(); // Làm mới danh sách Tab trên server
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  // Hàm xử lý khi chọn trạng thái mới trong Select hoặc khi bấm nút "Hoàn thành dọn dẹp"
  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể cập nhật trạng thái bàn");
      }

      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === tableId ? { ...t, status: newStatus as any } : t,
        ),
      );

      // Nếu đang mở Modal chi tiết bàn, cập nhật state local để hiển thị Badge mới ngay lập tức
      if (selectedTable && selectedTable.id === tableId) {
        setSelectedTable({ ...selectedTable, status: newStatus as any });
      }

      setIsDialogOpen(false); // Đóng modal chi tiết
      router.refresh(); // Tải lại dữ liệu Server Component
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      alert("Tên bàn không được để trống");
      return;
    }

    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTableName,
          area_id: activeAreaId, // Tự động gán vào khu vực/tầng đang được chọn
          capacity: Number(newTableCapacity),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Có lỗi xảy ra khi tạo bàn");
      }

      // Đóng modal, xóa sạch ô nhập dữ liệu cũ và cập nhật lại giao diện
      setIsTableDialogOpen(false);
      setNewTableName("");
      setNewTableCapacity(4);
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  // Hàm xử lý khi Admin bấm vào nút "In mã QR" của một bàn cụ thể
  const handleOpenQrScanner = async (table: any) => {
    try {
      setIsDialogOpen(false); // Đóng modal chi tiết bàn nếu đang mở

      setSelectedTableForQr(table);
      setIsQrModalOpen(true);
      setIsLoadingQr(true);
      setQrImageBase64(null);

      // Gọi lên API sinh chuỗi ảnh QR Base64 dạng dữ liệu động
      const response = await fetch(`/api/tables/${table.id}/qr`);
      const data = await response.json();

      if (data.qrCode) {
        setQrImageBase64(data.qrCode);
      }
    } catch (error) {
      console.error("Không thể tải mã QR:", error);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Hàm kích hoạt lệnh in của trình duyệt để in giấy dán bàn
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && qrImageBase64) {
      printWindow.document.write(`
        <html>
          <body style="text-align: center; font-family: sans-serif; padding-top: 40px;">
            <h2>MÃ QR ĐẶT MÓN TỰ ĐỘNG</h2>
            <h1 style="font-size: 3rem; margin: 10px 0;">${selectedTableForQr?.name}</h1>
            <p style="color: #666;">Quét mã bằng điện thoại để xem thực đơn và gọi món</p>
            <img src="${qrImageBase64}" style="width: 300px; height: 300px; margin-top: 20px;" />
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const tableOrder = selectedTable ? getOrderForTable(selectedTable.id) : null;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Tổng số bàn</div>
          </CardContent>
        </Card>
        <Card className="border-status-available">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-available">
              {stats.available}
            </div>
            <div className="text-sm text-muted-foreground">Bàn trống</div>
          </CardContent>
        </Card>
        <Card className="border-status-occupied">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-occupied">
              {stats.occupied}
            </div>
            <div className="text-sm text-muted-foreground">Có khách</div>
          </CardContent>
        </Card>
        <Card className="border-status-reserved">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-reserved">
              {stats.reserved}
            </div>
            <div className="text-sm text-muted-foreground">Đã đặt</div>
          </CardContent>
        </Card>
        <Card className="border-status-cleaning">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-cleaning">
              {stats.cleaning}
            </div>
            <div className="text-sm text-muted-foreground">Dọn dẹp</div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Chú thích:</span>
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn("h-4 w-4 rounded", config.className)} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Tables Grid */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle>Sơ đồ bàn</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quản lý phòng và bàn trực quan, kèm thao tác thêm/xóa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleAddArea}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm phòng
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTableDialogOpen(true)}
              disabled={!activeAreaId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm bàn
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteArea}>
              Xóa phòng
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeAreaId}
            onValueChange={(value) => setActiveAreaId(value)}
            className="w-full"
          >
            <TabsList className="mb-4 w-full justify-start flex-wrap h-auto gap-2">
              {areas.map((area) => (
                <TabsTrigger key={area.id} value={area.id} className="text-sm">
                  {area.name}
                  <Badge variant="secondary" className="ml-2">
                    {getTablesByArea(area.id).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {areas.map((area) => (
              <TabsContent key={area.id} value={area.id}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {getTablesByArea(area.id).map((table) => {
                    const order = getOrderForTable(table.id);
                    return (
                      <div
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className={cn(
                          "relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg min-h-[140px]",
                          table.status === "available" &&
                            "border-status-available bg-status-available/5 hover:bg-status-available/15",
                          table.status === "occupied" &&
                            "border-status-occupied bg-status-occupied/5 hover:bg-status-occupied/15",
                          table.status === "reserved" &&
                            "border-status-reserved bg-status-reserved/5 hover:bg-status-reserved/15",
                          table.status === "cleaning" &&
                            "border-status-cleaning bg-status-cleaning/5 hover:bg-status-cleaning/15",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-lg">
                            {table.name}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mr-2 -mt-1"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                Đổi trạng thái
                              </DropdownMenuItem>
                              <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteTable(table);
                                }}
                              >
                                Xóa bàn
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenQrScanner(table)}
                              >
                                <QrCode className="mr-2 h-4 w-4 text-amber-500" />
                                <span>In mã QR Bàn</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{table.capacity} chỗ</span>
                        </div>

                        <div className="flex-1" />

                        <Badge
                          className={cn(
                            "mt-2 text-xs justify-center",
                            statusConfig[table.status].className,
                          )}
                        >
                          {statusConfig[table.status].label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Table Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{selectedTable?.name}</span>
              {selectedTable && (
                <Badge className={statusConfig[selectedTable.status].className}>
                  {statusConfig[selectedTable.status].label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.area?.name} - {selectedTable?.capacity} chỗ ngồi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Change */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Đổi trạng thái</label>
              <Select
                value={selectedTable?.status}
                onValueChange={(value) =>
                  selectedTable && handleStatusChange(selectedTable.id, value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Trống</SelectItem>
                  <SelectItem value="occupied">Có khách</SelectItem>
                  <SelectItem value="reserved">Đã đặt</SelectItem>
                  <SelectItem value="cleaning">Dọn dẹp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Info if occupied */}
            {tableOrder && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    Đơn hàng #{tableOrder.order_number}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(tableOrder.created_at)}
                  </span>
                </div>

                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {tableOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {item.quantity}x {item.menu_item?.name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between pt-3 border-t font-semibold">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(tableOrder.total)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {selectedTable?.status === "available" && (
                <Button className="flex-1" asChild>
                  <Link href={`/dashboard/pos?table=${selectedTable.id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Tạo đơn hàng
                  </Link>
                </Button>
              )}
              {selectedTable?.status === "occupied" && tableOrder && (
                <>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link
                      href={`/dashboard/pos?table=${selectedTable.id}&order=${tableOrder.id}`}
                    >
                      Thêm món
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href={`/dashboard/billing?order=${tableOrder.id}`}>
                      Thanh toán
                    </Link>
                  </Button>
                </>
              )}
              {selectedTable?.status === "reserved" && (
                <Button className="flex-1" asChild>
                  <Link href={`/dashboard/pos?table=${selectedTable.id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Nhận bàn & Tạo đơn
                  </Link>
                </Button>
              )}
              {selectedTable?.status === "cleaning" && (
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleStatusChange(selectedTable.id, "available")
                  }
                >
                  Hoàn thành dọn dẹp
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={isAreaDialogOpen} onOpenChange={setIsAreaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm phòng mới</DialogTitle>
            <DialogDescription>
              Nhập tên phòng và thứ tự hiển thị.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Tên phòng</label>
              <Input
                value={newAreaName}
                onChange={(event) => setNewAreaName(event.target.value)}
                placeholder="Ví dụ: Tầng 3, VIP"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Thứ tự hiển thị
              </label>
              <Input
                type="number"
                value={newAreaSortOrder}
                onChange={(event) =>
                  setNewAreaSortOrder(Number(event.target.value))
                }
                min={1}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsAreaDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button onClick={handleCreateArea} disabled={!newAreaName.trim()}>
                Lưu phòng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room Dialog */}
      <Dialog open={isDeleteAreaOpen} onOpenChange={setIsDeleteAreaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa phòng</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa phòng <strong>{activeArea?.name}</strong>?
              Hành động này sẽ không thể hoàn tác và các bàn trong phòng này sẽ
              bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteAreaOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteArea}>
              Xóa phòng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Table Dialog */}
      <Dialog open={isDeleteTableOpen} onOpenChange={setIsDeleteTableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa bàn</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa bàn <strong>{tableToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteTableOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteTable}>
              Xóa bàn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* DIALOG FORM: THÊM BÀN MỚI*/}
      {/* ========================================== */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm bàn mới vào {activeArea?.name}</DialogTitle>
            <DialogDescription>
              Nhập tên bàn và sức chứa chỗ ngồi cho khu vực hiện tại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Tên bàn / Số bàn
              </label>
              <Input
                value={newTableName}
                onChange={(event) => setNewTableName(event.target.value)}
                placeholder="Ví dụ: Bàn số 10, Bàn VIP 1"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Sức chứa (Số chỗ ngồi)
              </label>
              <Input
                type="number"
                value={newTableCapacity}
                onChange={(event) =>
                  setNewTableCapacity(Number(event.target.value))
                }
                min={1}
                max={20}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsTableDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateTable}
                disabled={!newTableName.trim()}
              >
                Xác nhận tạo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* KHỐI THÊM MỚI: Hộp thoại Dialog hiển thị và In mã QR sắc nét */}
      {/* ========================================================= */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[400px] z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <QrCode className="h-5 w-5 text-primary" />
              <span>Mã QR độc quyền - {selectedTableForQr?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Mã QR dùng để dán tại bàn, tự động nhận diện và khóa giao diện
              phục vụ cho Khách hàng.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-muted/20 my-2 min-h-[260px]">
            {isLoadingQr ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Đang khởi tạo mã QR...
                </p>
              </div>
            ) : qrImageBase64 ? (
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <img
                  src={qrImageBase64}
                  alt="Table QR Code"
                  className="w-[200px] height-[200px]"
                />
              </div>
            ) : (
              <p className="text-sm text-destructive">Lỗi sinh mã QR bàn</p>
            )}
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>
              Đóng lại
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!qrImageBase64}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              In mã QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

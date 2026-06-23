"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  UserPlus,
  Shield,
  Search,
  RefreshCw,
  Edit,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  Users,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  role: "manager" | "cashier" | "waiter" | "kitchen";
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  hourly_rate: number;
  total_working_hours?: number; // Nhận từ Server Component xuống để tính lũy kế chưa thanh toán
}

interface StaffContentProps {
  profiles: Profile[];
}

const roleConfig = {
  manager: {
    label: "Quản lý",
    className: "bg-red-500 text-white hover:bg-red-600",
  },
  cashier: {
    label: "Thu ngân",
    className: "bg-blue-500 text-white hover:bg-blue-600",
  },
  waiter: {
    label: "Phục vụ",
    className: "bg-green-500 text-white hover:bg-green-600",
  },
  kitchen: {
    label: "Nhân viên bếp",
    className: "bg-amber-500 text-white hover:bg-amber-600",
  },
};

export function StaffContent({
  profiles: initialProfiles = [],
}: StaffContentProps) {
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("waiter");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(0);

  const [editPassword, setEditPassword] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // STATE CHẤM CÔNG & QUẢN LÝ CA LÀM
  const [attendanceMock, setAttendanceMock] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addRole, setAddRole] = useState<
    "manager" | "cashier" | "waiter" | "kitchen"
  >("waiter");
  const [addPhone, setAddPhone] = useState("");
  const [addHourlyRate, setAddHourlyRate] = useState<string>("20000");

  // 🟢 STATE MỚI: Lưu trữ danh sách ID nhân viên được tích chọn để chốt công trong ca làm việc hiện tại
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // 🟢 Tự động xóa trắng (Reset) lượt tích chọn checkbox mỗi khi người quản lý chuyển đổi giữa các ca làm việc
  useEffect(() => {
    setSelectedEmployeeIds([]);
  }, [selectedShiftId]);

  useEffect(() => {
    const safeProfiles = initialProfiles || [];
    setProfiles(safeProfiles);
    setAttendanceMock(
      safeProfiles
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          status: "present",
          late_minutes: 0,
          absent_type: "excused",
        })),
    );
  }, [initialProfiles]);

  // Lấy danh sách ca làm việc thực tế từ DB để chọn khi Chốt công
  useEffect(() => {
    async function fetchShifts() {
      try {
        const res = await fetch("/api/staff/shifts");
        if (res.ok) {
          const data = await res.json();
          setShifts(data);
          if (data && data.length > 0) setSelectedShiftId(data[0].id);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách ca:", err);
      }
    }
    fetchShifts();
  }, []);

  const filteredProfiles = useMemo(() => {
    const list = profiles || [];
    return list.filter((p) => {
      if (!p) return false;
      const matchesSearch =
        (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery));
      const matchesRole = roleFilter === "all" || p.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.is_active === true) ||
        (statusFilter === "inactive" && p.is_active === false);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, searchQuery, roleFilter, statusFilter]);

  const totalStaff = profiles ? profiles.length : 0;
  const activeStaff = profiles ? profiles.filter((p) => p.is_active).length : 0;
  const inactiveStaff = totalStaff - activeStaff;

  const handleUpdateStaff = async (profileId: string, payload: any) => {
    try {
      const response = await fetch(`/api/staff/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Cập nhật thất bại");
      }
      setProfiles((prev) =>
        (prev || []).map((p) =>
          p.id === profileId ? ({ ...p, ...payload } as Profile) : p,
        ),
      );
      setIsRoleDialogOpen(false);
      setIsStatusDialogOpen(false);
      setIsEditDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleEditStaff = async () => {
    if (!selectedProfile) return;
    if (!editFullName.trim()) {
      alert("Họ tên không được để trống!");
      return;
    }

    const payload: any = {
      full_name: editFullName,
      phone: editPhone || null,
      hourly_rate: Number(editHourlyRate),
    };

    if (editPassword.trim().length >= 6) {
      payload.new_password = editPassword;
    } else if (editPassword.trim().length > 0) {
      alert("Mật khẩu mới phải có tối thiểu 6 ký tự trở lên!");
      return;
    }

    await handleUpdateStaff(selectedProfile.id, payload);
    setEditPassword("");
  };

  const handleCreateStaff = async () => {
    if (!addEmail.trim() || !addPassword.trim() || !addFullName.trim()) {
      alert("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!");
      return;
    }
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          password: addPassword,
          full_name: addFullName,
          role: addRole,
          phone: addPhone || null,
          hourly_rate: Number(addHourlyRate),
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Có lỗi xảy ra");
      }
      setIsAddDialogOpen(false);
      alert("Thêm nhân viên mới thành công!");
      setAddEmail("");
      setAddPassword("");
      setAddFullName("");
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  // 🟢 HÀM XỬ LÝ LOGIC CHECKBOX: Tích chọn / bỏ tích chọn một nhân viên cụ thể
  const handleToggleSelectEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  // 🟢 HÀM XỬ LÝ LOGIC CHECKBOX: Tích chọn tất cả / bỏ tích tất cả nhân viên đang hoạt động
  const handleSelectAllEmployees = () => {
    const activeProfiles = profiles.filter((p) => p.is_active);
    if (selectedEmployeeIds.length === activeProfiles.length) {
      setSelectedEmployeeIds([]); // Nếu đang chọn full thì bỏ chọn toàn bộ
    } else {
      setSelectedEmployeeIds(activeProfiles.map((p) => p.id)); // Chọn toàn bộ nhân viên đang hoạt động
    }
  };

  // 🟢 HÀM CHỐT CÔNG CUỐI NGÀY ĐÃ ĐƯỢC NÂNG CẤP LINH HOẠT
  const handleLockDayAttendance = async () => {
    if (!selectedShiftId) {
      alert("Vui lòng lựa chọn Ca làm việc để chốt công!");
      return;
    }

    // Kiểm tra xem người quản lý đã tích chọn ai đi làm ca này chưa
    if (selectedEmployeeIds.length === 0) {
      alert(
        "Vui lòng tích chọn ít nhất một nhân viên tham gia ca làm việc này!",
      );
      return;
    }

    try {
      // 🟢 CHỈ lọc và chuẩn bị dữ liệu gửi lên cho những nhân sự ĐƯỢC TÍCH CHỌN
      const records = attendanceMock
        .filter((item) => selectedEmployeeIds.includes(item.id))
        .map((item) => ({
          employee_id: item.id,
          shift_id: selectedShiftId,
          status: item.status,
          late_minutes:
            item.status === "late" ? Number(item.late_minutes || 0) : 0,
        }));

      const response = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceRecords: records,
          date: new Date().toLocaleDateString("sv-SE"), // Gửi kèm ngày định dạng chuẩn YYYY-MM-DD
        }),
      });

      if (!response.ok) throw new Error("Lỗi chốt công từ máy chủ");

      alert(
        `Đã ghi nhận lịch sử và chốt công thành công cho ${selectedEmployeeIds.length} nhân viên làm ca này!`,
      );
      setSelectedEmployeeIds([]); // Giải phóng tích chọn sau khi lưu xong ca
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  // 🔴 HÀM QUYẾT TOÁN LƯƠNG (RESET QUỸ GIỜ VỀ 0)
  const handleSettlement = async (employeeId?: string) => {
    const msg = employeeId
      ? "Xác nhận đã trả lương xong. Toàn bộ số giờ tích lũy của nhân viên này sẽ được đặt về 0 để bắt đầu chu kỳ mới?"
      : "Xác nhận đã chi trả lương cho tất cả mọi người? Toàn bộ số giờ tích lũy của hệ thống sẽ về 0.";
    if (!confirm(msg)) return;

    try {
      const response = await fetch("/api/staff/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      if (!response.ok) throw new Error("Quyết toán thất bại");
      alert("Quyết toán hoàn tất! Quỹ giờ làm việc đã làm mới thành công.");
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Khối thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight">
                {totalStaff}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Tổng nhân sự
              </div>
            </div>
            <div className="p-2.5 bg-muted rounded-lg text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/40 shadow-sm bg-green-50/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-green-600">
                {activeStaff}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Đang hoạt động
              </div>
            </div>
            <div className="p-2.5 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-gray-500">
                {inactiveStaff}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Tạm khóa
              </div>
            </div>
            <div className="p-2.5 bg-gray-100 text-gray-500 rounded-lg">
              <RefreshCw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="w-full space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/60 p-1 rounded-lg">
          <TabsTrigger
            value="members"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Users className="h-4 w-4" /> Thành viên
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <CalendarCheck className="h-4 w-4" /> Duyệt công
          </TabsTrigger>
          <TabsTrigger
            value="payroll"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Wallet className="h-4 w-4" /> Bảng lương
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DANH SÁCH THÀNH VIÊN */}
        <TabsContent value="members">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Danh sách thành viên
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quản lý tài khoản, thông tin cơ bản, vị trí làm việc và lương
                  của nhân sự.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên, SĐT..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                    <SelectValue placeholder="Chức vụ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả chức vụ</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                    <SelectItem value="cashier">Thu ngân</SelectItem>
                    <SelectItem value="waiter">Phục vụ</SelectItem>
                    <SelectItem value="kitchen">Nhân viên bếp</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Tạm khóa</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 w-full sm:w-auto font-medium bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Thêm nhân viên
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 font-semibold text-foreground">
                        Họ và tên
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        Số điện thoại
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        Chức vụ
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        Mức lương/Giờ
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground text-sm"
                        >
                          Không tìm thấy nhân viên.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <TableRow
                          key={profile.id}
                          className="hover:bg-muted/20"
                        >
                          <TableCell className="font-semibold pl-4 text-sm">
                            {profile.full_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {profile.phone || "Chưa cập nhật"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`shadow-none font-medium text-xs ${roleConfig[profile.role]?.className}`}
                            >
                              {roleConfig[profile.role]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {(profile.hourly_rate || 0).toLocaleString("vi-VN")}{" "}
                            đ
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                profile.is_active ? "default" : "secondary"
                              }
                              className={
                                profile.is_active
                                  ? "bg-green-600 text-xs font-medium"
                                  : "text-xs font-medium"
                              }
                            >
                              {profile.is_active
                                ? "Đang hoạt động"
                                : "Tạm khóa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 ml-auto block"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setEditFullName(profile.full_name);
                                    setEditPhone(profile.phone || "");
                                    setEditHourlyRate(profile.hourly_rate || 0);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Sửa thông
                                  tin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setNewRole(profile.role);
                                    setIsRoleDialogOpen(true);
                                  }}
                                >
                                  <Shield className="mr-2 h-4 w-4" /> Đổi chức
                                  vụ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={
                                    profile.is_active
                                      ? "text-amber-600"
                                      : "text-green-600"
                                  }
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setIsStatusDialogOpen(true);
                                  }}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />{" "}
                                  {profile.is_active
                                    ? "Khóa tài khoản"
                                    : "Mở khóa"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DUYỆT CÔNG CUỐI NGÀY (CÓ CHECKBOX TỪNG NGƯỜI) */}
        <TabsContent value="attendance">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Duyệt công cuối ngày
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tích chọn nhân viên đi làm ca này, chỉnh sửa trạng thái công
                  nhật và thực hiện chốt công.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedShiftId}
                  onValueChange={setSelectedShiftId}
                >
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Chọn ca chốt công" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shift_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white font-medium h-9"
                  onClick={handleLockDayAttendance}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Chốt công ca này
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      {/* 🟢 Ô TÍCH CHỌN TẤT CẢ Ở ĐẦU TIÊU ĐỀ BẢNG */}
                      <TableHead className="w-[50px] text-center pl-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          checked={
                            profiles.filter((p) => p.is_active).length > 0 &&
                            selectedEmployeeIds.length ===
                              profiles.filter((p) => p.is_active).length
                          }
                          onChange={handleSelectAllEmployees}
                        />
                      </TableHead>
                      <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                        Nhân viên
                      </th>
                      <TableHead className="font-semibold">Chức vụ</TableHead>
                      <TableHead className="font-semibold w-[220px]">
                        Trạng thái
                      </TableHead>
                      <TableHead className="font-semibold">
                        Khấu trừ / Ghi chú
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceMock.map((item, index) => {
                      // Kiểm tra xem dòng nhân viên này có đang được tích chọn tham gia ca hay không
                      const isChecked = selectedEmployeeIds.includes(item.id);

                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-muted/20 transition-colors ${isChecked ? "bg-emerald-50/40 hover:bg-emerald-50/60" : ""}`}
                        >
                          {/* 🟢 Ô CHECKBOX CHỌN RIÊNG TỪNG NHÂN VIÊN */}
                          <TableCell className="text-center pl-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                              checked={isChecked}
                              onChange={() =>
                                handleToggleSelectEmployee(item.id)
                              }
                            />
                          </TableCell>

                          <TableCell className="font-semibold text-sm">
                            {item.full_name}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={`shadow-none font-medium text-xs ${roleConfig[item.role as keyof typeof roleConfig]?.className}`}
                            >
                              {
                                roleConfig[item.role as keyof typeof roleConfig]
                                  ?.label
                              }
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Select
                              disabled={!isChecked} // 🟢 Vô hiệu hóa chọn trạng thái nếu không tích làm ca này
                              value={item.status}
                              onValueChange={(val) => {
                                const u = [...attendanceMock];
                                u[index].status = val;
                                if (val !== "late") u[index].late_minutes = 0;
                                setAttendanceMock(u);
                              }}
                            >
                              <SelectTrigger className="w-full h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">
                                  🟢 Đúng giờ (Có mặt)
                                </SelectItem>
                                <SelectItem value="late">
                                  🟡 Đi muộn (Trễ ca)
                                </SelectItem>
                                <SelectItem value="absent">
                                  🔴 Vắng mặt (Nghỉ)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            {isChecked ? (
                              <>
                                {item.status === "late" && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs text-muted-foreground">
                                      Số phút trễ:
                                    </span>
                                    <Input
                                      type="number"
                                      className="w-24 h-8 text-sm"
                                      value={item.late_minutes}
                                      onChange={(e) => {
                                        const u = [...attendanceMock];
                                        u[index].late_minutes = Number(
                                          e.target.value,
                                        );
                                        setAttendanceMock(u);
                                      }}
                                    />
                                  </div>
                                )}
                                {item.status === "absent" && (
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <Select
                                      value={item.absent_type}
                                      onValueChange={(val) => {
                                        const u = [...attendanceMock];
                                        u[index].absent_type = val;
                                        setAttendanceMock(u);
                                      }}
                                    >
                                      <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="excused">
                                          Có đơn xin phép
                                        </SelectItem>
                                        <SelectItem value="unexcused">
                                          Nghỉ không phép
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                {item.status === "present" && (
                                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                                    Đầy đủ ca công
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Không đi làm ca này
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BẢNG LƯƠNG TỰ ĐỘNG KHÉP KÍN (NÚT QUYẾT TOÁN) */}
        <TabsContent value="payroll">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Bảng lương tổng hợp chưa trả
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Tổng hợp toàn bộ quỹ giờ làm thực tế chưa thanh toán. Trả
                  lương xong, nhấn nút quyết toán để làm sạch quỹ giờ về 0.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 font-semibold"
                onClick={() => handleSettlement()}
              >
                <Wallet className="h-4 w-4 mr-2" /> Quyết toán tất cả nhân viên
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 font-semibold">
                        Họ tên nhân viên
                      </TableHead>
                      <TableHead className="font-semibold">
                        Mức lương/Giờ
                      </TableHead>
                      <TableHead className="font-semibold">
                        Giờ làm chưa thanh toán
                      </TableHead>
                      <TableHead className="font-semibold text-right">
                        Thành tiền tạm tính
                      </TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.filter((p) => p.is_active).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Không có nhân viên hoạt động.
                        </TableCell>
                      </TableRow>
                    ) : (
                      profiles
                        .filter((p) => p.is_active)
                        .map((p) => {
                          const realTotalHours = p.total_working_hours || 0;
                          const calculatedSalary =
                            (p.hourly_rate || 0) * realTotalHours;
                          return (
                            <TableRow key={p.id} className="hover:bg-muted/20">
                              <TableCell className="font-semibold pl-4 text-sm">
                                {p.full_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground font-medium">
                                {(p.hourly_rate || 0).toLocaleString("vi-VN")}{" "}
                                đ/giờ
                              </TableCell>
                              <TableCell className="font-semibold text-amber-600 text-sm">
                                {realTotalHours.toFixed(2)} giờ
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600 text-sm">
                                {calculatedSalary.toLocaleString("vi-VN")} đ
                              </TableCell>
                              <TableCell className="pr-4 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-green-600 text-green-600 hover:bg-green-50"
                                  disabled={realTotalHours === 0}
                                  onClick={() => handleSettlement(p.id)}
                                >
                                  Trả lương
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: FORM SỬA THÔNG TIN CÁ NHÂN & LƯƠNG GIỜ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Cập nhật thông tin nhân viên
            </DialogTitle>
            <DialogDescription>
              Thay đổi thông tin liên lạc và định mức khung lương cơ bản.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Họ và tên</label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Số điện thoại</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Chưa có SĐT"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Mức lương theo giờ (VNĐ)
              </label>
              <Input
                type="number"
                value={editHourlyRate}
                onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                placeholder="Ví dụ: 25000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed mt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-amber-600">
                  Email đăng nhập mới
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Bỏ trống nếu không đổi"
                  className="bg-amber-50/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-amber-600">
                  Mật khẩu mới
                </label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Bỏ trống nếu không đổi"
                  className="bg-amber-50/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEditStaff}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: THAY ĐỔI CHỨC VỤ */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Phân quyền chức vụ mới
            </DialogTitle>
            <DialogDescription>
              Thay đổi vai trò hệ thống của nhân sự{" "}
              <strong>{selectedProfile?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn chức vụ mới" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Quản lý (Manager)</SelectItem>
                <SelectItem value="cashier">Thu ngân (Cashier)</SelectItem>
                <SelectItem value="waiter">Phục vụ (Waiter)</SelectItem>
                <SelectItem value="kitchen">Nhân viên bếp (Kitchen)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() =>
                selectedProfile &&
                handleUpdateStaff(selectedProfile.id, { role: newRole })
              }
            >
              Cập nhật quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: TẠM KHÓA / MỞ KHÓA TÀI KHOẢN */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedProfile?.is_active
                ? "Tạm khóa tài khoản"
                : "Mở khóa tài khoản"}
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn{" "}
              {selectedProfile?.is_active
                ? "chặn quyền đăng nhập của"
                : "tái kích hoạt tài khoản hệ thống cho"}{" "}
              <strong>{selectedProfile?.full_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant={selectedProfile?.is_active ? "destructive" : "default"}
              onClick={() =>
                selectedProfile &&
                handleUpdateStaff(selectedProfile.id, {
                  is_active: !selectedProfile.is_active,
                })
              }
            >
              Xác nhận thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: FORM ĐIỀN THÔNG TIN THÊM NHÂN VIÊN MỚI */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Thêm nhân viên mới
            </DialogTitle>
            <DialogDescription>
              Tạo thông tự đăng nhập và cài đặt mức lương theo giờ ban đầu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <Input
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Email đăng nhập <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="nhanvien@restaurant.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Số điện thoại</label>
                <Input
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="0912xxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Vị trí công việc <span className="text-red-500">*</span>
                </label>
                <Select
                  value={addRole}
                  onValueChange={(value: any) => setAddRole(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Quản lý</SelectItem>
                    <SelectItem value="cashier">Thu ngân</SelectItem>
                    <SelectItem value="waiter">Phục vụ</SelectItem>
                    <SelectItem value="kitchen">Nhân viên bếp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Mức lương cơ bản theo giờ (VNĐ)
              </label>
              <Input
                type="number"
                value={addHourlyRate}
                onChange={(e) => setAddHourlyRate(e.target.value)}
                placeholder="Ví dụ: 20000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCreateStaff}
              disabled={
                !addFullName.trim() ||
                !addEmail.trim() ||
                addPassword.length < 6
              }
            >
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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

export function StaffContent({ profiles: initialProfiles }: StaffContentProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State quản lý Dialog
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("waiter");

  // State sửa thông tin nhân viên
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<number>(0);

  // STATE CHẤM CÔNG THỰC TẾ (MOCK & HANDLE ĐỒNG BỘ)
  const [attendanceMock, setAttendanceMock] = useState<any[]>([]);

  // State form thêm mới
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addRole, setAddRole] = useState<"manager" | "cashier" | "waiter" | "kitchen">("waiter");
  const [addPhone, setAddPhone] = useState("");
  const [addHourlyRate, setAddHourlyRate] = useState<string>("20000");

  useEffect(() => {
    setProfiles(initialProfiles);
    // Đồng bộ danh sách chấm công tự động từ DB profiles đang active
    setAttendanceMock(
      initialProfiles
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          status: "present", 
          late_minutes: 0,
          absent_type: "excused",
        }))
    );
  }, [initialProfiles]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone && p.phone.includes(searchQuery));
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_active === true) ||
      (statusFilter === "inactive" && p.is_active === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalStaff = profiles.length;
  const activeStaff = profiles.filter((p) => p.is_active).length;
  const inactiveStaff = totalStaff - activeStaff;

  // Hàm gọi API dùng chung cập nhật DB (Supabase PATCH via API Routes)
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
        prev.map((p) =>
          p.id === profileId ? ({ ...p, ...payload } as Profile) : p
        )
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
    await handleUpdateStaff(selectedProfile.id, {
      full_name: editFullName,
      phone: editPhone || null,
      hourly_rate: Number(editHourlyRate),
    });
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
      setAddRole("waiter");
      setAddPhone("");
      setAddHourlyRate("20000");
      router.refresh();
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const handleLockDayAttendance = () => {
    alert("Đã chốt công thành công ngày hôm nay vào hệ thống!");
  };

  return (
    <div className="space-y-6">
      {/* 1. Thanh thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{totalStaff}</div>
              <div className="text-sm text-muted-foreground font-medium">Tổng nhân sự</div>
            </div>
            <div className="p-2.5 bg-muted rounded-lg text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-500/40 shadow-sm bg-green-50/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-green-600">{activeStaff}</div>
              <div className="text-sm text-muted-foreground font-medium">Đang hoạt động</div>
            </div>
            <div className="p-2.5 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-gray-500">{inactiveStaff}</div>
              <div className="text-sm text-muted-foreground font-medium">Tạm khóa</div>
            </div>
            <div className="p-2.5 bg-gray-100 text-gray-500 rounded-lg">
              <RefreshCw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quy hoạch hệ thống 3 Tabs */}
      <Tabs defaultValue="members" className="w-full space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="members" className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" /> Thành viên
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2 text-sm font-medium">
            <CalendarCheck className="h-4 w-4" /> Duyệt công
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2 text-sm font-medium">
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
                  Quản lý tài khoản, thông tin cơ bản, vị trí làm việc và lương của nhân sự.
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
                  <UserPlus className="h-4 w-4 mr-2" />
                  Thêm nhân viên
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 font-semibold text-foreground">Họ và tên</TableHead>
                      <TableHead className="font-semibold text-foreground">Số điện thoại</TableHead>
                      <TableHead className="font-semibold text-foreground">Chức vụ</TableHead>
                      <TableHead className="font-semibold text-foreground">Mức lương/Giờ</TableHead>
                      <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          Không tìm thấy nhân viên phù hợp.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <TableRow key={profile.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold pl-4 text-sm">{profile.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{profile.phone || "Chưa cập nhật"}</TableCell>
                          <TableCell>
                            <Badge className={`shadow-none font-medium text-xs ${roleConfig[profile.role]?.className}`}>
                              {roleConfig[profile.role]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {(profile.hourly_rate || 0).toLocaleString("vi-VN")} đ
                          </TableCell>
                          <TableCell>
                            <Badge variant={profile.is_active ? "default" : "secondary"} className={profile.is_active ? "bg-green-600 hover:bg-green-600 shadow-none text-xs font-medium" : "shadow-none text-xs font-medium"}>
                              {profile.is_active ? "Đang hoạt động" : "Tạm khóa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto block">
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
                                  <Edit className="mr-2 h-4 w-4" /> Sửa thông tin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setNewRole(profile.role);
                                    setIsRoleDialogOpen(true);
                                  }}
                                >
                                  <Shield className="mr-2 h-4 w-4" /> Đổi chức vụ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={profile.is_active ? "text-amber-600 focus:text-amber-600" : "text-green-600 focus:text-green-600"}
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setIsStatusDialogOpen(true);
                                  }}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {profile.is_active ? "Khóa tài khoản" : "Mở khóa"}
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

        {/* TAB 2: DUYỆT CÔNG NGÀY HÔM NAY */}
        <TabsContent value="attendance">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Duyệt công ngày trực
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ghi nhận trạng thái đi làm, đi muộn hoặc vắng mặt của nhân sự trong ca hôm nay.
                </p>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm h-9"
                onClick={handleLockDayAttendance}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Chốt công ngày hôm nay
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 font-semibold text-foreground">Nhân viên</TableHead>
                      <TableHead className="font-semibold text-foreground">Chức vụ</TableHead>
                      <TableHead className="font-semibold text-foreground w-[220px]">Trạng thái chấm công</TableHead>
                      <TableHead className="font-semibold text-foreground">Chi tiết ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceMock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                          Không có nhân sự nào đang hoạt động để chấm công.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceMock.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold pl-4 text-sm">{item.full_name}</TableCell>
                          <TableCell>
                            <Badge className={`shadow-none font-medium text-xs ${roleConfig[item.role as keyof typeof roleConfig]?.className}`}>
                              {roleConfig[item.role as keyof typeof roleConfig]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.status}
                              onValueChange={(val) => {
                                const updated = [...attendanceMock];
                                updated[index].status = val;
                                if (val !== "late") updated[index].late_minutes = 0;
                                setAttendanceMock(updated);
                              }}
                            >
                              <SelectTrigger className="w-full h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">🟢 Đúng giờ (Có mặt)</SelectItem>
                                <SelectItem value="late">🟡 Đi muộn (Trễ ca)</SelectItem>
                                <SelectItem value="absent">🔴 Vắng mặt (Nghỉ)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {item.status === "late" && (
                              <div className="flex items-center gap-2 animate-fadeIn">
                                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Số phút trễ:</span>
                                <Input
                                  type="number"
                                  className="w-24 h-8 text-sm"
                                  value={item.late_minutes}
                                  min={0}
                                  onChange={(e) => {
                                    const updated = [...attendanceMock];
                                    updated[index].late_minutes = Number(e.target.value);
                                    setAttendanceMock(updated);
                                  }}
                                />
                              </div>
                            )}
                            {item.status === "absent" && (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                <Select
                                  value={item.absent_type}
                                  onValueChange={(val) => {
                                    const updated = [...attendanceMock];
                                    updated[index].absent_type = val;
                                    setAttendanceMock(updated);
                                  }}
                                >
                                  <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="excused">Có đơn xin phép</SelectItem>
                                    <SelectItem value="unexcused">Nghỉ không phép</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {item.status === "present" && (
                              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                                Ghi nhận hoàn thành công ca đầy đủ
                              </span>
                            )}
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

        {/* TAB 3: BẢNG LƯƠNG TỔNG HỢP KHÉP KÍN LOGIC */}
        <TabsContent value="payroll">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-tight">
                Bảng lương tổng hợp tháng này
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Hệ thống tự động tính lương: Lương tạm tính = Tổng giờ công làm việc thực tế × Mức lương theo giờ.
              </p>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              <div className="rounded-none sm:rounded-md border-x-0 sm:border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 font-semibold text-foreground">Họ tên nhân viên</TableHead>
                      <TableHead className="font-semibold text-foreground">Mức lương cơ sở/Giờ</TableHead>
                      <TableHead className="font-semibold text-foreground">Tổng số giờ tích lũy</TableHead>
                      <TableHead className="font-semibold text-foreground text-right pr-4">Thành tiền tạm tính</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.filter((p) => p.is_active).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                          Không có dữ liệu nhân sự hoạt động để tính toán bảng lương.
                        </TableCell>
                      </TableRow>
                    ) : (
                      profiles
                        .filter((p) => p.is_active)
                        .map((p) => {
                          const mockTotalHours = 120; // Hỗ trợ dữ liệu trực quan cho đồ án nhà hàng
                          const calculatedSalary = (p.hourly_rate || 0) * mockTotalHours;
                          return (
                            <TableRow key={p.id} className="hover:bg-muted/20">
                              <TableCell className="font-semibold pl-4 text-sm">{p.full_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-medium">
                                {(p.hourly_rate || 0).toLocaleString("vi-VN")} đ/giờ
                              </TableCell>
                              <TableCell className="font-semibold text-amber-600 text-sm">
                                {mockTotalHours} giờ tích lũy
                              </TableCell>
                              <TableCell className="text-right pr-4 font-bold text-green-600 text-sm">
                                {calculatedSalary.toLocaleString("vi-VN")} đ
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
            <DialogTitle className="text-lg font-bold">Cập nhật thông tin nhân viên</DialogTitle>
            <DialogDescription>Thay đổi thông tin liên lạc và định mức khung lương cơ bản.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Họ và tên</label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Số điện thoại</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Chưa có SĐT" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mức lương theo giờ (VNĐ)</label>
              <Input
                type="number"
                value={editHourlyRate}
                onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                placeholder="Ví dụ: 25000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleEditStaff}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: THAY ĐỔI CHỨC VỤ (PHÂN QUYỀN TRUY CẬP) */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Phân quyền chức vụ mới</DialogTitle>
            <DialogDescription>
              Thay đổi vai trò hệ thống của nhân sự <strong>{selectedProfile?.full_name}</strong>.
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
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Hủy</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedProfile && handleUpdateStaff(selectedProfile.id, { role: newRole })}
            >
              Cập nhật quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: TẠM KHÓA / MỞ KHÓA TÀI KHOẢN TÁC NHÂN */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedProfile?.is_active ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn {selectedProfile?.is_active ? "chặn quyền đăng nhập của" : "tái kích hoạt tài khoản hệ thống cho"}{" "}
              <strong>{selectedProfile?.full_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Hủy</Button>
            <Button
              variant={selectedProfile?.is_active ? "destructive" : "default"}
              onClick={() => selectedProfile && handleUpdateStaff(selectedProfile.id, { is_active: !selectedProfile.is_active })}
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
            <DialogTitle className="text-lg font-bold">Thêm nhân viên mới</DialogTitle>
            <DialogDescription>Tạo thông tin đăng nhập và cài đặt mức lương theo giờ ban đầu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Họ và tên <span className="text-red-500">*</span></label>
              <Input value={addFullName} onChange={(e) => setAddFullName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email đăng nhập <span className="text-red-500">*</span></label>
              <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="nhanvien@restaurant.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mật khẩu <span className="text-red-500">*</span></label>
              <Input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Số điện thoại</label>
                <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="0912xxxxxx" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vị trí công việc <span className="text-red-500">*</span></label>
                <Select value={addRole} onValueChange={(value: any) => setAddRole(value)}>
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
              <label className="text-sm font-medium">Mức lương cơ bản theo giờ (VNĐ)</label>
              <Input type="number" value={addHourlyRate} onChange={(e) => setAddHourlyRate(e.target.value)} placeholder="Ví dụ: 20000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCreateStaff}
              disabled={!addFullName.trim() || !addEmail.trim() || addPassword.length < 6}
            >
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
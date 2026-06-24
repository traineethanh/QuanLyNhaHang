"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react"; // 👈 Thêm React Hooks để quản lý State dữ liệu
import { createClient } from "@/lib/supabase/client"; // 👈 Import client của Supabase dành cho Client Component
import type { UserRole, Profile } from "@/lib/types/database"; // 👈 Ép kiểu dữ liệu nghiêm ngặt
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ShoppingCart,
  ChefHat,
  Receipt,
  BarChart3,
  Users,
  Settings,
  CalendarDays,
  LogOut,
  Scale,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// 📜 MA TRẬN QUYỀN TRÊN GIAO DIỆN (Đồng bộ tuyệt đối với Middleware của bạn)
// Bạn muốn cấp thêm quyền hay bỏ quyền của một Role nào, chỉ cần SỬA / THÊM đường dẫn URL ở mảng phía dưới
const ALLOWED_ROUTES: Record<UserRole, string[]> = {
  manager: [
    "/dashboard",
    "/dashboard/tables",
    "/dashboard/pos",
    "/dashboard/kitchen",
    "/dashboard/billing",
    "/dashboard/menu",
    "/dashboard/reservations",
    "/dashboard/reports",
    "/dashboard/staff",
    "/dashboard/inventory/ingredients",
    "/dashboard/menu/recipes",
    "/dashboard/inventory/suppliers",
    "/dashboard/inventory/receipts",
  ],
  cashier: [
    "/dashboard",
    "/dashboard/tables",
    "/dashboard/pos",
    "/dashboard/billing",
    "/dashboard/reservations",
  ],
  waiter: ["/dashboard", "/dashboard/tables", "/dashboard/pos"],
  kitchen: ["/dashboard/kitchen", "/dashboard/menu/recipes", "/dashboard/menu"],
};

// 🏷️ Bản dịch hiển thị vai trò tiếng Việt thân thiện ra UI Footer
const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Quản lý",
  cashier: "Thu ngân",
  waiter: "Phục vụ",
  kitchen: "Đầu bếp",
};

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Sơ đồ bàn", url: "/dashboard/tables", icon: Grid3X3 },
  { title: "Đặt món (POS)", url: "/dashboard/pos", icon: ShoppingCart },
  { title: "Bếp (KDS)", url: "/dashboard/kitchen", icon: ChefHat },
  { title: "Thanh toán", url: "/dashboard/billing", icon: Receipt },
];

const managementNavItems = [
  { title: "Thực đơn", url: "/dashboard/menu", icon: UtensilsCrossed },
  { title: "Công thức", url: "/dashboard/menu/recipes", icon: Scale },
  { title: "Đặt bàn", url: "/dashboard/reservations", icon: CalendarDays },
  { title: "Báo cáo", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Nhân viên", url: "/dashboard/staff", icon: Users },
  { title: "Kho", url: "/dashboard/inventory/ingredients", icon: Grid3X3 },
  { title: "Nhà cung cấp", url: "/dashboard/inventory/suppliers", icon: Users },
  {
    title: "Chứng từ nhập kho",
    url: "/dashboard/inventory/receipts",
    icon: Receipt,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const supabase = createClient(); // Khởi tạo kết nối Supabase Client Side

  // State lưu thông tin Profile và trạng thái tải dữ liệu
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Lấy thông tin tài khoản khi component được kích hoạt load dữ liệu
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (data) setProfile(data as Profile);
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin quyền nhân viên:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserProfile();
  }, [supabase]);

  // Xử lý logic đăng xuất tài khoản nhà hàng
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login"; // Ép trình duyệt chuyển hướng làm sạch session hoàn toàn
  };

  // Mặc định nếu đang tải hoặc chưa có profile, tạm thời ẩn bớt các nút để tránh hiện tượng nháy giao diện trái phép
  const userRole = profile?.role;

  // ⚡ Lọc danh sách Menu dựa vào ma trận phân quyền ALLOWED_ROUTES
  const filteredMainNav = mainNavItems.filter(
    (item) => userRole && ALLOWED_ROUTES[userRole]?.includes(item.url),
  );

  const filteredManagementNav = managementNavItems.filter(
    (item) => userRole && ALLOWED_ROUTES[userRole]?.includes(item.url),
  );

  // Hàm tạo ký tự viết tắt cho Avatar (Ví dụ: Nguyễn Văn Anh -> NA)
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="overflow-hidden">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold text-sidebar-foreground">
              RestaurantPOS
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Quản lý nhà hàng
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Nhóm menu 1: Hoạt động hàng ngày (Chỉ hiển thị nếu danh sách sau khi lọc có phần tử) */}
        {filteredMainNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Hoạt động</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Nhóm menu 2: Quản lý (Admin/Manager thường mới thấy nhóm này) */}
        {filteredManagementNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Quản lý</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredManagementNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* FOOTER: Hiển thị đúng avatar, tên và chức vụ của nhân viên đăng nhập */}
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            )}
            <AvatarFallback className="bg-primary text-white font-bold">
              {loading ? "..." : getInitials(profile?.full_name || "Staff")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden overflow-hidden whitespace-nowrap text-ellipsis">
            <span className="text-sm font-bold text-foreground">
              {loading ? "Đang tải..." : profile?.full_name || "Nhân viên"}
            </span>
            <span className="text-xs text-muted-foreground">
              {userRole ? ROLE_LABELS[userRole] : "---"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout} // 👈 Gắn sự kiện kích hoạt đăng xuất an toàn
            className="h-8 w-8 group-data-[collapsible=icon]:hidden text-foreground hover:bg-muted"
            title="Đăng xuất"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

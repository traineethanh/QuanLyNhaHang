"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 shadow-sm">
      {/* Nút mở/đóng sidebar ở chế độ mobile */}
      <SidebarTrigger className="-ml-2" />

      {title && (
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Giao diện quản lý nhà hàng trực quan
          </p>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Menu đổi theme: sáng/tối/hệ thống */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Chuyển đổi giao diện"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Sáng
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Tối
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              Hệ thống
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hiển thị thời gian hiện tại theo định dạng Việt Nam */}
        <div className="hidden md:flex flex-col items-end text-sm">
          <span className="font-medium">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long" })}
          </span>
          <span className="text-muted-foreground">
            {new Date().toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>
    </header>
  );
}

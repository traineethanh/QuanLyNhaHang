"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderPlus,
  Package,
  Folder,
  Scale,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Định nghĩa cấu trúc dữ liệu từ Database
interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Warehouse {
  id: string;
  name: string;
}

interface InventoryBatch {
  id: string;
  batch_code: string | null;
  received_at: string | null;
  current_quantity: number;
  expiry_date: string | null;
}

interface Ingredient {
  id: string;
  code: string | null;
  name: string;
  base_uom: string;
  min_stock_level: number | null;
  category_id: string | null;
  ingredient_categories: { name: string } | null;
  // Dữ liệu mở rộng phục vụ hiển thị tồn kho đa kho và quản lý lô hàng
  total_inventory?: number;
  warehouse_id?: string | null;
  inventory_batches?: InventoryBatch[];
}

export function IngredientsContent({
  initialCategories,
  initialIngredients,
  warehouses = [], // Nhận danh sách kho từ Server Component truyền xuống
}: {
  initialCategories: Category[];
  initialIngredients: Ingredient[];
  warehouses?: Warehouse[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);

  useEffect(() => {
    setIngredients(initialIngredients);
  }, [initialIngredients]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  // Bộ lọc thông minh hàng đầu
  const [searchQuery, setSearchQuery] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState<
    "all" | "safe" | "low"
  >("all");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  // State kiểm soát dòng mở rộng hiển thị Lô hàng (Lưu danh sách ID nguyên liệu đang mở)
  const [expandedIngIds, setExpandedIngIds] = useState<Record<string, boolean>>(
    {},
  );

  // State điều khiển các khung Dialog tạo mới dữ liệu nền
  const [newCatName, setNewCatName] = useState("");
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isIngOpen, setIsIngOpen] = useState(false);
  const [newIng, setNewIng] = useState({
    code: "",
    name: "",
    base_uom: "",
    min_stock_level: "0",
    category_id: "",
    warehouse_id: "", // Bổ sung kho lưu trữ ban đầu khi khởi tạo vật tư
  });

  // State điều khiển chức năng Quy đổi đơn vị tính (UoM)
  const [isUomOpen, setIsUomOpen] = useState(false);
  const [activeIng, setActiveIng] = useState<Ingredient | null>(null);
  const [uomForm, setUomForm] = useState({
    alternative_uom: "",
    conversion_factor: "",
  });

  // Hàm đảo ngược trạng thái đóng/mở xem lô hàng của một vật tư
  const toggleExpandIngredient = (id: string) => {
    setExpandedIngIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Hàm format số lượng thông minh tự động quy đổi gram sang kg và đồng nhất nhãn hiển thị
  const formatQuantity = (amount: number, unit: string) => {
    const lowerUnit = unit.toLowerCase().trim();

    // Nếu đơn vị lưu kho gốc là gram (g hoặc gram)
    if (lowerUnit === "g" || lowerUnit === "gram") {
      // Tự động chuyển đổi sang kg nếu lượng định biên lớn hoặc khi lượng tồn bằng 0 để đồng nhất cột
      const kgValue = amount / 1000;
      return `${Number(kgValue.toFixed(2))} kg`;
    }

    return `${amount} ${unit}`;
  };

  // Hành động: Thêm nhanh nhóm nguyên liệu mới
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ingredient_categories")
      .insert([{ name: newCatName.trim() }])
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data]);
      setNewCatName("");
      setIsCatOpen(false);
      router.refresh();
    }
  };

  // Hành động: Thêm nguyên liệu gốc mới (Tích hợp thêm trường warehouse_id)
  const handleAddIngredient = async () => {
    if (!newIng.name.trim() || !newIng.base_uom.trim() || !newIng.category_id)
      return;

    try {
      const response = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newIng.code.trim() || null,
          name: newIng.name.trim(),
          base_uom: newIng.base_uom.trim(),
          min_stock_level: Number(newIng.min_stock_level) || 0,
          category_id: newIng.category_id,
          warehouse_id: newIng.warehouse_id || null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const selectedCategory = categories.find(
          (c) => c.id === newIng.category_id,
        );

        const newIngredientRecord: Ingredient = {
          id: result.data.id,
          code: result.data.code,
          name: result.data.name,
          base_uom: result.data.base_uom,
          min_stock_level: result.data.min_stock_level,
          category_id: result.data.category_id,
          warehouse_id: result.data.warehouse_id,
          total_inventory: 0, // Mặc định hàng mới tạo kho rỗng
          inventory_batches: [],
          ingredient_categories: selectedCategory
            ? { name: selectedCategory.name }
            : null,
        };

        setIngredients((prev) => [...prev, newIngredientRecord]);
        setNewIng({
          code: "",
          name: "",
          base_uom: "",
          min_stock_level: "0",
          category_id: "",
          warehouse_id: "",
        });
        setIsIngOpen(false);
        router.refresh();
      } else {
        alert(`Lỗi: ${result.error || "Không thể tạo nguyên liệu."}`);
      }
    } catch (error) {
      console.error("Lỗi kết nối API nguyên liệu:", error);
      alert("Không thể kết nối tới máy chủ API.");
    }
  };

  // Hành động: Ghi nhận Quy đổi đơn vị tính (UoM) vào database
  const handleSaveUomConversion = async () => {
    if (
      !activeIng ||
      !uomForm.alternative_uom.trim() ||
      !uomForm.conversion_factor
    )
      return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error } = await supabase.from("uom_conversions").insert([
      {
        ingredient_id: activeIng.id,
        alternative_uom: uomForm.alternative_uom.trim(),
        conversion_factor: Number(uomForm.conversion_factor),
      },
    ]);

    if (!error) {
      alert(
        `Đã cấu hình: 1 ${uomForm.alternative_uom} = ${uomForm.conversion_factor} ${activeIng.base_uom}`,
      );
      setUomForm({ alternative_uom: "", conversion_factor: "" });
      setIsUomOpen(false);
      router.refresh();
    } else {
      alert(
        "Lỗi: Đơn vị quy đổi này đã tồn tại hoặc dữ liệu nhập không hợp lệ.",
      );
    }
  };

  // Engine xử lý bộ lọc thông minh kết hợp đa điều kiện bằng useMemo
  const filteredIngredients = useMemo(() => {
    return ingredients
      .map((ing) => {
        // Nếu chọn "Tất cả kho", giữ nguyên tổng tồn kho hệ thống và mảng lô hàng gốc
        if (selectedWarehouseId === "all") {
          return ing;
        }

        // Nếu chọn một kho cụ thể: Bóc tách lại lô và tổng lượng tồn của riêng kho đó
        const rawBatches = ing.inventory_batches || [];
        const filteredBatches = rawBatches.filter(
          (b: any) => b.warehouse_id === selectedWarehouseId,
        );

        const calculatedStock = filteredBatches.reduce(
          (sum, b) => sum + (Number(b.current_quantity) || 0),
          0,
        );

        return {
          ...ing,
          total_inventory: calculatedStock,
          inventory_batches: filteredBatches,
        };
      })
      .filter((ing) => {
        // 1. Kiểm tra bộ lọc Phân nhóm vật tư ở cột trái
        if (selectedCatId !== "all" && ing.category_id !== selectedCatId) {
          return false;
        }

        // 2. Kiểm tra bộ lọc tìm kiếm văn bản (Không phân biệt hoa thường)
        const matchesSearch =
          ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ing.code &&
            ing.code.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;

        // 3. Kiểm tra bộ lọc trạng thái tồn kho (Cảnh báo thông minh theo hạn mức)
        const currentStock = ing.total_inventory || 0;
        const minStock = ing.min_stock_level || 0;
        const isLowStock = currentStock <= minStock;

        if (stockStatusFilter === "low" && !isLowStock) return false;
        if (stockStatusFilter === "safe" && isLowStock) return false;

        return true;
      });
  }, [
    ingredients,
    selectedCatId,
    selectedWarehouseId,
    searchQuery,
    stockStatusFilter,
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* CỘT TRÁI: DANH SÁCH PHÂN NHÓM NỀN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5" /> Phân nhóm
          </h3>

          <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-7 w-7">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Thêm nhóm nguyên liệu mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Ví dụ: Thịt tươi, Rau củ, Gia vị..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <Button className="w-full" onClick={handleAddCategory}>
                  Lưu nhóm mới
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-1">
          <Button
            variant={selectedCatId === "all" ? "default" : "ghost"}
            className="justify-start font-medium text-left h-10"
            onClick={() => setSelectedCatId("all")}
          >
            📊 Tất cả vật tư ({ingredients.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCatId === cat.id ? "default" : "ghost"}
              className="justify-start font-medium text-left h-10"
              onClick={() => setSelectedCatId(cat.id)}
            >
              📦 {cat.name} (
              {ingredients.filter((i) => i.category_id === cat.id).length})
            </Button>
          ))}
        </div>
      </div>

      {/* KHU VỰC PHẢI: BẢNG VẬT TƯ & CÁC BỘ LỌC THÔNG MINH */}
      <div className="md:col-span-3 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-semibold tracking-tight">
            {selectedCatId === "all"
              ? "Chi tiết tất cả vật tư"
              : categories.find((c) => c.id === selectedCatId)?.name}
          </h3>

          <Dialog open={isIngOpen} onOpenChange={setIsIngOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Khai báo vật tư mới
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[425px]"
              aria-describedby={undefined}
            >
              <DialogHeader>
                <DialogTitle>Thêm nguyên liệu gốc</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">
                      Mã NL (Tùy chọn)
                    </label>
                    <Input
                      placeholder="Ví dụ: NL001"
                      value={newIng.code}
                      onChange={(e) =>
                        setNewIng({ ...newIng, code: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Tên vật tư</label>
                    <Input
                      placeholder="Ví dụ: Thịt bò phi lê"
                      value={newIng.name}
                      onChange={(e) =>
                        setNewIng({ ...newIng, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">
                      Thuộc nhóm phân loại
                    </label>
                    <Select
                      value={newIng.category_id}
                      onValueChange={(value) =>
                        setNewIng({ ...newIng, category_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhóm" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">
                      Kho lưu trữ gốc
                    </label>
                    <Select
                      value={newIng.warehouse_id}
                      onValueChange={(value) =>
                        setNewIng({ ...newIng, warehouse_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn kho" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">
                      Đơn vị lưu kho gốc
                    </label>
                    <Input
                      placeholder="g, ml, lon, cái..."
                      value={newIng.base_uom}
                      onChange={(e) =>
                        setNewIng({ ...newIng, base_uom: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">
                      Hạn mức báo động
                    </label>
                    <Input
                      type="number"
                      value={newIng.min_stock_level}
                      onChange={(e) =>
                        setNewIng({
                          ...newIng,
                          min_stock_level: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button className="w-full mt-2" onClick={handleAddIngredient}>
                  Khởi tạo vật tư
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cụm bộ lọc thông minh hàng đầu mới bổ sung */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-xl border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm nhanh tên hoặc mã vật tư..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={selectedWarehouseId}
            onValueChange={setSelectedWarehouseId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Lọc theo kho chứa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏢 Tất cả hệ thống kho</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  📍 {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={stockStatusFilter}
            onValueChange={(value: "all" | "safe" | "low") =>
              setStockStatusFilter(value)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tình trạng tồn kho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Tất cả trạng thái</SelectItem>
              <SelectItem value="safe">✅ Tồn kho an toàn</SelectItem>
              <SelectItem value="low">
                ⚠️ Sắp hết hàng (Dưới hạn mức)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="px-4 py-3.5 w-[50px]"></th>
                  <th className="px-4 py-3.5">Mã vật tư</th>
                  <th className="px-4 py-3.5">Tên nguyên liệu</th>
                  <th className="px-4 py-3.5">Nhóm phân loại</th>
                  <th className="px-4 py-3.5 text-right">Tồn kho thực tế</th>
                  <th className="px-4 py-3.5 text-right">Mức báo động</th>
                  <th className="px-4 py-3.5 text-center">Quy đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredIngredients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Không tìm thấy bản ghi nguyên liệu nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredIngredients.map((ing) => {
                    const currentStock = ing.total_inventory || 0;
                    const minStock = ing.min_stock_level || 0;

                    // 🧠 LOGIC TOÁN HỌC MỚI: Đảo ngược màu sắc báo động chuẩn kế toán kho
                    const isOutOfStock = currentStock === 0; // Hết sạch hàng
                    const isLowStock =
                      currentStock > 0 && currentStock <= minStock; // Dưới mức định biên

                    const isExpanded = !!expandedIngIds[ing.id];

                    // Tính tỷ lệ phần trăm tiến độ tồn kho so với hạn mức tối thiểu phục vụ Progress Bar
                    const progressPercentage =
                      minStock > 0
                        ? Math.min(100, (currentStock / minStock) * 100)
                        : 100;

                    return (
                      <Fragment key={ing.id}>
                        <tr
                          className={`transition-colors border-b ${
                            isOutOfStock
                              ? "bg-rose-50/50 dark:bg-rose-950/10 hover:bg-rose-100/50 text-rose-900 dark:text-rose-200" // Hết hàng -> Màu đỏ chót đi mua gấp
                              : isLowStock
                                ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 text-amber-900 dark:text-amber-200" // Sắp hết -> Màu vàng hổ phách lên đơn nhập
                                : "hover:bg-muted/40" // Đầy kho an toàn -> Màu trắng sạch sẽ tinh tế
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => toggleExpandIngredient(ing.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {ing.code || "---"}
                          </td>
                          <td
                            className="px-4 py-3.5 font-medium cursor-pointer hover:underline"
                            onClick={() => toggleExpandIngredient(ing.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span>{ing.name}</span>

                              {/* ➔ UX THỰC CHIẾN: Phân tách rõ rệt 2 cấp độ cảnh báo của nhà hàng */}
                              {isOutOfStock ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                  ⚠️ HẾT HÀNG
                                </span>
                              ) : isLowStock ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                  ⏳ SẮP HẾT
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-semibold w-max whitespace-nowrap">
                              {ing.ingredient_categories?.name || "Mặc định"}
                            </span>
                          </td>
                          {/* Cột số lượng tồn kho thực tế */}
                          <td
                            className={`px-4 py-3.5 text-right font-black text-sm ${isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-primary"}`}
                          >
                            {formatQuantity(currentStock, ing.base_uom)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">
                            <div className="flex flex-col items-end gap-1">
                              <span>
                                {formatQuantity(minStock, ing.base_uom)}
                              </span>
                              {/* ➔ UI CẢI TIẾN: Bổ sung thanh Progress Bar trực quan lướt nhanh 5 giây */}
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden border">
                                <div
                                  className={`h-full transition-all ${isOutOfStock ? "w-0" : isLowStock ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {/* ➔ UX THỰC CHIẾN: Đổi tên nút từ "Cấu hình" mang tính IT sang chữ "Cập nhật" chuyên ngành kho */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 gap-1 text-xs font-bold shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveIng(ing);
                                setIsUomOpen(true);
                              }}
                            >
                              <Scale className="h-3 w-3" /> Cập nhật
                            </Button>
                          </td>
                        </tr>

                        {/* VÙNG COLLAPSE HÀNG: CHI TIẾT CÁC LÔ HÀNG LƯU KHO */}
                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td
                              colSpan={7}
                              className="p-4 border-l-2 border-primary"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  <Layers className="h-3.5 w-3.5 text-primary" />{" "}
                                  Chi tiết các lô hàng khả dụng
                                </div>

                                {/* ➔ UX THỰC CHIẾN: Chỉ lọc ra các lô hàng còn số lượng thực tế (> 0), ẩn biến mất các lô rác rỗng */}
                                {!ing.inventory_batches ||
                                ing.inventory_batches.filter(
                                  (b) => Number(b.current_quantity) > 0,
                                ).length === 0 ? (
                                  <p className="text-xs text-muted-foreground pl-5 py-2 italic">
                                    Hiện không có lô hàng nào còn hàng khả dụng
                                    trong kho.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 pl-5">
                                    {ing.inventory_batches
                                      .filter(
                                        (batch) =>
                                          Number(batch.current_quantity) > 0,
                                      ) // Lọc sạch lô rác
                                      .map((batch) => {
                                        const isExpired = batch.expiry_date
                                          ? new Date(batch.expiry_date) <
                                            new Date()
                                          : false;
                                        return (
                                          <div
                                            key={batch.id}
                                            className={`p-3 rounded-lg border text-xs space-y-1 bg-background ${isExpired ? "border-destructive bg-destructive/5" : ""}`}
                                          >
                                            <div className="flex justify-between items-center border-b pb-1 mb-1.5">
                                              <span className="font-mono font-bold text-primary">
                                                Lô: {batch.batch_code || "K/M"}
                                              </span>
                                              {isExpired && (
                                                <span className="text-[10px] text-destructive font-black uppercase tracking-wider animate-pulse">
                                                  Hết hạn
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">
                                                Số lượng tồn:
                                              </span>
                                              <span className="font-black text-foreground">
                                                {formatQuantity(
                                                  batch.current_quantity,
                                                  ing.base_uom,
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />{" "}
                                                Hạn dùng:
                                              </span>
                                              <span
                                                className={`font-semibold ${isExpired ? "text-destructive line-through" : "text-foreground"}`}
                                              >
                                                {batch.expiry_date
                                                  ? new Date(
                                                      batch.expiry_date,
                                                    ).toLocaleDateString(
                                                      "vi-VN",
                                                    )
                                                  : "Vô thời hạn"}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG THIẾT LẬP QUY ĐỔI ĐƠN VỊ TÍNH (UoM) */}
      <Dialog open={isUomOpen} onOpenChange={setIsUomOpen}>
        <DialogContent
          className="sm:max-w-[400px]"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Quy đổi đơn vị: {activeIng?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Đơn vị quy đổi mới (Alternative UoM)
              </label>
              <Input
                placeholder="Ví dụ: Thùng, Két, Can, Kg..."
                value={uomForm.alternative_uom}
                onChange={(e) =>
                  setUomForm({ ...uomForm, alternative_uom: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">
                Tỷ lệ quy đổi sang đơn vị gốc ({activeIng?.base_uom})
              </label>
              <Input
                type="number"
                placeholder="Ví dụ: 1 Thùng = 24 Lon -> Điền 24"
                value={uomForm.conversion_factor}
                onChange={(e) =>
                  setUomForm({ ...uomForm, conversion_factor: e.target.value })
                }
              />
            </div>
            <div className="bg-muted p-3 rounded-lg border text-[11px] leading-relaxed text-muted-foreground font-medium">
              💡 <b>Ví dụ thực tế dễ hiểu:</b>
              <br />- Nếu nguyên liệu là <b>Bia lon</b> (gốc: lon), nhập đơn vị
              quy đổi là <b>Thùng</b> và tỷ lệ là <b>24</b>.
              <br />- Nếu nguyên liệu là <b>Thịt bò</b> (gốc: g), nhập đơn vị
              quy đổi là <b>Kg</b> và tỷ lệ là <b>1000</b>.
            </div>
            <Button className="w-full" onClick={handleSaveUomConversion}>
              Lưu thiết lập quy đổi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Database Types for Restaurant Management System

export type UserRole = "manager" | "cashier" | "waiter" | "kitchen";
export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";
export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";
export type PaymentMethod = "cash" | "card" | "transfer" | "qr";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface Profile {
  id: string; // uuid
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string; // timestamp with time zone (ISO 8601 string)
  updated_at: string; // timestamp with time zone
  hourly_rate: number; // numeric
}

export interface Shift {
  id: string; // uuid
  shift_name: string;
  start_time: string; // time without time zone
  end_time: string; // time without time zone
  total_hours: number; // numeric(4,2)
  created_at: string; // timestamp with time zone
}

export interface AttendanceLog {
  id: string; // uuid
  employee_id: string; // uuid (ref: profiles.id)
  shift_id: string; // uuid (ref: shifts.id)
  attendance_date: string; // date (YYYY-MM-DD)
  status: AttendanceStatus;
  late_minutes: number; // integer
  note: string | null;
  approved_by: string | null; // uuid (ref: profiles.id)
  is_locked: boolean;
  payment_status: "unpaid" | "paid"; // QUẢN LÝ QUYẾT TOÁN LƯƠNG
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

export interface RestaurantSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  tax_rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Table {
  id: string;
  area_id: string | null;
  name: string;
  capacity: number;
  status: TableStatus;
  position_x: number;
  position_y: number;
  is_active: boolean;
  created_at: string;
  area?: Area;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  preparation_time: number;
  created_at: string;
  updated_at: string;
  category?: MenuCategory;
}

export interface Order {
  id: string;
  order_number: number;
  table_id: string | null;
  waiter_id: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string | null;
  guest_count: number;
  is_takeaway: boolean;
  created_at: string;
  updated_at: string;
  table?: Table;
  waiter?: Profile;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderItemStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  menu_item?: MenuItem;
}

export interface Payment {
  id: string;
  order_id: string;
  cashier_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  received_amount: number;
  change_amount: number;
  note: string | null;
  created_at: string;
  cashier?: Profile;
  order?: Order;
}

export interface Reservation {
  id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  guest_count: number;
  reservation_time: string;
  note: string | null;
  status: string;
  created_at: string;
  table?: Table;
}

// Dashboard Stats
export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
  availableTables: number;
  reservedTables: number;
}
// ==========================================
// INVENTORY & INGREDIENT MANAGEMENT TYPES
// ==========================================

export interface IngredientCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Ingredient {
  id: string;
  category_id: string | null;
  code: string | null;
  name: string;
  base_uom: string;
  min_stock_level: number | null;
  created_at: string;
  category?: IngredientCategory; // Mối quan hệ liên kết danh mục nguyên liệu
}

export interface InventoryBatch {
  id: string;
  warehouse_id: string;
  ingredient_id: string;
  po_detail_id: string | null;
  batch_code: string;
  initial_quantity: number;
  current_quantity: number;
  cost_price: number;
  manufacture_date: string | null;
  expiry_date: string;
  received_at: string;
  ingredient?: Ingredient; // Mối quan hệ liên kết thông tin nguyên liệu của lô
}

export interface InventoryStock {
  id: string;
  warehouse_id: string;
  ingredient_id: string;
  total_inventory: number | null;
  updated_at: string;
  ingredient?: Ingredient; // Liên kết thông tin vật tư
}

export type InventoryTransactionType =
  | "input"
  | "output"
  | "audit_adjustment"
  | "transfer_in"
  | "transfer_out";

export interface InventoryTransaction {
  id: string;
  warehouse_id: string;
  ingredient_id: string;
  batch_id: string | null;
  transaction_type: InventoryTransactionType | string;
  reference_id: string | null;
  quantity: number;
  uom_used: string;
  created_by: string | null;
  created_at: string;
  ingredient?: Ingredient;
  batch?: InventoryBatch;
}

// ==========================================
// SUPPLIER & DEBT MANAGEMENT TYPES
// ==========================================

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_debt: number | null;
  is_active: boolean | null;
  created_at: string;
}

export type SupplierDebtTransactionType =
  | "purchase_invoice"
  | "payment"
  | "return_goods"
  | "adjustment";

export interface SupplierDebtLedger {
  id: string;
  supplier_id: string;
  transaction_type: SupplierDebtTransactionType | string;
  reference_id: string | null; // Thường lưu ID của Đơn mua hàng (purchase_order_id)
  amount: number;
  balance_after: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  supplier?: Supplier; // Mối quan hệ liên kết thông tin nhà cung cấp
}

// ==========================================
// PURCHASE ORDER & PROCUREMENT TYPES
// ==========================================

export type POPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type POStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED";

export interface PurchaseOrder {
  id: string;
  warehouse_id: string;
  supplier_id: string;
  po_number: string;
  total_amount: number | null;
  discount: number | null;
  final_amount: number | null;
  paid_amount: number | null;
  payment_status: POPaymentStatus | string | null;
  status: POStatus | string | null;
  note: string | null;
  created_by: string | null;
  approved_at: string | null;
  created_at: string;
  supplier?: Supplier; // Liên kết đối tác giao hàng
  // warehouse?: Warehouse // (Nhớ bổ sung interface Warehouse nếu có bảng warehouses riêng)
  details?: PurchaseOrderDetail[]; // Danh sách các dòng mặt hàng trong đơn
}

export interface PurchaseOrderDetail {
  id: string;
  purchase_order_id: string;
  ingredient_id: string;
  uom_used: string;
  quantity_uom: number;
  price_per_uom: number;
  base_quantity: number;
  base_price: number;
  total_price: number;
  ingredient?: Ingredient; // Liên kết thông tin nguyên liệu gốc (định dạng, mã code)
}

// ==========================================
// RECIPE & COSTING TYPES
// ==========================================

export interface Recipe {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_required: number; // Định mức tiêu hao khi làm 1 món (ví dụ: 0.1500 kg thịt bò)
  note: string | null;
  created_at: string;
  ingredient?: Ingredient; // Nguyên liệu dùng để chế biến
  menu_item?: MenuItem; // Món ăn trên thực đơn nhà hàng (liên kết với interface MenuItem cũ)
}

// ==========================================
// WAREHOUSE & STORAGE TYPES
// ==========================================

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean | null;
  created_at: string;
}

// ==========================================
// UNIT OF MEASURE CONVERSIONS TYPES
// ==========================================

export interface UOMConversion {
  id: string;
  ingredient_id: string;
  alternative_uom: string; // Đơn vị thay thế (Ví dụ: Thùng, Két, Lon, Chai)
  conversion_factor: number; // Hệ số quy đổi ra đơn vị cơ bản (Ví dụ: 1 Thùng = 24)
  ingredient?: Ingredient; // Mối quan hệ liên kết với nguyên liệu gốc
}

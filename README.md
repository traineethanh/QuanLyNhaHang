# 🍽️ RestaurantPOS — Phần mềm Quản lý Nhà hàng

> Đồ án môn **SE104 – Nhập môn Công nghệ Phần mềm**  
> Lớp **SE104.Q29** · Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM  
> Giảng viên hướng dẫn: **ThS. Đỗ Văn Tiến**

---

## 👥 Nhóm thực hiện

| Họ và tên | MSSV | Vai trò chính |
|---|---|---|
| Trần Quang Thành | 24521642 | Use Case, ERD, UI/UX, Frontend |
| Phạm Mạnh Luân | 24521029 | Backend chính, Login & Phân quyền |
| Nguyễn Hữu Trình | 24521859 | DFD, Frontend Real-time (KDS/Order) |
| Mai Trọng Tưởng | 24521955 | Frontend Dashboard & Biểu đồ |

---

## 📋 Giới thiệu

**RestaurantPOS** là ứng dụng web quản lý nhà hàng toàn diện, được xây dựng nhằm số hóa toàn bộ quy trình vận hành của nhà hàng quy mô vừa và nhỏ — từ gọi món, điều phối bếp, thanh toán đến báo cáo doanh thu.

### Vấn đề giải quyết

- **Sai sót nghiệp vụ** — Ghi order tay dễ nhầm món, tính sai hóa đơn
- **Độ trễ thông tin** — Phiếu giấy truyền xuống bếp chậm, món bị delay
- **Khó quản lý** — Thiếu dữ liệu tổng hợp real-time về doanh thu và kho

---

## ✨ Tính năng chính

### 🛒 Gọi món (POS)
- Tạo đơn tại bàn hoặc mang về
- Khách tự gọi món qua quét QR tại bàn
- Hỗ trợ size, topping, ghi chú đặc biệt
- Gửi đơn xuống bếp theo thời gian thực

### 👨‍🍳 Bếp — Kitchen Display System (KDS)
- Hiển thị hàng đợi món theo thứ tự FIFO
- Cập nhật trạng thái: Chờ → Đang làm → Xong
- Hỗ trợ nấu gộp (batch cooking)
- Cảnh báo món chờ quá lâu (overdue)

### 💳 Thanh toán
- Tổng hợp hóa đơn tự động theo bàn
- Thanh toán tiền mặt & QR VNPay (IPN webhook)
- Áp mã giảm giá / voucher / thẻ thành viên
- Tách hóa đơn, in bill chính thức

### 🗺️ Sơ đồ bàn
- Trạng thái bàn real-time (Trống / Có khách / Đặt trước / Dọn dẹp)
- Đổi bàn, ghép bàn với transaction an toàn
- Đặt bàn trước (reservation)

### 📦 Quản lý kho
- Nhập/xuất nguyên liệu, theo dõi tồn kho
- **Tự động trừ kho** khi thanh toán dựa theo bảng định lượng (recipe)
- Tính giá vốn COGS theo thuật toán FIFO
- Cảnh báo tồn kho dưới mức tối thiểu

### 🍽️ Quản lý thực đơn
- CRUD món ăn, phân nhóm danh mục
- Thiết lập định lượng công thức cho từng món
- Bật/tắt trạng thái món theo nguyên liệu thực tế

### 👥 Nhân sự & Chấm công
- Quản lý tài khoản, phân quyền RBAC (5 vai trò)
- Chấm công check-in/check-out theo ca
- Tính lương tự động theo giờ thực tế

### 📊 Báo cáo & Thống kê
- Doanh thu theo ngày / tuần / tháng / năm
- Báo cáo lãi lỗ (Revenue - COGS - Chi phí)
- Top món bán chạy, biểu đồ cơ cấu thanh toán
- Xuất file Excel / PDF

---

## 🔐 Phân quyền (RBAC)

| Vai trò | Mô tả | Phạm vi |
|---|---|---|
| `admin` / `manager` | Quản lý / Chủ nhà hàng | Toàn bộ hệ thống |
| `waiter` | Nhân viên phục vụ | Sơ đồ bàn, tạo/cập nhật đơn |
| `kitchen` | Nhân viên bếp | Màn hình KDS, cập nhật trạng thái |
| `cashier` | Thu ngân | Xem đơn, thanh toán, in hóa đơn |
| `customer` | Khách hàng | Xem menu, gọi món qua QR |

> **Bảo mật 2 lớp:** Next.js Middleware (Frontend) + Supabase Row-Level Security (Database)

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), React, TailwindCSS, shadcn/ui |
| Backend API | Next.js Route Handlers (Node.js) |
| Database | PostgreSQL (Supabase) — 24 bảng |
| Authentication | Supabase Auth (JWT) |
| Real-time | Supabase Realtime (WebSocket) |
| File Storage | Supabase Storage |
| Thanh toán | VNPay QR (IPN Webhook) |
| Deployment | Vercel (Frontend) + Supabase Cloud |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────┐
│              CLIENT (Trình duyệt)               │
│  Next.js 14 · React · TailwindCSS · shadcn/ui   │
└──────────────────┬──────────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼──────────────────────────────┐
│           BUSINESS LOGIC LAYER                  │
│     Next.js Route Handlers (REST API)           │
│   JWT Verify · RBAC Check · Validation          │
└──────────────────┬──────────────────────────────┘
                   │ Supabase Client SDK
┌──────────────────▼──────────────────────────────┐
│              DATA LAYER (Supabase)              │
│  PostgreSQL · Auth · Realtime · Storage · RLS   │
└─────────────────────────────────────────────────┘
```

---

## 🗄️ Cơ sở dữ liệu

Hệ thống gồm **24 bảng** chia thành 6 nhóm chức năng:

- **Thực đơn:** `menu_categories`, `menu_items`, `recipes`
- **Bàn & Đặt bàn:** `areas`, `tables`, `reservations`
- **Đơn hàng & Thanh toán:** `orders`, `order_items`, `payments`
- **Kho & Nguyên liệu:** `warehouses`, `ingredients`, `ingredient_categories`, `inventory_batches`, `inventory_stock`, `inventory_transactions`, `uom_conversions`
- **Mua hàng & NCC:** `suppliers`, `purchase_orders`, `purchase_order_details`, `supplier_debt_ledger`
- **Nhân sự:** `profiles`, `shifts`, `attendance_logs`
- **Cấu hình:** `restaurant_settings`

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu
- Node.js >= 18
- Tài khoản [Supabase](https://supabase.com)

### 1. Clone repository

```bash
git clone https://github.com/traineethanh/QuanLyNhaHang.git
cd QuanLyNhaHang
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env.local` ở thư mục gốc:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VNPAY_TMN_CODE=your_vnpay_terminal_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### 4. Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

---

## 📱 Demo

| Màn hình | Mô tả |
|---|---|
| `/login` | Đăng nhập theo vai trò |
| `/dashboard` | Tổng quan doanh thu & hoạt động |
| `/tables` | Sơ đồ bàn real-time |
| `/pos` | Gọi món (POS) |
| `/kitchen` | Màn hình bếp (KDS) |
| `/payment` | Thanh toán & hóa đơn |
| `/reports` | Báo cáo thống kê |
| `/inventory` | Quản lý kho |
| `/staff` | Quản lý nhân viên |

> 🔗 **Link demo:** [https://quan-ly-nha-hang-tau.vercel.app](https://quan-ly-nha-hang-tau.vercel.app/)  
> 🐙 **GitHub:** [https://github.com/traineethanh/QuanLyNhaHang](https://github.com/traineethanh/QuanLyNhaHang)

### 🔑 Tài khoản demo

> ⚠️ Các tài khoản dưới đây chỉ dùng để **xem demo** — vui lòng không thay đổi dữ liệu.

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản lý | `manager2@restaurant.com` | `123456789` |
| Phục vụ | `nhanvien@restaurant.com` | `123456789` |
| Bếp | `bep@restaurant.com` | `123456789` |
| Thu ngân | `thungan@restaurant.com` | `123456789` |

---

## 📂 Cấu trúc thư mục

```
restaurant-management/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Route group: Login
│   ├── (dashboard)/            # Route group: Dashboard chính
│   │   ├── tables/             # Sơ đồ bàn
│   │   ├── pos/                # Gọi món POS
│   │   ├── kitchen/            # Màn hình bếp KDS
│   │   ├── payment/            # Thanh toán
│   │   ├── reports/            # Báo cáo
│   │   ├── inventory/          # Quản lý kho
│   │   └── staff/              # Nhân sự
│   └── api/                    # API Route Handlers
│       ├── auth/               # Xác thực
│       ├── orders/             # Đơn hàng
│       ├── payments/           # Thanh toán
│       ├── kitchen/            # Bếp
│       ├── menu/               # Thực đơn
│       ├── tables/             # Bàn
│       ├── inventory/          # Kho
│       ├── staff/              # Nhân viên
│       └── reports/            # Báo cáo
├── components/                 # React components tái sử dụng
├── lib/                        # Utilities & Supabase client
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript type definitions
├── supabase/                   # Database schema & migrations
└── public/                     # Static assets
```

---

## 🔧 API Endpoints chính

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Tạo tài khoản nhân viên |
| GET | `/api/tables` | Danh sách bàn & trạng thái |
| POST | `/api/orders` | Tạo đơn gọi món |
| PUT | `/api/kitchen/items/:id` | Cập nhật trạng thái chế biến |
| POST | `/api/payments` | Xác nhận thanh toán |
| GET | `/api/reports/revenue` | Báo cáo doanh thu |
| GET | `/api/reports/profit` | Báo cáo lãi lỗ |
| POST | `/api/inventory/import` | Nhập kho |
| GET | `/api/inventory/alerts` | Cảnh báo tồn kho |

---

## 📄 Tài liệu đồ án

| Tài liệu | Nội dung |
|---|---|
| Báo cáo đồ án | Phân tích yêu cầu, Use Case, DFD, ERD, Thiết kế hệ thống |
| Slide thuyết trình | Tổng quan đề tài, chức năng, kỹ thuật khó, demo |
| ERD Database | 24 bảng dữ liệu với quan hệ đầy đủ |

---

## 📝 Giấy phép

Dự án được phát triển cho mục đích học thuật trong khuôn khổ môn SE104.  
© 2025 Nhóm SE104.Q29 — Trường Đại học Công nghệ Thông tin, ĐHQG TP.HCM.

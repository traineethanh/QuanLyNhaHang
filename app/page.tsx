"use client";

import { useState } from "react";
import Link from "next/link";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";
import { Globe, QrCode, Smartphone, MessageCircle } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { label: "Trang chủ", href: "#" },
  { label: "Giới thiệu", href: "#about" },
  { label: "Hình ảnh", href: "#gallery" },
  { label: "Liên hệ", href: "#contact" },
];

export default function HomePage() {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header cố định sticky */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          {/* Logo bên trái */}
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold tracking-[0.18em] text-slate-900">
              Nhà hàng
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Ẩm thực Việt & Quốc tế
            </span>
          </div>

          {/* Thanh điều hướng ở giữa */}
          <nav className="hidden flex-1 justify-center md:flex">
            <ul className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              {navLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="transition hover:text-slate-900"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Nút hành động bên phải */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Đăng nhập
            </Link>
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600"
            >
              <QrCode className="h-4 w-4" />
              Quét QR
            </button>
          </div>
        </div>
      </header>

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      {/* Banner / Hero Section */}
      <section className="relative overflow-hidden bg-slate-50">
        {/* Placeholder background - replace bằng ảnh khi có */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_20%),_radial-gradient(circle_at_bottom_right,_rgba(51,65,85,0.10),_transparent_30%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect fill=\'%23f8fafc\' width=\'100\' height=\'100\'/%3E%3C/svg%3E')] bg-cover bg-center opacity-30" />

        <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col px-6 pb-16 pt-8 sm:px-10 lg:px-16 lg:pb-24 lg:pt-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.30em] text-amber-700">
                Ẩm thực trọn vị, phong cách sang trọng
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Trải nghiệm ẩm thực đẳng cấp tại nhà hàng của chúng tôi.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Không gian ấm cúng, thực đơn tinh tế, từ các món Việt truyền
                thống đến hương vị quốc tế đặc sắc. Quét QR để khám phá menu
                ngay tại bàn.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href="#gallery"
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Xem hình ảnh
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Liên hệ
                </a>
              </div>
            </div>

            {/* Ảnh nhà hàng chính giữa banner, placeholder */}
            <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-100 p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(248,113,113,0.20),_transparent_45%)]" />
                <div className="relative flex h-[340px] items-end justify-center rounded-[1.5rem] border border-slate-300 bg-slate-200">
                  {/* Replace placeholder bằng <Image> khi có ảnh */}
                  <Image
                    src="/hero.jpg"
                    alt="Nhà hàng SenSan"
                    fill
                    className="object-cover rounded-[1.5rem]"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-700">
                Giới thiệu
              </p>
              <h2 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Nhà hàng SenSan – Ẩm thực tinh tế, không gian ấm cúng
              </h2>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                Chào đón bạn đến với Nhà hàng SenSan, nơi hội tụ những hương vị
                Việt và quốc tế. Tại đây, chúng tôi phục vụ thực đơn à la carte
                phong phú, thực phẩm tươi ngon và trải nghiệm phục vụ thân
                thiện.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Không gian
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    Ấm cúng, sang trọng
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Dịch vụ
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    Nhanh chóng, chuyên nghiệp
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="h-full rounded-[1.75rem] bg-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 200 200\'%3E%3Cdefs%3E%3CradialGradient id=\'a\'%3E%3Cstop offset=\'0%25\' stop-color=\'%23f8fafc\'/%3E%3Cstop offset=\'100%25\' stop-color=\'%23cbd5e1\'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23a)\'/%3E%3C/svg%3E')] bg-cover bg-center p-6">
                <div className="flex h-full flex-col justify-between gap-4 rounded-[1.5rem] bg-white/90 p-6 shadow-inner">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-amber-700">
                      Thực đơn đặc sắc
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-slate-900">
                      Món ăn tươi ngon mỗi ngày
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Gỏi cuốn tôm thịt, lẩu thái hải sản, sườn nướng mật ong,
                      và nhiều món ngon khác.
                    </p>
                    <p className="text-sm text-slate-600">
                      Thực đơn đa dạng phù hợp cả gia đình, cặp đôi và hội họp
                      bạn bè.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="bg-white px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-700">
              Hình ảnh
            </p>
            <h2 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
              Không gian và món ăn của chúng tôi
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {["/gallery-1.jpg", "/gallery-2.jpg", "/gallery-3.jpg"].map(
              (src, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 p-0 shadow-sm"
                >
                  <div className="relative h-72">
                    <Image
                      src={src}
                      alt={`Hình ảnh nhà hàng ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-slate-50 p-10 shadow-sm">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.28em] text-amber-700">
                Liên hệ
              </p>
              <h2 className="text-3xl font-semibold text-slate-900">
                Ghé thăm hoặc liên hệ đặt bàn
              </h2>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                Nhà hàng SenSan luôn sẵn sàng phục vụ bữa ăn của bạn. Hãy gọi
                ngay để đặt bàn, hỏi về thực đơn hoặc nhận hỗ trợ nhanh chóng.
              </p>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Thông tin liên hệ</p>
              <p>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</p>
              <p>Điện thoại: 090 123 4567</p>
              <p>Giờ mở cửa: 10:00 - 22:00</p>
              <p className="mt-4 rounded-3xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-700">
                Quét mã QR tại bàn để gọi món nhanh hơn
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating liên hệ nhanh */}
      <a
        href="tel:0901234567"
        className="fixed bottom-6 right-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-600 text-white shadow-2xl shadow-amber-600/30 transition hover:scale-105"
        aria-label="Liên hệ nhanh"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </main>
  );
}

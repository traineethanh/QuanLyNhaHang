// app/dashboard/menu/recipes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { RecipesContent } from "./recipes-content";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function getInitialRecipesData() {
  const supabase = await createClient();

  // Kéo danh sách món ăn và nguyên liệu gốc để làm mồi cho giao diện định lượng
  const [{ data: menuItems }, { data: ingredients }] = await Promise.all([
    supabase.from("menu_items").select("*").order("name"),
    supabase.from("ingredients").select("*").order("name"),
  ]);

  return {
    menuItems: menuItems || [],
    ingredients: ingredients || [],
  };
}

export default async function RecipesPage() {
  // ==================== ⚡ LOGIC BẢO MẬT PHÂN QUYỀN ====================
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole;

  if (userRole !== "manager" && userRole !== "kitchen") {
    redirect("/dashboard");
  }
  // =========================================================================

  const data = await getInitialRecipesData();

  return (
    <>
      <Header title="Định lượng món ăn" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <RecipesContent {...data} />
      </main>
    </>
  );
}

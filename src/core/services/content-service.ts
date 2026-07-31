import { supabase } from "@/integrations/supabase/client";
import type { CoachMessage, DietPlan, DietPlanRow, ScanRow } from "@/core/models";
import type { Json } from "@/integrations/supabase/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* ---------- diet plans ---------- */

export async function listPlans(): Promise<DietPlanRow[]> {
  const { data, error } = await supabase
    .from("diet_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function savePlan(plan: DietPlan): Promise<DietPlanRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("diet_plans")
    .insert({
      user_id: userId,
      title: plan.title,
      total_calories: plan.totalCalories,
      plan: plan as unknown as Json,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from("diet_plans").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- scans ---------- */

export async function listScans(limit = 12): Promise<ScanRow[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function saveScan(results: unknown, imageUrl: string | null): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("scans").insert({
    user_id: userId,
    image_url: imageUrl,
    results: results as Json,
  });
  if (error) throw error;
}

export async function uploadMealPhoto(file: Blob, ext = "jpg"): Promise<string | null> {
  const userId = await requireUserId();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("meal-photos").upload(path, file);
  if (error) return null;
  const { data } = await supabase.storage
    .from("meal-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

/* ---------- coach ---------- */

export async function listCoachMessages(): Promise<CoachMessage[]> {
  const { data, error } = await supabase
    .from("coach_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function saveCoachMessage(role: "user" | "assistant", content: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("coach_messages").insert({ user_id: userId, role, content });
  if (error) throw error;
}

export async function clearCoachMessages(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("coach_messages").delete().eq("user_id", userId);
  if (error) throw error;
}

import { supabase } from "@/integrations/supabase/client";
import type {
  DaySummary,
  Meal,
  MealType,
  Nutrition,
  Profile,
  WaterLog,
  WeightLog,
} from "@/core/models";
import { MEAL_TYPES } from "@/core/models";
import { daysAgoISO, todayISO } from "@/core/utils/format";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* ---------- profile ---------- */

export async function getProfile(): Promise<Profile> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(file: File): Promise<string> {
  const userId = await requireUserId();
  const path = `${userId}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
  const url = data?.signedUrl ?? "";
  await updateProfile({ avatar_url: url });
  return url;
}

/* ---------- meals ---------- */

const emptyNutrition: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function sumNutrition(meals: Meal[]): Nutrition {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories),
      protein: acc.protein + Number(m.protein),
      carbs: acc.carbs + Number(m.carbs),
      fat: acc.fat + Number(m.fat),
    }),
    { ...emptyNutrition },
  );
}

export async function listMeals(date: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("logged_on", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listMealsBetween(from: string, to: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("logged_on", from)
    .lte("logged_on", to)
    .order("logged_on", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type NewMeal = {
  meal_type: MealType;
  name: string;
  summary?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url?: string | null;
  source?: string;
  logged_on?: string;
};

export async function addMeal(meal: NewMeal): Promise<Meal> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("meals")
    .insert({ ...meal, user_id: userId, logged_on: meal.logged_on ?? todayISO() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- water ---------- */

export async function listWater(date: string): Promise<WaterLog[]> {
  const { data, error } = await supabase.from("water_logs").select("*").eq("logged_on", date);
  if (error) throw error;
  return data ?? [];
}

export async function listWaterBetween(from: string, to: string): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .gte("logged_on", from)
    .lte("logged_on", to);
  if (error) throw error;
  return data ?? [];
}

export async function addWater(amountMl: number, date = todayISO()): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, amount_ml: amountMl, logged_on: date });
  if (error) throw error;
}

/* ---------- weight ---------- */

export async function listWeights(limit = 60): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .order("logged_on", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function addWeight(weightKg: number, date = todayISO()): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("weight_logs")
    .insert({ user_id: userId, weight_kg: weightKg, logged_on: date });
  if (error) throw error;
  await updateProfile({ weight_kg: weightKg });
}

/* ---------- aggregates ---------- */

export async function getDaySummary(date = todayISO()): Promise<DaySummary> {
  const [profile, meals, water] = await Promise.all([getProfile(), listMeals(date), listWater(date)]);

  const mealsByType = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = meals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<MealType, Meal[]>,
  );

  return {
    date,
    consumed: sumNutrition(meals),
    goal: {
      calories: profile.calorie_goal,
      protein: profile.protein_goal,
      carbs: profile.carbs_goal,
      fat: profile.fat_goal,
      waterMl: profile.water_goal_ml,
    },
    waterMl: water.reduce((sum, w) => sum + w.amount_ml, 0),
    mealsByType,
    meals,
  };
}

export type DailyPoint = { date: string; calories: number; protein: number; waterMl: number };

export async function getRange(days: number): Promise<DailyPoint[]> {
  const from = daysAgoISO(days - 1);
  const to = todayISO();
  const [meals, water] = await Promise.all([listMealsBetween(from, to), listWaterBetween(from, to)]);

  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgoISO(i);
    const dayMeals = meals.filter((m) => m.logged_on === date);
    points.push({
      date,
      calories: dayMeals.reduce((s, m) => s + Number(m.calories), 0),
      protein: dayMeals.reduce((s, m) => s + Number(m.protein), 0),
      waterMl: water.filter((w) => w.logged_on === date).reduce((s, w) => s + w.amount_ml, 0),
    });
  }
  return points;
}

export function currentStreak(points: DailyPoint[]): number {
  let streak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.calories > 0) streak++;
    else break;
  }
  return streak;
}

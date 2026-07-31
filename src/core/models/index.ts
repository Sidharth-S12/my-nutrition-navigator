import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Meal = Tables<"meals">;
export type WaterLog = Tables<"water_logs">;
export type WeightLog = Tables<"weight_logs">;
export type DietPlanRow = Tables<"diet_plans">;
export type ScanRow = Tables<"scans">;
export type CoachMessage = Tables<"coach_messages">;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DaySummary = {
  date: string;
  consumed: Nutrition;
  goal: Nutrition & { waterMl: number };
  waterMl: number;
  mealsByType: Record<MealType, Meal[]>;
  meals: Meal[];
};

export type DetectedFood = {
  name: string;
  portion: string;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PlanMeal = {
  slot: string;
  time: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DietPlan = {
  title: string;
  summary: string;
  totalCalories: number;
  meals: PlanMeal[];
};

export const GOALS = ["Lose weight", "Maintain weight", "Gain muscle"] as const;
export const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
] as const;
export const FOOD_PREFERENCES = ["No preference", "Vegetarian", "Vegan", "Halal", "Keto", "High protein"] as const;
export const GENDERS = ["Male", "Female", "Other"] as const;

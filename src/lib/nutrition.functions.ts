import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DetectedFood, DietPlan } from "@/core/models";

const AnalyzeInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
});

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<{ foods: DetectedFood[] }> => {
    const { completeJSON } = await import("@/lib/ai-gateway.server");
    const result = await completeJSON<{ foods?: DetectedFood[] }>([
      {
        role: "system",
        content:
          'You are a nutrition vision analyst. Identify every distinct food item in the photo and estimate its nutrition for the visible portion. Respond ONLY with JSON: {"foods":[{"name":string,"portion":string,"confidence":number 0-1,"calories":number,"protein":number,"carbs":number,"fat":number}]}. Macros are grams. If the photo contains no food, return an empty foods array.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Identify the foods and estimate nutrition." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);
    return { foods: (result.foods ?? []).slice(0, 8) };
  });

const PlanInput = z.object({
  age: z.number().int().positive(),
  gender: z.string(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  goal: z.string(),
  activityLevel: z.string(),
  foodPreference: z.string(),
  allergies: z.string().optional().default(""),
  regenerateSlot: z.string().optional(),
});

export const generateDietPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }): Promise<DietPlan> => {
    const { completeJSON } = await import("@/lib/ai-gateway.server");
    const plan = await completeJSON<DietPlan>([
      {
        role: "system",
        content:
          'You are a registered dietitian. Build a realistic one-day meal plan using ordinary, affordable foods. Respond ONLY with JSON: {"title":string,"summary":string (max 200 chars),"totalCalories":number,"meals":[{"slot":"Breakfast"|"Morning Snack"|"Lunch"|"Evening Snack"|"Dinner","time":"08:00","foods":[string],"calories":number,"protein":number,"carbs":number,"fat":number}]}. Always include all five slots in chronological order. Macros in grams.',
      },
      {
        role: "user",
        content: `Age ${data.age}, ${data.gender}, ${data.heightCm} cm, ${data.weightKg} kg. Goal: ${data.goal}. Activity: ${data.activityLevel}. Food preference: ${data.foodPreference}. Allergies/avoid: ${data.allergies || "none"}.${
          data.regenerateSlot
            ? ` Provide a different option specifically for ${data.regenerateSlot} than a typical first suggestion.`
            : ""
        }`,
      },
    ]);
    return plan;
  });

const TipInput = z.object({
  caloriesConsumed: z.number(),
  calorieGoal: z.number(),
  proteinConsumed: z.number(),
  proteinGoal: z.number(),
  waterMl: z.number(),
  waterGoalMl: z.number(),
  goal: z.string(),
});

export const generateDailyTip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TipInput.parse(input))
  .handler(async ({ data }): Promise<{ tip: string }> => {
    const { completeJSON } = await import("@/lib/ai-gateway.server");
    const result = await completeJSON<{ tip?: string }>([
      {
        role: "system",
        content:
          'You are a concise nutrition coach. Give one specific, actionable tip based on the user\'s numbers today. Max 200 characters, no emojis, no greetings. Respond ONLY with JSON: {"tip": string}',
      },
      {
        role: "user",
        content: `Goal: ${data.goal}. Calories ${Math.round(data.caloriesConsumed)}/${data.calorieGoal}. Protein ${Math.round(data.proteinConsumed)}/${data.proteinGoal} g. Water ${data.waterMl}/${data.waterGoalMl} ml.`,
      },
    ]);
    return {
      tip: result.tip ?? "Log every meal today — consistent tracking is what moves the numbers.",
    };
  });

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingRows, SectionHeader } from "@/shared/widgets/states";
import { generateDietPlan } from "@/lib/nutrition.functions";
import { deletePlan, listPlans, savePlan } from "@/core/services/content-service";
import { getProfile } from "@/core/services/nutrition-service";
import type { DietPlan } from "@/core/models";
import { formatShortDate } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({
    meta: [
      { title: "Diet Plan | NutriAI" },
      {
        name: "description",
        content:
          "Generate a personalised daily meal plan based on your goals, activity and food preferences.",
      },
      { property: "og:title", content: "Diet Plan | NutriAI" },
      {
        property: "og:description",
        content: "AI-built daily meal plans tailored to your body and goals.",
      },
    ],
  }),
  component: DietPage,
});

function DietPage() {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<DietPlan | null>(null);

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const plansQuery = useQuery({ queryKey: ["diet-plans"], queryFn: listPlans });

  const generate = useMutation({
    mutationFn: async (regenerateSlot?: string) => {
      const p = profileQuery.data;
      if (!p) throw new Error("Complete your profile first");
      return generateDietPlan({
        data: {
          age: p.age ?? 30,
          gender: p.gender ?? "Other",
          heightCm: Number(p.height_cm ?? 170),
          weightKg: Number(p.weight_kg ?? 70),
          goal: p.goal ?? "Maintain weight",
          activityLevel: p.activity_level ?? "Moderately active",
          foodPreference: p.food_preference ?? "No preference",
          allergies: p.allergies ?? "",
          regenerateSlot,
        },
      });
    },
    onSuccess: (result) => setPlan(result),
    onError: (error: Error) => toast.error(error.message || "Could not generate a plan"),
  });

  const save = useMutation({
    mutationFn: () => savePlan(plan!),
    onSuccess: () => {
      toast.success("Plan saved");
      queryClient.invalidateQueries({ queryKey: ["diet-plans"] });
    },
    onError: () => toast.error("Could not save plan"),
  });

  const remove = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet-plans"] }),
    onError: () => toast.error("Could not delete plan"),
  });

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Diet plan</h1>
        <p className="text-xs text-muted-foreground">
          Personalised to your body, goal and preferences.
        </p>
      </header>

      <Button
        className="w-full"
        disabled={generate.isPending || profileQuery.isLoading}
        onClick={() => generate.mutate(undefined)}
      >
        {generate.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Building your plan…
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> {plan ? "Generate a new plan" : "Generate plan"}
          </>
        )}
      </Button>

      {generate.isPending && !plan ? <LoadingRows rows={4} height={72} /> : null}

      {plan ? (
        <section className="space-y-3">
          <div className="panel p-4">
            <h2 className="text-base font-bold">{plan.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
            <p className="num mt-2 text-sm font-semibold">
              {Math.round(plan.totalCalories)} kcal / day
            </p>
          </div>

          {plan.meals.map((meal) => (
            <div key={meal.slot} className="panel p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{meal.slot}</p>
                  <p className="num text-[11px] text-muted-foreground">{meal.time}</p>
                </div>
                <span className="num text-xs font-semibold">{Math.round(meal.calories)} kcal</span>
              </div>
              <ul className="mt-2 space-y-1">
                {meal.foods.map((food, i) => (
                  <li key={i} className="text-sm text-foreground/90">
                    · {food}
                  </li>
                ))}
              </ul>
              <p className="num mt-2 text-[11px] text-muted-foreground">
                P{Math.round(meal.protein)} · C{Math.round(meal.carbs)} · F{Math.round(meal.fat)}
              </p>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={generate.isPending}
              onClick={() => generate.mutate("the whole day")}
            >
              <RefreshCw className="size-4" /> Swap meals
            </Button>
            <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save plan"}
            </Button>
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Saved plans" />
        {plansQuery.isLoading ? (
          <LoadingRows rows={2} height={56} />
        ) : (plansQuery.data ?? []).length === 0 ? (
          <div className="panel">
            <EmptyState
              title="No saved plans"
              description="Generate a plan and save it to keep it here."
            />
          </div>
        ) : (
          <div className="panel divide-y divide-border">
            {plansQuery.data!.map((row) => (
              <div key={row.id} className="flex items-center gap-3 p-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setPlan(row.plan as unknown as DietPlan)}
                >
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {row.total_calories} kcal ·{" "}
                    {formatShortDate(String(row.created_at).slice(0, 10))}
                  </p>
                </button>
                <button
                  aria-label={`Delete ${row.title}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

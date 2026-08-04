import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Droplets, Plus, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CalorieRing, StatBar } from "@/shared/widgets/metrics";
import { ErrorState, LoadingRows, SectionHeader } from "@/shared/widgets/states";
import { addMeal, addWater, deleteMeal, getDaySummary } from "@/core/services/nutrition-service";
import { generateDailyTip } from "@/lib/nutrition.functions";
import { MEAL_LABELS, MEAL_TYPES, type MealType } from "@/core/models";
import { formatLongDate, greeting, todayISO } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today | NutriAI Nutrition Tracker" },
      {
        name: "description",
        content:
          "Track calories, macros and water for today with NutriAI's daily nutrition dashboard.",
      },
      { property: "og:title", content: "Today | NutriAI Nutrition Tracker" },
      {
        property: "og:description",
        content: "Your daily calorie, macro and hydration summary in one place.",
      },
    ],
  }),
  component: HomePage,
});

const WATER_STEPS = [250, 500, 750];

function HomePage() {
  const date = todayISO();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["day-summary", date],
    queryFn: () => getDaySummary(date),
  });

  const summary = summaryQuery.data;

  const tipQuery = useQuery({
    queryKey: ["daily-tip", date, Math.round(summary?.consumed.calories ?? 0)],
    enabled: !!summary,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const s = summary!;
      const res = await generateDailyTip({
        data: {
          caloriesConsumed: s.consumed.calories,
          calorieGoal: s.goal.calories,
          proteinConsumed: s.consumed.protein,
          proteinGoal: s.goal.protein,
          waterMl: s.waterMl,
          waterGoalMl: s.goal.waterMl,
          goal: "healthy eating",
        },
      });
      return res.tip;
    },
  });

  const waterMutation = useMutation({
    mutationFn: (ml: number) => addWater(ml, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["day-summary", date] }),
    onError: () => toast.error("Could not log water"),
  });

  const removeMutation = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      toast.success("Meal removed");
      queryClient.invalidateQueries({ queryKey: ["day-summary", date] });
    },
    onError: () => toast.error("Could not remove meal"),
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <LoadingRows rows={4} height={80} />
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div className="p-4">
        <ErrorState
          message="We couldn't load today's data."
          onRetry={() => summaryQuery.refetch()}
        />
      </div>
    );
  }

  const waterPct = Math.min(100, (summary.waterMl / summary.goal.waterMl) * 100);

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{formatLongDate(date)}</p>
          <h1 className="text-xl font-bold tracking-tight">{greeting()}</h1>
        </div>
        <Link
          to="/profile"
          aria-label="Profile and goals"
          className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <User className="size-4" />
        </Link>
      </header>

      <section className="panel p-4">
        <div className="flex items-center gap-4">
          <CalorieRing consumed={summary.consumed.calories} goal={summary.goal.calories} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="num text-sm font-semibold">
              {Math.round(summary.consumed.calories)}
              <span className="text-muted-foreground"> / {summary.goal.calories} kcal</span>
            </div>
            <StatBar
              label="Protein"
              value={summary.consumed.protein}
              goal={summary.goal.protein}
              tone="protein"
            />
            <StatBar
              label="Carbs"
              value={summary.consumed.carbs}
              goal={summary.goal.carbs}
              tone="carbs"
            />
            <StatBar label="Fat" value={summary.consumed.fat} goal={summary.goal.fat} tone="fat" />
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="size-4 text-water" />
            <span className="text-sm font-semibold">Water</span>
          </div>
          <span className="num text-sm font-semibold">
            {summary.waterMl}
            <span className="text-muted-foreground"> / {summary.goal.waterMl} ml</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-water transition-[width] duration-500"
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {WATER_STEPS.map((ml) => (
            <Button
              key={ml}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={waterMutation.isPending}
              onClick={() => waterMutation.mutate(ml)}
            >
              +{ml} ml
            </Button>
          ))}
        </div>
      </section>

      <section className="panel flex items-start gap-3 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="section-label">Coach tip</p>
          <p className="mt-1 text-sm leading-relaxed">
            {tipQuery.isLoading
              ? "Reading today's numbers…"
              : (tipQuery.data ?? "Log your meals to get a personalised tip.")}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to="/scan">
            <Camera className="size-4" /> Scan food
          </Link>
        </Button>
        <AddMealDialog date={date} />
      </div>

      <section>
        <SectionHeader title="Meals" />
        <div className="space-y-3">
          {MEAL_TYPES.map((type) => (
            <div key={type} className="panel p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{MEAL_LABELS[type]}</span>
                <span className="num text-xs text-muted-foreground">
                  {Math.round(
                    summary.mealsByType[type].reduce((s, m) => s + Number(m.calories), 0),
                  )}{" "}
                  kcal
                </span>
              </div>
              {summary.mealsByType[type].length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nothing logged yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {summary.mealsByType[type].map((meal) => (
                    <li key={meal.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{meal.name}</p>
                        <p className="num text-[11px] text-muted-foreground">
                          {Math.round(Number(meal.calories))} kcal · P
                          {Math.round(Number(meal.protein))} · C{Math.round(Number(meal.carbs))} · F
                          {Math.round(Number(meal.fat))}
                        </p>
                      </div>
                      <button
                        aria-label={`Delete ${meal.name}`}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => removeMutation.mutate(meal.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddMealDialog({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    meal_type: "breakfast" as MealType,
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const valid = useMemo(() => form.name.trim().length > 0 && Number(form.calories) > 0, [form]);

  const mutation = useMutation({
    mutationFn: () =>
      addMeal({
        name: form.name.trim(),
        meal_type: form.meal_type,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        source: "manual",
        logged_on: date,
      }),
    onSuccess: () => {
      toast.success("Meal logged");
      setForm({
        name: "",
        meal_type: form.meal_type,
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["day-summary", date] });
    },
    onError: () => toast.error("Could not save meal"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Add meal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="meal-name">Food</Label>
            <Input
              id="meal-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Grilled chicken salad"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meal</Label>
            <Select
              value={form.meal_type}
              onValueChange={(v) => setForm({ ...form, meal_type: v as MealType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MEAL_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field} className="capitalize">
                  {field === "calories" ? "Calories" : `${field} (g)`}
                </Label>
                <Input
                  id={field}
                  inputMode="numeric"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save meal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingRows, SectionHeader } from "@/shared/widgets/states";
import { addWeight, currentStreak, getProfile, getRange, listWeights } from "@/core/services/nutrition-service";
import { bmi, bmiLabel, formatShortDate } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress | NutriAI" },
      {
        name: "description",
        content: "Review calorie trends, protein intake, hydration and weight history over time.",
      },
      { property: "og:title", content: "Progress | NutriAI" },
      {
        property: "og:description",
        content: "Charts for calories, macros, water and weight so you can see the trend.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<"7" | "30">("7");
  const [weight, setWeight] = useState("");

  const days = Number(range);
  const rangeQuery = useQuery({ queryKey: ["range", days], queryFn: () => getRange(days) });
  const weightsQuery = useQuery({ queryKey: ["weights"], queryFn: () => listWeights() });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const logWeight = useMutation({
    mutationFn: () => addWeight(Number(weight)),
    onSuccess: () => {
      toast.success("Weight logged");
      setWeight("");
      queryClient.invalidateQueries({ queryKey: ["weights"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not log weight"),
  });

  const points = (rangeQuery.data ?? []).map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));
  const streak = currentStreak(rangeQuery.data ?? []);
  const avgCalories = points.length
    ? Math.round(points.reduce((s, p) => s + p.calories, 0) / points.length)
    : 0;
  const avgProtein = points.length
    ? Math.round(points.reduce((s, p) => s + p.protein, 0) / points.length)
    : 0;

  const weightPoints = (weightsQuery.data ?? []).map((w) => ({
    label: formatShortDate(w.logged_on),
    weight: Number(w.weight_kg),
  }));

  const profile = profileQuery.data;
  const bmiValue = bmi(profile?.weight_kg ?? null, profile?.height_cm ?? null);

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Progress</h1>
          <p className="text-xs text-muted-foreground">Trends across your logs</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "30")}>
          <TabsList>
            <TabsTrigger value="7">7d</TabsTrigger>
            <TabsTrigger value="30">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Avg kcal" value={avgCalories} />
        <StatCard label="Avg protein" value={`${avgProtein}g`} />
        <StatCard label="Streak" value={`${streak}d`} icon={<Flame className="size-3.5 text-primary" />} />
      </div>

      {rangeQuery.isLoading ? (
        <LoadingRows rows={2} height={180} />
      ) : (
        <>
          <section className="panel p-3">
            <SectionHeader title="Calories" />
            <ChartFrame>
              <BarChart data={points}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={10} width={34} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="calories" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartFrame>
          </section>

          <section className="panel p-3">
            <SectionHeader title="Protein & water" />
            <ChartFrame>
              <AreaChart data={points}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={10} width={34} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="protein"
                  stroke="var(--color-protein)"
                  fill="var(--color-protein)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="waterMl"
                  stroke="var(--color-water)"
                  fill="var(--color-water)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ChartFrame>
          </section>
        </>
      )}

      <section className="panel p-3">
        <SectionHeader title="Weight" />
        {weightPoints.length > 1 ? (
          <ChartFrame>
            <AreaChart data={weightPoints}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} fontSize={10} width={34} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ChartFrame>
        ) : (
          <p className="px-1 py-3 text-xs text-muted-foreground">
            Log your weight at least twice to see a trend line.
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <Input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight in kg"
          />
          <Button
            disabled={!Number(weight) || logWeight.isPending}
            onClick={() => logWeight.mutate()}
          >
            <Plus className="size-4" /> Log
          </Button>
        </div>

        {bmiValue ? (
          <p className="num mt-2 text-xs text-muted-foreground">
            BMI {bmiValue} · {bmiLabel(bmiValue)}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="num mt-0.5 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

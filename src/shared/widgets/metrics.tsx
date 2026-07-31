import { cn } from "@/lib/utils";

export function CalorieRing({
  consumed,
  goal,
  size = 132,
}: {
  consumed: number;
  goal: number;
  size?: number;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = Math.max(0, Math.round(goal - consumed));
  const over = consumed > goal;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            over ? "stroke-destructive" : "stroke-primary",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[28px] font-bold leading-none">{remaining}</span>
        <span className="mt-1 text-[11px] font-medium text-muted-foreground">
          {over ? "over" : "kcal left"}
        </span>
      </div>
    </div>
  );
}

export function StatBar({
  label,
  value,
  goal,
  unit = "g",
  tone = "primary",
}: {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  tone?: "primary" | "protein" | "carbs" | "fat" | "water";
}) {
  const ratio = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const toneClass = {
    primary: "bg-primary",
    protein: "bg-protein",
    carbs: "bg-carbs",
    fat: "bg-fat",
    water: "bg-water",
  }[tone];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="num text-xs font-semibold">
          {Math.round(value)}
          <span className="text-muted-foreground">
            /{Math.round(goal)}
            {unit}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", toneClass)}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

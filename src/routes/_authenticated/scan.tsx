import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/shared/widgets/states";
import { analyzeFoodImage } from "@/lib/nutrition.functions";
import { addMeal } from "@/core/services/nutrition-service";
import { saveScan, uploadMealPhoto } from "@/core/services/content-service";
import { MEAL_LABELS, MEAL_TYPES, type DetectedFood, type MealType } from "@/core/models";
import { todayISO } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan Food | NutriAI" },
      {
        name: "description",
        content: "Photograph a meal and let NutriAI identify the foods and estimate calories and macros.",
      },
      { property: "og:title", content: "Scan Food | NutriAI" },
      {
        property: "og:description",
        content: "AI food recognition that turns a photo into calories and macros.",
      },
    ],
  }),
  component: ScanPage,
});

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

function ScanPage() {
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [foods, setFoods] = useState<DetectedFood[] | null>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [logged, setLogged] = useState(false);

  const analyze = useMutation({
    mutationFn: async (dataUrl: string) => {
      const res = await analyzeFoodImage({ data: { imageDataUrl: dataUrl } });
      return res.foods;
    },
    onSuccess: async (result) => {
      setFoods(result);
      if (result.length === 0) {
        toast.info("No food detected in that photo");
        return;
      }
      const imageUrl = file ? await uploadMealPhoto(file, file.name.split(".").pop() ?? "jpg") : null;
      await saveScan(result, imageUrl).catch(() => undefined);
    },
    onError: (error: Error) => toast.error(error.message || "Analysis failed"),
  });

  const log = useMutation({
    mutationFn: async () => {
      const items = foods ?? [];
      for (const item of items) {
        await addMeal({
          name: item.name,
          summary: item.portion,
          meal_type: mealType,
          calories: Math.round(item.calories),
          protein: Math.round(item.protein),
          carbs: Math.round(item.carbs),
          fat: Math.round(item.fat),
          source: "scan",
        });
      }
    },
    onSuccess: () => {
      setLogged(true);
      toast.success("Added to your diary");
      queryClient.invalidateQueries({ queryKey: ["day-summary", todayISO()] });
    },
    onError: () => toast.error("Could not log these foods"),
  });

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8 MB)");
      return;
    }
    setFile(selected);
    setFoods(null);
    setLogged(false);
    const dataUrl = await fileToDataUrl(selected);
    setPreview(dataUrl);
    analyze.mutate(dataUrl);
  }

  const totals = (foods ?? []).reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Scan food</h1>
        <p className="text-xs text-muted-foreground">
          Take a photo and NutriAI estimates calories and macros.
        </p>
      </header>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="panel overflow-hidden">
        {preview ? (
          <img src={preview} alt="Meal to analyse" className="h-56 w-full object-cover" />
        ) : (
          <EmptyState
            icon={<Camera className="size-8" />}
            title="No photo yet"
            description="Use your camera or pick an existing photo of your meal."
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => cameraRef.current?.click()} disabled={analyze.isPending}>
          <Camera className="size-4" /> Camera
        </Button>
        <Button
          variant="outline"
          onClick={() => galleryRef.current?.click()}
          disabled={analyze.isPending}
        >
          <ImagePlus className="size-4" /> Gallery
        </Button>
      </div>

      {analyze.isPending ? (
        <div className="panel flex items-center gap-3 p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-sm">Analysing your meal…</p>
        </div>
      ) : null}

      {foods && foods.length > 0 ? (
        <section className="space-y-3">
          <div className="panel divide-y divide-border">
            {foods.map((food, i) => (
              <div key={`${food.name}-${i}`} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{food.name}</p>
                  <p className="text-[11px] text-muted-foreground">{food.portion}</p>
                  <p className="num mt-1 text-[11px] text-muted-foreground">
                    {Math.round(food.calories)} kcal · P{Math.round(food.protein)} · C
                    {Math.round(food.carbs)} · F{Math.round(food.fat)}
                  </p>
                </div>
                <span className="num rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  {Math.round((food.confidence ?? 0) * 100)}%
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="num text-sm font-semibold">
                {Math.round(totals.calories)} kcal
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger className="w-36">
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
            <Button
              className="flex-1"
              disabled={log.isPending || logged}
              onClick={() => log.mutate()}
            >
              {logged ? (
                <>
                  <Check className="size-4" /> Logged
                </>
              ) : log.isPending ? (
                "Adding…"
              ) : (
                "Add to diary"
              )}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

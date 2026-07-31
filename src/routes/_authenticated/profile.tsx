import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingRows, SectionHeader } from "@/shared/widgets/states";
import { getProfile, updateProfile, uploadAvatar } from "@/core/services/nutrition-service";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_LEVELS, FOOD_PREFERENCES, GENDERS, GOALS } from "@/core/models";
import { initials } from "@/core/utils/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Goals | NutriAI" },
      {
        name: "description",
        content: "Manage your body metrics, activity level, food preferences and daily nutrition goals.",
      },
      { property: "og:title", content: "Profile & Goals | NutriAI" },
      {
        property: "og:description",
        content: "Set the goals NutriAI uses to personalise your plan and coaching.",
      },
    ],
  }),
  component: ProfilePage,
});

type FormState = Record<string, string>;

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [form, setForm] = useState<FormState>({});

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setForm({
      full_name: p.full_name ?? "",
      age: p.age ? String(p.age) : "",
      gender: p.gender ?? "Other",
      height_cm: p.height_cm ? String(p.height_cm) : "",
      weight_kg: p.weight_kg ? String(p.weight_kg) : "",
      goal: p.goal ?? "Maintain weight",
      activity_level: p.activity_level ?? "Moderately active",
      food_preference: p.food_preference ?? "No preference",
      allergies: p.allergies ?? "",
      calorie_goal: String(p.calorie_goal),
      protein_goal: String(p.protein_goal),
      carbs_goal: String(p.carbs_goal),
      fat_goal: String(p.fat_goal),
      water_goal_ml: String(p.water_goal_ml),
    });
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        full_name: form.full_name || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        goal: form.goal || null,
        activity_level: form.activity_level || null,
        food_preference: form.food_preference || null,
        allergies: form.allergies || null,
        calorie_goal: Number(form.calorie_goal) || 2000,
        protein_goal: Number(form.protein_goal) || 140,
        carbs_goal: Number(form.carbs_goal) || 220,
        fat_goal: Number(form.fat_goal) || 65,
        water_goal_ml: Number(form.water_goal_ml) || 2500,
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["day-summary"] });
    },
    onError: () => toast.error("Could not save your profile"),
  });

  const avatar = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      toast.success("Photo updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not upload photo"),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <LoadingRows rows={5} height={64} />
      </div>
    );
  }

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          <Avatar className="size-14">
            <AvatarImage src={profileQuery.data?.avatar_url ?? undefined} alt="Profile photo" />
            <AvatarFallback>{initials(profileQuery.data?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
            <Upload className="size-3" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) avatar.mutate(file);
            }}
          />
        </label>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {form.full_name || "Your profile"}
          </h1>
          <p className="text-xs text-muted-foreground">Goals power your plan and coaching</p>
        </div>
      </header>

      <section className="panel space-y-3 p-4">
        <SectionHeader title="About you" />
        <Field label="Full name" value={form.full_name ?? ""} onChange={set("full_name")} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Age" value={form.age ?? ""} onChange={set("age")} numeric />
          <Picker label="Gender" value={form.gender ?? ""} options={[...GENDERS]} onChange={set("gender")} />
          <Field label="Height (cm)" value={form.height_cm ?? ""} onChange={set("height_cm")} numeric />
          <Field label="Weight (kg)" value={form.weight_kg ?? ""} onChange={set("weight_kg")} numeric />
        </div>
        <Picker label="Goal" value={form.goal ?? ""} options={[...GOALS]} onChange={set("goal")} />
        <Picker
          label="Activity level"
          value={form.activity_level ?? ""}
          options={[...ACTIVITY_LEVELS]}
          onChange={set("activity_level")}
        />
        <Picker
          label="Food preference"
          value={form.food_preference ?? ""}
          options={[...FOOD_PREFERENCES]}
          onChange={set("food_preference")}
        />
        <Field
          label="Allergies / foods to avoid"
          value={form.allergies ?? ""}
          onChange={set("allergies")}
        />
      </section>

      <section className="panel space-y-3 p-4">
        <SectionHeader title="Daily targets" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Calories" value={form.calorie_goal ?? ""} onChange={set("calorie_goal")} numeric />
          <Field label="Protein (g)" value={form.protein_goal ?? ""} onChange={set("protein_goal")} numeric />
          <Field label="Carbs (g)" value={form.carbs_goal ?? ""} onChange={set("carbs_goal")} numeric />
          <Field label="Fat (g)" value={form.fat_goal ?? ""} onChange={set("fat_goal")} numeric />
          <Field label="Water (ml)" value={form.water_goal_ml ?? ""} onChange={set("water_goal_ml")} numeric />
        </div>
      </section>

      <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : "Save changes"}
      </Button>

      <Separator />

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        inputMode={numeric ? "decimal" : "text"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

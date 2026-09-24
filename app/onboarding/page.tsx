"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  inputClass,
  selectClass,
  textareaClass,
  ChipToggle,
  blurOnWheel,
} from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyProfile } from "@/lib/services/auth";
import { updateProfile } from "@/lib/services/profiles";
import { CityCombobox } from "@/components/shared/city-combobox";
import { getSkillsList } from "@/lib/services/projects";
import { uploadFile } from "@/lib/services/storage";
import { Profile } from "@/types/marketplace";
import { BRAND_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Guided profile setup, run once after role selection.
 *
 * Exists because role-select used to drop people straight into the full
 * settings form — a wall of thirty fields including tax IDs — and almost
 * nobody finished it. The directory ranks by completeness, so blank
 * profiles are the difference between a marketplace that looks alive and
 * one that looks abandoned.
 *
 * Every step can be skipped. A half-finished profile someone actually
 * submitted beats a perfect one they abandoned.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    city: "",
    state: "",
    company_name: "",
    headline: "",
    skills: [] as string[],
    hourly_rate: "",
    experience_years: "",
    availability: "available",
    works_remotely: false,
    bio: "",
  });

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (!data) {
        router.push("/login");
        return;
      }
      if (!data.role) {
        router.push("/auth/role-select");
        return;
      }
      setProfile(data);
      setForm((f) => ({
        ...f,
        full_name: data.full_name || "",
        avatar_url: data.avatar_url || "",
        city: data.city || "",
        state: data.state || "",
        company_name: data.company_name || "",
        headline: data.headline || "",
        skills: data.skills || [],
        hourly_rate: data.hourly_rate ? String(data.hourly_rate) : "",
        experience_years: data.experience_years
          ? String(data.experience_years)
          : "",
        availability: data.availability || "available",
        works_remotely: Boolean(data.works_remotely),
        bio: data.bio || "",
      }));
    });
    getSkillsList().then(({ data }) => setSkillOptions(data));
  }, [router]);

  const isFreelancer = profile?.role === "freelancer";
  const steps = isFreelancer
    ? ["You", "Your craft", "Rates", "About"]
    : ["You", "About"];
  const isLast = step === steps.length - 1;

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const { url, error } = await uploadFile("avatars", profile.id, file);
    setUploading(false);
    if (error || !url) {
      toast.error(error?.message || "Upload failed");
      return;
    }
    setForm((f) => ({ ...f, avatar_url: url }));
  };

  const toggleSkill = (s: string) =>
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s)
        ? f.skills.filter((x) => x !== s)
        : [...f.skills, s],
    }));

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setCustomSkill("");
  };

  /** Saves progress at every step, so leaving halfway doesn't lose it. */
  const persist = async () => {
    if (!profile) return true;
    setSaving(true);
    const { error } = await updateProfile(profile.id, {
      full_name: form.full_name.trim(),
      avatar_url: form.avatar_url || null,
      city: form.city || null,
      state: form.state || null,
      company_name: form.company_name.trim() || null,
      headline: form.headline.trim() || null,
      skills: form.skills,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      experience_years: Number(form.experience_years) || 0,
      availability: form.availability as Profile["availability"],
      works_remotely: form.works_remotely,
      bio: form.bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save");
      return false;
    }
    return true;
  };

  const next = async () => {
    if (step === 0 && !form.full_name.trim()) {
      toast.error("Your name is required");
      return;
    }
    if (!(await persist())) return;
    if (isLast) {
      toast.success("Profile saved — welcome aboard");
      router.push(isFreelancer ? "/freelancer/dashboard" : "/client/dashboard");
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = async () => {
    await persist();
    if (isLast) {
      router.push(isFreelancer ? "/freelancer/dashboard" : "/client/dashboard");
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    i < step ? "bg-emerald-500" : "bg-secondary"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="eyebrow">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
      </div>

      <div className="flex-1">
        {/* ---------- Step 0: basics ---------- */}
        {step === 0 && (
          <>
            <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">
              Let&apos;s set up your {BRAND_NAME} profile
            </h1>
            <p className="mb-8 text-muted-foreground">
              {isFreelancer
                ? "Clients browse the directory before they post work. This is what they'll see first."
                : "Freelancers check who's hiring before they bid. A real name and photo get better proposals."}
            </p>

            <div className="mb-6 flex items-center gap-5">
              <UserAvatar
                name={form.full_name || "You"}
                src={form.avatar_url}
                size={80}
              />
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatar}
                />
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {form.avatar_url ? "Change photo" : "Add a photo"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Profiles with a photo get noticeably more enquiries.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Field
                label={isFreelancer ? "Your name" : "Your name"}
                htmlFor="full_name"
                required
              >
                <input
                  id="full_name"
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Anjali Rao"
                />
              </Field>

              {!isFreelancer && (
                <Field label="Company or organisation" htmlFor="company_name">
                  <input
                    id="company_name"
                    className={inputClass}
                    value={form.company_name}
                    onChange={(e) =>
                      setForm({ ...form, company_name: e.target.value })
                    }
                    placeholder="e.g. Bidar Studios"
                  />
                </Field>
              )}

              <Field
                label="City"
                htmlFor="city"
                hint={
                  isFreelancer
                    ? "Photo and video work is mostly local — this is how clients near you find you."
                    : "Helps us show you freelancers who can actually reach your shoot."
                }
              >
                <CityCombobox
                  id="city"
                  value={form.city}
                  onChange={(c) =>
                    setForm({ ...form, city: c?.name || "", state: c?.state || "" })
                  }
                />
              </Field>
            </div>
          </>
        )}

        {/* ---------- Step 1 (freelancer): craft ---------- */}
        {step === 1 && isFreelancer && (
          <>
            <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">
              What do you do?
            </h1>
            <p className="mb-8 text-muted-foreground">
              Your headline is the one line clients read in search results.
            </p>

            <div className="space-y-5">
              <Field
                label="Headline"
                htmlFor="headline"
                hint="Be specific — “Wedding & event photographer” beats “Creative professional”."
              >
                <input
                  id="headline"
                  className={inputClass}
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="e.g. Wedding & candid photographer"
                />
              </Field>

              <Field
                label="Skills"
                htmlFor="skills"
                hint="Pick at least 3. Clients filter the directory by these."
              >
                <div className="flex flex-wrap gap-2">
                  {skillOptions.slice(0, 30).map((s) => (
                    <ChipToggle
                      key={s}
                      active={form.skills.includes(s)}
                      onClick={() => toggleSkill(s)}
                    >
                      {s}
                    </ChipToggle>
                  ))}
                </div>
              </Field>

              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSkill();
                    }
                  }}
                  placeholder="Add your own skill"
                />
                <Button
                  variant="outline"
                  className="shrink-0 rounded-full"
                  onClick={addCustomSkill}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSkill(s)}
                        aria-label={`Remove ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------- Step 2 (freelancer): rates ---------- */}
        {step === 2 && isFreelancer && (
          <>
            <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">
              What do you charge?
            </h1>
            <p className="mb-8 text-muted-foreground">
              An indicative rate, not a commitment — you still quote per
              project. Profiles without one get skipped.
            </p>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Indicative rate ($ per hour)" htmlFor="hourly_rate">
                  <input
                    id="hourly_rate"
                    type="number"
                    onWheel={blurOnWheel}
                    min={0}
                    className={inputClass}
                    value={form.hourly_rate}
                    onChange={(e) =>
                      setForm({ ...form, hourly_rate: e.target.value })
                    }
                    placeholder="e.g. 1500"
                  />
                </Field>
                <Field label="Years of experience" htmlFor="experience_years">
                  <input
                    id="experience_years"
                    type="number"
                    onWheel={blurOnWheel}
                    min={0}
                    className={inputClass}
                    value={form.experience_years}
                    onChange={(e) =>
                      setForm({ ...form, experience_years: e.target.value })
                    }
                    placeholder="e.g. 4"
                  />
                </Field>
              </div>

              <Field label="Availability" htmlFor="availability">
                <select
                  id="availability"
                  className={selectClass}
                  value={form.availability}
                  onChange={(e) =>
                    setForm({ ...form, availability: e.target.value })
                  }
                >
                  <option value="available">Available for work</option>
                  <option value="limited">Limited availability</option>
                  <option value="unavailable">Not available right now</option>
                </select>
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={form.works_remotely}
                  onChange={(e) =>
                    setForm({ ...form, works_remotely: e.target.checked })
                  }
                />
                <span className="text-sm">
                  <span className="font-medium">I take remote work too</span>
                  <span className="block text-muted-foreground">
                    Editing, retouching, colour grading. You&apos;ll appear in
                    every city&apos;s results, not just {form.city || "your own"}.
                  </span>
                </span>
              </label>
            </div>
          </>
        )}

        {/* ---------- Final step: about ---------- */}
        {isLast && (
          <>
            <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight">
              {isFreelancer ? "Tell clients about your work" : "A quick intro"}
            </h1>
            <p className="mb-8 text-muted-foreground">
              {isFreelancer
                ? "A few sentences on what you shoot, who you've worked with, and how you work."
                : "What kind of work do you hire for? Freelancers use this to decide whether to bid."}
            </p>

            <Field
              label="About"
              htmlFor="bio"
              hint={`${form.bio.length} characters — aim for at least ${isFreelancer ? 80 : 60}.`}
            >
              <textarea
                id="bio"
                className={`${textareaClass} min-h-[180px]`}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder={
                  isFreelancer
                    ? "I shoot weddings and events across Karnataka, mostly candid. Six years in, around 90 weddings. I deliver edited galleries within two weeks and travel anywhere in the state."
                    : "We produce brand content for D2C companies and hire photographers and video editors for monthly campaigns."
                }
              />
            </Field>

            {isFreelancer && (
              <p className="mt-6 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Next: add work to your portfolio. Photographers with samples
                get far more enquiries than those without — you can do it from{" "}
                <span className="font-medium text-foreground">
                  Portfolio
                </span>{" "}
                once you&apos;re in.
              </p>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          variant="ghost"
          className="rounded-full"
          disabled={step === 0 || saving}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-2">
          <button
            onClick={skip}
            disabled={saving}
            className="px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {isLast ? "Finish later" : "Skip"}
          </button>
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={saving}
            onClick={next}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isLast ? "Finish" : "Continue"}
            {!isLast && !saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

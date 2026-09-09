"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  X,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import {
  Field,
  ChipToggle,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import {
  getCategories,
  createDraftProject,
  publishProject,
} from "@/lib/services/projects";
import { Category, Profile } from "@/types/marketplace";
import { LOCATION_PREFS, DURATION_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Nine suggestions, three per craft, rather than the whole skills table.
 *
 * The picker used to render the first forty rows of `skills` in alphabetical
 * order, so it opened on "2D Animation, 3D Animation, Adobe After Effects"
 * and buried the things most shoots actually need thirty chips down. Nine
 * curated ones read as a starting point instead of a dump; everything else
 * goes in through the free text box, which is where a long tail belongs.
 *
 * These names match rows in the skills table, so freelancer filtering keeps
 * working on them.
 */
const SKILL_SUGGESTIONS = [
  {
    label: "Photography",
    skills: ["Wedding Photography", "Event Photography", "Product Photography"],
  },
  {
    label: "Videography",
    skills: ["Wedding Videography", "Event Videography", "Cinematography"],
  },
  {
    label: "Editing",
    skills: ["Video Editing", "Photo Retouching", "Colour Grading"],
  },
];

const STEPS = ["Project details", "Review"] as const;

function Wizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    location_pref: "remote",
    expected_duration: "",
    budget_stated: "",
    skills: [] as string[],
  });


  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data));
  }, []);


  const toggleSkill = (s: string) =>
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s],
    }));

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setCustomSkill("");
  };

  /**
   * Only what a posting genuinely cannot work without: something to call it,
   * a category to file it under, and a number for freelancers to bid against
   * (the publish trigger rejects a project without one).
   *
   * The old minimum lengths -- five characters of title, thirty of
   * description -- and the "at least one skill" rule are gone. They were
   * there to push people towards a better brief, but a form that argues with
   * you is a form people abandon, and a thin brief still gets bids.
   */
  const stepErrors = (): string | null => {
    if (step === 0) {
      if (!form.title.trim()) return "Give your project a title";
      if (!form.category_id) return "Pick a category";
      if (Number(form.budget_stated) <= 0) return "Add the budget you have in mind";
    }
    return null;
  };

  const next = () => {
    const err = stepErrors();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const publish = async () => {
    const err = stepErrors();
    if (err) {
      toast.error(err);
      return;
    }
    setIsPublishing(true);
    try {
      const { data: project, error } = await createDraftProject(profile.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        skills: form.skills,
        location_pref: form.location_pref as any,
        expected_duration: form.expected_duration || null,
        budget_stated: Number(form.budget_stated),
      });
      if (error || !project) throw error || new Error("Could not create project");

      // No milestones here any more. They are drafted on the contract once
      // a freelancer is chosen and the two have talked — see migration 018.
      const { error: pubError } = await publishProject(project.id);
      if (pubError) throw pubError;

      toast.success("Project published — freelancers can start bidding");
      router.push(`/projects/${project.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to publish project");
      setIsPublishing(false);
    }
  };

  const saveDraft = async () => {
    if (!form.title.trim()) {
      toast.error("Add a title before saving a draft");
      return;
    }
    setIsPublishing(true);
    const { data: project, error } = await createDraftProject(profile.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      skills: form.skills,
      location_pref: form.location_pref as any,
      expected_duration: form.expected_duration || null,
      budget_stated: Number(form.budget_stated) || 0,
    });
    if (!error && project) {
      toast.success("Saved as draft");
      router.push("/client/projects");
    } else {
      toast.error(error?.message || "Failed to save draft");
      setIsPublishing(false);
    }
  };


  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="mb-8">
        <p className="eyebrow mb-2">Post a project</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {STEPS[step]}
        </h1>
      </div>

      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                i < step
                  ? "border-ink bg-ink text-paper"
                  : i === step
                    ? "border-brand bg-brand-soft text-brand-deep"
                    : "border-border bg-white text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === step ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-border bg-white p-6 md:p-8">
        {/* ---------- Step 0: everything about the project ----------
             Basics and "Skills & scope" used to be two screens with a
             Continue between them. Splitting eight fields across two steps
             made the form feel longer than it is, and the second screen was
             where people were dropping out. */}
        {step === 0 && (
          <div className="space-y-5">
            <Field
              label="Project title"
              htmlFor="title"
              required
              hint="Specific enough that the right freelancer stops scrolling."
            >
              <input
                id="title"
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Two-day product shoot for a skincare brand"
                maxLength={140}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              hint="What the shoot is, where it is, and what you need delivered."
            >
              <textarea
                id="description"
                className={cn(textareaClass, "min-h-[140px]")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What are you shooting, who is it for, and what does done look like?"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category" htmlFor="category" required>
                <select
                  id="category"
                  className={selectClass}
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Your budget ($)"
                htmlFor="budget_stated"
                required
                hint="Freelancers bid against this. Milestones come later."
              >
                <input
                  id="budget_stated"
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.budget_stated}
                  onChange={(e) => setForm({ ...form, budget_stated: e.target.value })}
                  placeholder="e.g. 2000"
                />
              </Field>

              <Field label="Work location" htmlFor="loc">
                <select
                  id="loc"
                  className={selectClass}
                  value={form.location_pref}
                  onChange={(e) => setForm({ ...form, location_pref: e.target.value })}
                >
                  {LOCATION_PREFS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Expected duration" htmlFor="duration">
                <select
                  id="duration"
                  className={selectClass}
                  value={form.expected_duration}
                  onChange={(e) => setForm({ ...form, expected_duration: e.target.value })}
                >
                  <option value="">Not sure yet</option>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* ---- Skills ---- */}
            <div className="border-t border-border pt-6">
              <p className="mb-1 text-sm font-medium">Skills</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Optional. Tap a few, or type your own.
              </p>

              {form.skills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {form.skills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-paper"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => toggleSkill(sk)}
                        aria-label={`Remove ${sk}`}
                      >
                        <X className="h-3 w-3 opacity-70 hover:opacity-100" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-5 flex gap-2">
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
                  placeholder="Type a skill and press enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={addCustomSkill}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="space-y-3.5">
                {SKILL_SUGGESTIONS.map((group) => {
                  const rest = group.skills.filter((sk) => !form.skills.includes(sk));
                  if (rest.length === 0) return null;
                  return (
                    <div key={group.label}>
                      <p className="eyebrow mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {rest.map((sk) => (
                          <ChipToggle key={sk} active={false} onClick={() => toggleSkill(sk)}>
                            {sk}
                          </ChipToggle>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------- Step 1: Review ---------- */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <p className="eyebrow mb-2">Preview</p>
              <h2 className="font-display mb-3 text-2xl font-semibold leading-snug">
                {form.title}
              </h2>
              <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {form.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[12px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-y border-border py-5 text-sm sm:grid-cols-3">
              {[
                ["Category", categories.find((c) => String(c.id) === form.category_id)?.name || "—"],
                ["Location", LOCATION_PREFS.find((l) => l.value === form.location_pref)?.label],
                ["Duration", form.expected_duration || "Flexible"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="eyebrow mb-1">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="eyebrow mb-4">Milestone structure</p>
              <div className="rounded-xl border border-border bg-white p-6">
                <p className="eyebrow mb-1">Budget</p>
                <p className="font-display text-3xl font-semibold">
                  {form.budget_stated
                    ? `$${Number(form.budget_stated).toLocaleString("en-US")}`
                    : "—"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  You will break this into milestones after choosing a
                  freelancer, once you have discussed the work with them. They
                  confirm the plan before anything starts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
          disabled={isPublishing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={saveDraft}
            disabled={isPublishing}
          >
            Save draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="rounded-full bg-ink px-8 text-paper hover:bg-ink-soft" onClick={next}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="rounded-full bg-ink px-8 text-paper hover:bg-ink-soft"
              onClick={publish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Publish project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return <WorkspaceShell role="client">{(profile) => <Wizard profile={profile} />}</WorkspaceShell>;
}

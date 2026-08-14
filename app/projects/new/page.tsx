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
  Trash2,
  X,
  GripVertical,
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
import { MilestoneList } from "@/components/shared/milestone-list";
import {
  getCategories,
  getSkillsList,
  createDraftProject,

  upsertMilestones,
  publishProject,
} from "@/lib/services/projects";
import { Category, Milestone, Profile } from "@/types/marketplace";
import {
  EXPERIENCE_LEVELS,
  LOCATION_PREFS,
  DURATION_OPTIONS,
} from "@/lib/constants";
import { formatPrice, cn } from "@/lib/utils";

interface DraftMilestone {
  key: string;
  title: string;
  description: string;
  deliverables: string;
  amount: string;
  due_date: string;
}

const STEPS = ["Basics", "Skills & scope", "Milestones", "Review"] as const;

function newMilestone(): DraftMilestone {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    deliverables: "",
    amount: "",
    due_date: "",
  };
}

function Wizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    experience_level: "intermediate",
    location_pref: "remote",
    expected_duration: "",
    deadline: "",
    skills: [] as string[],
  });

  const [milestones, setMilestones] = useState<DraftMilestone[]>([newMilestone()]);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data));
    getSkillsList().then(({ data }) => setSkillOptions(data));
  }, []);

  const total = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);

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

  /* ---- per-step validation ---- */
  const stepErrors = (): string | null => {
    if (step === 0) {
      if (form.title.trim().length < 5) return "Give your project a title of at least 5 characters";
      if (form.description.trim().length < 30)
        return "Add a description of at least 30 characters so freelancers can bid accurately";
      if (!form.category_id) return "Pick a category";
    }
    if (step === 1) {
      if (form.skills.length === 0) return "Add at least one required skill";
    }
    if (step === 2) {
      if (milestones.length === 0) return "Add at least one milestone";
      for (const m of milestones) {
        if (!m.title.trim()) return "Every milestone needs a title";
        if (!Number(m.amount) || Number(m.amount) <= 0)
          return "Every milestone needs a payment amount above zero";
      }
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
        experience_level: form.experience_level as any,
        location_pref: form.location_pref as any,
        expected_duration: form.expected_duration || null,
        deadline: form.deadline || null,
      });
      if (error || !project) throw error || new Error("Could not create project");

      const { error: msError } = await upsertMilestones(
        project.id,
        milestones.map((m) => ({
          title: m.title.trim(),
          description: m.description.trim() || null,
          deliverables: m.deliverables.trim() || null,
          amount: Number(m.amount),
          due_date: m.due_date || null,
        }))
      );
      if (msError) throw msError;

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
    if (form.title.trim().length < 5) {
      toast.error("Add a title before saving a draft");
      return;
    }
    setIsPublishing(true);
    const { data: project, error } = await createDraftProject(profile.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      skills: form.skills,
      experience_level: form.experience_level as any,
      location_pref: form.location_pref as any,
      expected_duration: form.expected_duration || null,
      deadline: form.deadline || null,
    });
    if (!error && project) {
      const valid = milestones.filter((m) => m.title.trim() && Number(m.amount) > 0);
      if (valid.length > 0) {
        await upsertMilestones(
          project.id,
          valid.map((m) => ({
            title: m.title.trim(),
            description: m.description.trim() || null,
            deliverables: m.deliverables.trim() || null,
            amount: Number(m.amount),
            due_date: m.due_date || null,
          }))
        );
      }
      toast.success("Saved as draft");
      router.push("/client/projects");
    } else {
      toast.error(error?.message || "Failed to save draft");
      setIsPublishing(false);
    }
  };

  const previewMilestones: Milestone[] = milestones.map((m, i) => ({
    id: m.key,
    project_id: "",
    seq: i + 1,
    title: m.title || `Milestone ${i + 1}`,
    description: m.description || null,
    deliverables: m.deliverables || null,
    amount: Number(m.amount) || 0,
    due_date: m.due_date || null,
    status: "pending",
    escrow_funded: false,
    revision_note: null,
    submitted_at: null,
    approved_at: null,
    auto_release_at: null,
  }));

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
        {/* ---------- Step 0: Basics ---------- */}
        {step === 0 && (
          <div className="space-y-5">
            <Field
              label="Project title"
              htmlFor="title"
              required
              hint="Write it like a job posting — specific enough that the right freelancer stops scrolling."
            >
              <input
                id="title"
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Build a Shopify storefront for a skincare brand"
                maxLength={140}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              required
              hint="Scope, context, tech constraints, and what 'done' looks like. Vague briefs get vague bids."
            >
              <textarea
                id="description"
                className={cn(textareaClass, "min-h-[180px]")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What are you building, who is it for, what already exists, and what does success look like?"
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
          </div>
        )}

        {/* ---------- Step 1: Skills & scope ---------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">
                Required skills <span className="text-brand">*</span>
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Freelancers filter by these — pick what genuinely matters for the work.
              </p>

              {form.skills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
                  {form.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-paper"
                    >
                      {s}
                      <button type="button" onClick={() => toggleSkill(s)} aria-label={`Remove ${s}`}>
                        <X className="h-3 w-3 opacity-70 hover:opacity-100" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-4 flex gap-2">
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
                  placeholder="Add a skill that isn't listed…"
                />
                <Button type="button" variant="outline" className="shrink-0" onClick={addCustomSkill}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {skillOptions
                  .filter((s) => !form.skills.includes(s))
                  .slice(0, 40)
                  .map((s) => (
                    <ChipToggle key={s} active={false} onClick={() => toggleSkill(s)}>
                      {s}
                    </ChipToggle>
                  ))}
              </div>
            </div>

            <div className="grid gap-5 border-t border-border pt-6 md:grid-cols-2">
              <Field label="Experience level" htmlFor="exp">
                <select
                  id="exp"
                  className={selectClass}
                  value={form.experience_level}
                  onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                >
                  {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label} — {l.hint}
                    </option>
                  ))}
                </select>
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

              <Field label="Overall deadline" htmlFor="deadline" hint="Optional — the date the whole project should be done.">
                <input
                  id="deadline"
                  type="date"
                  className={inputClass}
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ---------- Step 2: Milestones ---------- */}
        {step === 2 && (
          <div>
            <div className="mb-6 rounded-lg border border-border bg-brand-soft p-4 text-sm leading-relaxed text-foreground/80">
              <p className="mb-1 font-semibold text-foreground">How milestone payments work</p>
              Split the project into stages. You fund each milestone into escrow
              before work starts on it, and release payment only after you
              approve the deliverable. Freelancers see this structure before they
              bid — clear milestones get better bids.
            </div>

            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={m.key} className="rounded-xl border border-border p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      Milestone {i + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMilestones((ms) => ms.filter((x) => x.key !== m.key))}
                        className="text-muted-foreground transition-colors hover:text-red-600"
                        aria-label="Remove milestone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Field label="Title" required>
                      <input
                        className={inputClass}
                        value={m.title}
                        onChange={(e) =>
                          setMilestones((ms) =>
                            ms.map((x) => (x.key === m.key ? { ...x, title: e.target.value } : x))
                          )
                        }
                        placeholder="e.g. UI design in Figma"
                      />
                    </Field>

                    <Field label="What's included">
                      <textarea
                        className={cn(textareaClass, "min-h-[80px]")}
                        value={m.description}
                        onChange={(e) =>
                          setMilestones((ms) =>
                            ms.map((x) =>
                              x.key === m.key ? { ...x, description: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Scope of this stage…"
                      />
                    </Field>

                    <Field label="Deliverables" hint="Exactly what the freelancer hands over to close this milestone.">
                      <input
                        className={inputClass}
                        value={m.deliverables}
                        onChange={(e) =>
                          setMilestones((ms) =>
                            ms.map((x) =>
                              x.key === m.key ? { ...x, deliverables: e.target.value } : x
                            )
                          )
                        }
                        placeholder="e.g. Figma file with 6 screens, desktop + mobile"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Payment amount (₹)" required>
                        <input
                          type="number"
                          min="1"
                          className={inputClass}
                          value={m.amount}
                          onChange={(e) =>
                            setMilestones((ms) =>
                              ms.map((x) => (x.key === m.key ? { ...x, amount: e.target.value } : x))
                            )
                          }
                          placeholder="10000"
                        />
                      </Field>
                      <Field label="Due date">
                        <input
                          type="date"
                          className={inputClass}
                          value={m.due_date}
                          onChange={(e) =>
                            setMilestones((ms) =>
                              ms.map((x) => (x.key === m.key ? { ...x, due_date: e.target.value } : x))
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full rounded-lg border-dashed"
              onClick={() => setMilestones((ms) => [...ms, newMilestone()])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add another milestone
            </Button>

            <div className="mt-6 flex items-center justify-between rounded-lg bg-secondary px-5 py-4">
              <span className="text-sm font-medium text-foreground/70">
                Total project budget
              </span>
              <span className="font-display text-2xl font-semibold">{formatPrice(total)}</span>
            </div>
          </div>
        )}

        {/* ---------- Step 3: Review ---------- */}
        {step === 3 && (
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

            <dl className="grid grid-cols-2 gap-4 border-y border-border py-5 text-sm sm:grid-cols-4">
              {[
                ["Category", categories.find((c) => String(c.id) === form.category_id)?.name || "—"],
                ["Experience", EXPERIENCE_LEVELS.find((e) => e.value === form.experience_level)?.label],
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
              <MilestoneList milestones={previewMilestones} />
            </div>

            <div className="rounded-lg border border-border bg-secondary p-4 text-sm leading-relaxed text-muted-foreground">
              Publishing makes this project visible to freelancers immediately.
              You can still edit milestones until you award the project to
              someone.
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

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Camera, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import {
  PageHeader,
  Field,
  SectionCard,
  ChipToggle,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyProfile } from "@/lib/services/auth";
import { updateProfile } from "@/lib/services/profiles";
import { getSkillsList } from "@/lib/services/projects";
import { uploadFile } from "@/lib/services/storage";
import { Profile } from "@/types/marketplace";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";

function ProfileSettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isOnboarding = params.get("onboarding") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    location: "",
    company_name: "",
    website: "",
    hourly_rate: "",
    experience_years: "",
    availability: "available",
    avatar_url: "",
    skills: [] as string[],
  });

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      if (!data) {
        router.push("/login");
        return;
      }
      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        headline: data.headline || "",
        bio: data.bio || "",
        location: data.location || "",
        company_name: data.company_name || "",
        website: data.website || "",
        hourly_rate: data.hourly_rate ? String(data.hourly_rate) : "",
        experience_years: String(data.experience_years ?? 0),
        availability: data.availability || "available",
        avatar_url: data.avatar_url || "",
        skills: data.skills || [],
      });
    });
    getSkillsList().then(({ data }) => setSkillOptions(data));
  }, [router]);

  const isFreelancer = profile?.role === "freelancer";

  const toggleSkill = (s: string) =>
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s],
    }));

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;
    if (!form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setCustomSkill("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.full_name.trim()) {
      toast.error("Your name is required");
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile(profile.id, {
      full_name: form.full_name.trim(),
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      company_name: form.company_name.trim() || null,
      website: form.website.trim() || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      experience_years: Number(form.experience_years) || 0,
      availability: form.availability as Profile["availability"],
      avatar_url: form.avatar_url || null,
      skills: form.skills,
    });
    setIsSaving(false);

    if (error) {
      toast.error(error.message || "Failed to save profile");
      return;
    }
    toast.success("Profile saved");
    if (isOnboarding) {
      router.push(isFreelancer ? "/freelancer/dashboard" : "/client/dashboard");
    }
  };

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        eyebrow={isOnboarding ? "Step 2 of 2" : "Settings"}
        title={isOnboarding ? "Set up your profile" : "Your profile"}
        description={
          isFreelancer
            ? "Clients read this before they read your bid. Specific beats generic."
            : "Freelancers check who they'd be working with before bidding."
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <SectionCard title="Identity" description="Name, photo, and how you introduce yourself.">
          <div className="mb-8 flex items-center gap-5">
            <UserAvatar name={form.full_name || "?"} src={form.avatar_url} size={80} />
            <div>
              <label
                htmlFor="avatar"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-ink/40"
              >
                <Camera className="h-4 w-4" />
                Upload photo
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("Image must be under 5MB");
                    return;
                  }
                  toast.info("Uploading…");
                  const { url, error } = await uploadFile("avatars", profile.id, file);
                  if (error || !url) toast.error("Upload failed");
                  else {
                    setForm((f) => ({ ...f, avatar_url: url }));
                    toast.success("Photo uploaded");
                  }
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, under 5MB.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label={isFreelancer ? "Full name" : "Your name"} htmlFor="full_name" required>
              <input
                id="full_name"
                className={inputClass}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder={isFreelancer ? "e.g. Priya Sharma" : "e.g. Rahul Mehta"}
                required
              />
            </Field>

            <Field label="Location" htmlFor="location">
              <input
                id="location"
                className={inputClass}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Bangalore, India"
              />
            </Field>
          </div>

          {isFreelancer ? (
            <div className="mt-5">
              <Field
                label="Professional headline"
                htmlFor="headline"
                hint="One line that says what you do and for whom."
              >
                <input
                  id="headline"
                  className={inputClass}
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="e.g. Full-stack developer specialising in Next.js commerce builds"
                />
              </Field>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Company / organisation" htmlFor="company_name">
                <input
                  id="company_name"
                  className={inputClass}
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="e.g. Meridian Retail"
                />
              </Field>
              <Field label="Website" htmlFor="website">
                <input
                  id="website"
                  className={inputClass}
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                />
              </Field>
            </div>
          )}

          <div className="mt-5">
            <Field
              label="About"
              htmlFor="bio"
              hint={
                isFreelancer
                  ? "What you build, who you've built it for, and how you work."
                  : "What your business does and the kind of work you hire for."
              }
            >
              <textarea
                id="bio"
                className={textareaClass}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </Field>
          </div>
        </SectionCard>

        {isFreelancer && (
          <>
            <SectionCard
              title="Rates & availability"
              description="Helps clients gauge fit before they read your bid."
            >
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Indicative hourly rate (₹)" htmlFor="hourly_rate">
                  <input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                    placeholder="1500"
                  />
                </Field>
                <Field label="Years of experience" htmlFor="experience_years">
                  <input
                    id="experience_years"
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.experience_years}
                    onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                  />
                </Field>
                <Field label="Availability" htmlFor="availability">
                  <select
                    id="availability"
                    className={selectClass}
                    value={form.availability}
                    onChange={(e) => setForm({ ...form, availability: e.target.value })}
                  >
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title="Skills"
              description="Projects are matched to these — pick everything you genuinely offer."
            >
              {form.skills.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-5">
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
                  placeholder="Add a skill that isn't listed…"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-md"
                  onClick={addCustomSkill}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {skillOptions
                  .filter((s) => !form.skills.includes(s))
                  .map((s) => (
                    <ChipToggle key={s} active={false} onClick={() => toggleSkill(s)}>
                      {s}
                    </ChipToggle>
                  ))}
              </div>
            </SectionCard>
          </>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-ink px-8 text-paper hover:bg-ink-soft"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isOnboarding ? "Save and continue" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <WorkspaceShellFree>
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        }
      >
        <ProfileSettingsInner />
      </Suspense>
    </WorkspaceShellFree>
  );
}

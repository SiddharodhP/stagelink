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
  blurOnWheel,
} from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyProfile } from "@/lib/services/auth";
import { updateProfile, getMyBilling } from "@/lib/services/profiles";
import { CityCombobox } from "@/components/shared/city-combobox";
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
    city: "",
    state: "",
    works_remotely: false,
    travel_radius_km: "",
    company_name: "",
    website: "",
    hourly_rate: "",
    experience_years: "",
    availability: "available",
    avatar_url: "",
    skills: [] as string[],
    billing_address: "",
    billing_email: "",
    phone: "",
    tax_id: "",
    tax_id_label: "GSTIN",
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
        city: data.city || "",
        state: data.state || "",
        works_remotely: Boolean(data.works_remotely),
        travel_radius_km: data.travel_radius_km ? String(data.travel_radius_km) : "",
        company_name: data.company_name || "",
        website: data.website || "",
        hourly_rate: data.hourly_rate ? String(data.hourly_rate) : "",
        experience_years: String(data.experience_years ?? 0),
        availability: data.availability || "available",
        avatar_url: data.avatar_url || "",
        skills: data.skills || [],
        // Billing arrives separately — see below.
        billing_address: "",
        billing_email: "",
        phone: "",
        tax_id: "",
        tax_id_label: "GSTIN",
      });
    });

    // Column-level SELECT on the billing block is revoked (migration 011),
    // so these can't ride along on the profile read any more.
    getMyBilling().then(({ data }) => {
      if (!data) return;
      setForm((f) => ({
        ...f,
        billing_address: data.billing_address || "",
        billing_email: data.billing_email || "",
        phone: data.phone || "",
        tax_id: data.tax_id || "",
        tax_id_label: data.tax_id_label || "GSTIN",
      }));
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
      city: form.city || null,
      state: form.state || null,
      works_remotely: form.works_remotely,
      travel_radius_km: form.travel_radius_km
        ? Number(form.travel_radius_km)
        : null,
      company_name: form.company_name.trim() || null,
      website: form.website.trim() || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      experience_years: Number(form.experience_years) || 0,
      availability: form.availability as Profile["availability"],
      avatar_url: form.avatar_url || null,
      skills: form.skills,
      billing_address: form.billing_address.trim() || null,
      billing_email: form.billing_email.trim() || null,
      phone: form.phone.trim() || null,
      tax_id: form.tax_id.trim() || null,
      tax_id_label: form.tax_id_label.trim() || "Tax ID",
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-foreground/40"
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

            <Field
              label="City"
              htmlFor="city"
              hint="Clients filter the directory by city, so pick the closest one."
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

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Area or neighbourhood"
              htmlFor="location"
              hint="Optional, free text. Shown on your profile."
            >
              <input
                id="location"
                className={inputClass}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Indiranagar"
              />
            </Field>

            {isFreelancer && (
              <Field
                label="Willing to travel (km)"
                htmlFor="travel_radius_km"
                hint="Leave blank if you only work in your own city."
              >
                <input
                  id="travel_radius_km"
                  type="number"
                  onWheel={blurOnWheel}
                  min={0}
                  max={5000}
                  className={inputClass}
                  value={form.travel_radius_km}
                  onChange={(e) =>
                    setForm({ ...form, travel_radius_km: e.target.value })
                  }
                  placeholder="e.g. 150"
                />
              </Field>
            )}
          </div>

          {isFreelancer && (
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[color:var(--brand,#d6440f)]"
                checked={form.works_remotely}
                onChange={(e) =>
                  setForm({ ...form, works_remotely: e.target.checked })
                }
              />
              <span className="text-sm">
                <span className="font-medium">I take remote work too</span>
                <span className="block text-muted-foreground">
                  Editing, retouching, colour grading — anything not tied to a
                  location. You&apos;ll show up in every city&apos;s results.
                </span>
              </span>
            </label>
          )}

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
                  placeholder="e.g. Wedding & event photographer, candid and documentary style"
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
                <Field label="Indicative hourly rate ($)" htmlFor="hourly_rate">
                  <input
                    id="hourly_rate"
                    type="number"
                    onWheel={blurOnWheel}
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
                    onWheel={blurOnWheel}
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground"
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

        {/* Appears on every invoice. Snapshotted at issue time, so editing
            these later never alters an invoice you've already sent. */}
        <SectionCard
          title="Billing details"
          description="Shown on invoices and receipts. Leave blank to omit a line."
        >
          <div className="space-y-5">
            <Field
              label="Billing address"
              htmlFor="billing_address"
              hint="Appears under your name on the invoice."
            >
              <textarea
                id="billing_address"
                className={`${textareaClass} min-h-[80px]`}
                value={form.billing_address}
                onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                placeholder={"e.g. 14 MG Road\nBangalore, Karnataka 560001\nIndia"}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Billing email" htmlFor="billing_email">
                <input
                  id="billing_email"
                  type="email"
                  className={inputClass}
                  value={form.billing_email}
                  onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
                  placeholder="accounts@example.com"
                />
              </Field>

              <Field label="Phone" htmlFor="phone">
                <input
                  id="phone"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-[160px_1fr]">
              <Field label="Tax ID type" htmlFor="tax_id_label">
                <select
                  id="tax_id_label"
                  className={selectClass}
                  value={form.tax_id_label}
                  onChange={(e) => setForm({ ...form, tax_id_label: e.target.value })}
                >
                  {["GSTIN", "PAN", "VAT No.", "Tax ID", "ABN", "EIN"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Tax ID number"
                htmlFor="tax_id"
                hint="Optional. Displayed as-is — it isn't validated or filed for you."
              >
                <input
                  id="tax_id"
                  className={inputClass}
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  placeholder="29ABCDE1234F1Z5"
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90"
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

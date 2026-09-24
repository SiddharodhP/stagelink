"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Images, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  Field,
  inputClass,
  textareaClass,
  ChipToggle,
} from "@/components/shared/dashboard-ui";
import { SkillTags } from "@/components/shared/marketplace-ui";
import {
  getPortfolio,
  addPortfolioItem,
  deletePortfolioItem,
} from "@/lib/services/profiles";
import { uploadFile } from "@/lib/services/storage";
import { PortfolioItem, Profile } from "@/types/marketplace";

function PortfolioPage({ profile }: { profile: Profile }) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    skills: [] as string[],
  });

  const load = () =>
    getPortfolio(profile.id).then(({ data }) => {
      setItems(data);
      setLoading(false);
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const reset = () => {
    setForm({ title: "", description: "", image_url: "", link_url: "", skills: [] });
    setOpen(false);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Give this piece a title");
    setSaving(true);
    const { error } = await addPortfolioItem({
      freelancer_id: profile.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      image_url: form.image_url || undefined,
      link_url: form.link_url.trim() || undefined,
      skills: form.skills,
    });
    setSaving(false);
    if (error) return toast.error(error.message || "Could not save");
    toast.success("Added to your portfolio");
    reset();
    load();
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await deletePortfolioItem(id);
    if (error) {
      toast.error("Could not delete");
      load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="Portfolio"
        description="Proof of what you can do — clients look here before awarding work."
        action={
          <Button
            className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add work
          </Button>
        }
      />

      {loading ? (
        <SkeletonRows count={2} height={220} />
      ) : items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="card-lift group overflow-hidden rounded-xl border border-border bg-card"
            >
              {item.image_url ? (
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft">
                  <Images className="h-8 w-8 text-brand/50" />
                </div>
              )}

              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{item.title}</h3>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label="Delete portfolio item"
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 dark:hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.description && (
                  <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {item.skills.length > 0 && <SkillTags skills={item.skills} max={3} />}
                {item.link_url && (
                  <a
                    href={item.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="link-editorial mt-3 inline-flex items-center gap-1 text-sm"
                  >
                    View live <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyCard
          icon={Images}
          title="Your portfolio is empty"
          description="Add 3–4 pieces that show the kind of work you want more of. Clients weigh portfolios heavily when bids are close on price."
          actionLabel="Add your first piece"
          onAction={() => setOpen(true)}
        />
      )}

      <Dialog open={open} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add portfolio piece</DialogTitle>
            <DialogDescription>
              Show the outcome, not just the artefact — what problem did this solve?
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            <Field label="Title" required>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Product shoot for a D2C skincare brand"
              />
            </Field>

            <Field label="Description">
              <textarea
                className={textareaClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What you shot or edited, your role, and how it was used."
              />
            </Field>

            <Field label="Cover image">
              <input
                type="file"
                accept="image/*"
                className={`${inputClass} py-2.5 file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs`}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
                  toast.info("Uploading…");
                  const { url, error } = await uploadFile("portfolio", profile.id, file);
                  if (error || !url) toast.error("Upload failed");
                  else {
                    setForm((f) => ({ ...f, image_url: url }));
                    toast.success("Image uploaded");
                  }
                }}
              />
            </Field>

            <Field label="Link" hint="Live site, repo, case study — optional.">
              <input
                className={inputClass}
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://"
              />
            </Field>

            {profile.skills.length > 0 && (
              <Field label="Skills used">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <ChipToggle
                      key={s}
                      active={form.skills.includes(s)}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          skills: f.skills.includes(s)
                            ? f.skills.filter((x) => x !== s)
                            : [...f.skills, s],
                        }))
                      }
                    >
                      {s}
                    </ChipToggle>
                  ))}
                </div>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={reset}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={save}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FreelancerPortfolioPage() {
  return (
    <WorkspaceShell role="freelancer">
      {(profile) => <PortfolioPage profile={profile} />}
    </WorkspaceShell>
  );
}

import type { Metadata } from "next";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getProfileForSeo } from "@/lib/seo-data";
import { JsonLd } from "@/components/shared/json-ld";
import { displayName } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfileForSeo(id);

  if (!profile || !profile.role) {
    return buildMetadata({
      title: "Profile not found",
      description: "This profile is unavailable.",
      path: `/u/${id}`,
      noIndex: true,
    });
  }

  const isFreelancer = profile.role === "freelancer";
  const name = displayName(profile);
  const skills = profile.skills.slice(0, 5).join(", ");

  const title = isFreelancer
    ? `${name}${profile.headline ? ` — ${profile.headline}` : " — Freelancer"}`
    : `${profile.company_name || name} — Client on Roster`;

  const description = isFreelancer
    ? (profile.bio?.replace(/\s+/g, " ").slice(0, 150) ||
        `Hire ${name}${skills ? `, freelancer skilled in ${skills}` : ""}. Milestone-based contracts with escrow-protected payments.`)
    : `${profile.company_name || name} hires freelancers on Roster with milestone-based, escrow-protected contracts.`;

  // Thin, unfilled profiles hurt more than they help — keep them out of
  // the index until there's real content to rank.
  const isThin = !profile.full_name || (isFreelancer && !profile.headline && !profile.bio);

  return buildMetadata({
    title,
    description,
    path: `/u/${id}`,
    keywords: isFreelancer
      ? [
          `hire ${name}`,
          ...profile.skills.slice(0, 6).map((s) => `${s} freelancer`),
        ]
      : undefined,
    noIndex: isThin,
    type: "profile",
  });
}

export default async function ProfileLayout({ params, children }: Props) {
  const { id } = await params;
  const profile = await getProfileForSeo(id);

  const structured: object[] = [];
  if (profile?.role === "freelancer" && profile.full_name) {
    structured.push(
      personJsonLd({
        id: profile.id,
        name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills,
        avatarUrl: profile.avatar_url,
        rating: profile.avg_rating,
        reviewCount: profile.total_reviews,
      })
    );
    structured.push(
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: profile.full_name, path: `/u/${id}` },
      ])
    );
  }

  return (
    <>
      {structured.length > 0 && <JsonLd data={structured} />}
      {children}
    </>
  );
}

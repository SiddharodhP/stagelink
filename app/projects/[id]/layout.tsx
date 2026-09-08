import type { Metadata } from "next";
import { buildMetadata, jobPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getProjectForSeo } from "@/lib/seo-data";
import { JsonLd } from "@/components/shared/json-ld";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectForSeo(id);

  if (!project) {
    return buildMetadata({
      title: "Project not found",
      description: "This project may have been removed or is no longer public.",
      path: `/projects/${id}`,
      noIndex: true,
    });
  }

  // Only open projects belong in the index — an awarded or completed
  // project is a dead end for searchers and a soft-404 signal to Google.
  const isOpen = project.status === "open";

  const budget = project.budget_total
    ? `$${project.budget_total.toLocaleString("en-US")}`
    : "Budget on request";
  const desc = project.description
    ? project.description.replace(/\s+/g, " ").slice(0, 155)
    : `${budget} freelance project with milestone-based escrow payments.`;

  return buildMetadata({
    title: `${project.title} — ${budget} Freelance Project`,
    description: desc,
    path: `/projects/${id}`,
    keywords: [
      ...project.skills.slice(0, 8).map((s) => `freelance ${s}`),
      project.category_name ? `${project.category_name} freelance project` : "",
    ].filter(Boolean),
    noIndex: !isOpen,
    type: "article",
  });
}

export default async function ProjectLayout({ params, children }: Props) {
  const { id } = await params;
  const project = await getProjectForSeo(id);

  const structured: object[] = [];
  if (project && project.status === "open") {
    structured.push(
      jobPostingJsonLd({
        id: project.id,
        title: project.title,
        description: project.description,
        postedAt: project.published_at,
        deadline: project.deadline,
        budget: project.budget_total,
        clientName: project.client_name,
        locationPref: project.location_pref,
        skills: project.skills,
      })
    );
    structured.push(
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Projects", path: "/projects" },
        { name: project.title, path: `/projects/${id}` },
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

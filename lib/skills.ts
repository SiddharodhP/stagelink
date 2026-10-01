/**
 * Skill groups, as stored in `skills.category` (migration 027).
 *
 * The slugs live in the database so the directory and the category pages can
 * filter on them; the labels live here because they are interface copy and
 * have no business in a table.
 */

export type SkillOption = {
  name: string;
  /** Null for skills a user typed that are not in the catalogue. */
  category: string | null;
};

/** Shooting first, then post, then the tools — the order of a real job. */
export const SKILL_GROUP_ORDER = [
  "photography",
  "videography",
  "production",
  "editing",
  "software",
] as const;

export const SKILL_GROUP_LABELS: Record<string, string> = {
  photography: "Photography",
  videography: "Videography",
  production: "On set & production",
  editing: "Editing & post",
  software: "Software & tools",
  other: "Other",
};

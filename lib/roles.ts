/**
 * Which side of the marketplace someone is on, and what colour that is.
 *
 * Orange is the freelancer side, blue the client side. The pairing is set on
 * the homepage's two panels, and everything that shows a role reuses it, so
 * the colour becomes a reliable signal rather than decoration: blue on a card
 * means "this is someone who hires" wherever you meet it.
 *
 * Class names are written out in full rather than built from the role string.
 * Tailwind scans source text for complete class names, so `text-${role}` would
 * compile to nothing at all.
 */

export type PartyRole = "client" | "freelancer";

export type RoleAccent = {
  /** The role's colour as text. */
  text: string;
  /**
   * The same, forced. `.eyebrow` sets its own colour in globals.css and, at
   * equal specificity, later source wins -- so a plain `text-*` utility loses
   * to it. Written out rather than built with a template string, for the same
   * reason the others are.
   */
  textImportant: string;
  /**
   * Filled: white text on the colour. Uses a deeper shade than `text`,
   * because the shade that reads well AS text on a dark page is far too
   * light to sit BEHIND white text.
   */
  solid: string;
  /** A wash of the colour, for chips and quiet panels. */
  soft: string;
  /** The colour as a border. */
  border: string;
  /** A ring, for avatars and focus states. */
  ring: string;
  /** Border on hover, for cards that link to a person. */
  hoverBorder: string;
  /** What to call this side in the interface. */
  label: string;
};

const FREELANCER: RoleAccent = {
  text: "text-freelancer",
  textImportant: "!text-freelancer",
  solid: "bg-freelancer-solid text-white",
  soft: "bg-freelancer-soft text-freelancer",
  border: "border-freelancer",
  ring: "ring-freelancer",
  hoverBorder: "hover:border-freelancer",
  label: "Freelancer",
};

const CLIENT: RoleAccent = {
  text: "text-client",
  textImportant: "!text-client",
  solid: "bg-client-solid text-white",
  soft: "bg-client-soft text-client",
  border: "border-client",
  ring: "ring-client",
  hoverBorder: "hover:border-client",
  label: "Client",
};

/** Neutral, for admins and anyone who has not picked a side yet. */
const NEUTRAL: RoleAccent = {
  text: "text-muted-foreground",
  textImportant: "!text-muted-foreground",
  solid: "bg-primary text-primary-foreground",
  soft: "bg-secondary text-foreground/70",
  border: "border-border",
  ring: "ring-border",
  hoverBorder: "hover:border-foreground/20",
  label: "Member",
};

export function roleAccent(role: string | null | undefined): RoleAccent {
  if (role === "freelancer") return FREELANCER;
  if (role === "client") return CLIENT;
  return NEUTRAL;
}

/** True only for the two sides that carry a colour. */
export function isPartyRole(role: string | null | undefined): role is PartyRole {
  return role === "client" || role === "freelancer";
}

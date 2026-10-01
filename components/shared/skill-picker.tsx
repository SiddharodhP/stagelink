"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

import { getSkillCatalog } from "@/lib/services/projects";
import { SKILL_GROUP_LABELS, SKILL_GROUP_ORDER, type SkillOption } from "@/lib/skills";
import { inputClass } from "@/components/shared/dashboard-ui";
import { cn } from "@/lib/utils";

/**
 * One searchable, grouped dropdown for picking skills.
 *
 * Replaces three different answers to the same question: the project wizard
 * hard-coded nine skills, onboarding showed the first thirty alphabetically,
 * and settings rendered every one of them as a wall of chips you had to read
 * end to end. With a catalogue of 180 none of those scale, and all three
 * hid the thing people actually look for -- a named tool like Canva or
 * DaVinci Resolve.
 *
 * Typing filters across every group at once, so you do not have to know
 * whether "Lightroom" files under editing or software. Anything not in the
 * catalogue can still be added verbatim; freelancers name tools we have not
 * heard of, and refusing them would quietly flatten the directory.
 */
export function SkillPicker({
  value,
  onChange,
  max,
  id = "skills",
  placeholder = "Search skills, or type your own…",
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Cap, if the surface wants one. Omitted means no limit. */
  max?: number;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [catalog, setCatalog] = useState<SkillOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  /**
   * Where the list fits, measured rather than assumed. A fixed drop of 20rem
   * ran off the bottom of the window whenever the field sat low on the page,
   * and the last groups were unreachable.
   */
  const [drop, setDrop] = useState({ up: false, maxHeight: 320 });
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSkillCatalog().then(({ data }) => setCatalog(data));
  }, []);

  // Re-measured on scroll and resize, so the list stays inside the window
  // while it is open rather than only at the moment it opened. Capture phase,
  // because the field can sit inside its own scrolling panel.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = inputRef.current;
      const box = boxRef.current;
      if (!el || !box) return;
      const r = el.getBoundingClientRect();
      const GAP = 6;
      const EDGE = 12;
      // Down hangs off the input; up hangs off the whole control, because
      // the chosen-skill chips sit above the input and the list clears them
      // too. Measuring both from the input would over-report the room above
      // by however many rows of chips there are.
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = box.getBoundingClientRect().top - GAP - EDGE;
      // Only flip when below is genuinely cramped AND above is roomier,
      // so the list does not jump sides over a few pixels.
      const up = below < 220 && above > below;
      setDrop({
        up,
        maxHeight: Math.max(160, Math.min(320, up ? above : below)),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const term = query.trim().toLowerCase();
  const full = max != null && value.length >= max;

  /**
   * Grouped, filtered, and flattened in the same pass. `flat` is what the
   * arrow keys walk; the groups are only how it is drawn, so the two can
   * never disagree about which row is highlighted.
   */
  const { groups, flat } = useMemo(() => {
    const chosen = new Set(value);
    const buckets = new Map<string, string[]>();

    for (const s of catalog) {
      if (chosen.has(s.name)) continue;
      if (term && !s.name.toLowerCase().includes(term)) continue;
      const key = s.category ?? "other";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s.name);
    }

    const ordered = [...SKILL_GROUP_ORDER, "other"]
      .filter((k) => buckets.has(k))
      .map((k) => ({ key: k, label: SKILL_GROUP_LABELS[k] ?? "Other", skills: buckets.get(k)! }));

    return { groups: ordered, flat: ordered.flatMap((g) => g.skills) };
  }, [catalog, value, term]);

  // Offering to add something already in the list, or already chosen, is
  // just a second way to do the same thing.
  const exact = query.trim();
  const canAddCustom =
    exact.length > 1 &&
    !value.some((v) => v.toLowerCase() === exact.toLowerCase()) &&
    !catalog.some((s) => s.name.toLowerCase() === exact.toLowerCase());

  const add = (skill: string) => {
    if (full || value.includes(skill)) return;
    onChange([...value, skill]);
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  };

  const remove = (skill: string) => onChange(value.filter((s) => s !== skill));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && query === "" && value.length) {
      remove(value[value.length - 1]);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const total = flat.length + (canAddCustom ? 1 : 0);
    if (total === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < flat.length) add(flat[highlight]);
      else if (canAddCustom) add(exact);
    }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {/* ---- What is already chosen ---- */}
      {value.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2">
          {value.map((s) => (
            <li key={s}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-1 pl-3 pr-1.5 text-[13px] font-medium">
                {s}
                <button
                  type="button"
                  onClick={() => remove(s)}
                  aria-label={`Remove ${s}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          className={`${inputClass} pl-11 pr-10`}
          value={query}
          disabled={full}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={full ? `You have picked ${max}` : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close skill list" : "Open skill list"}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && !full && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Skills"
          className={cn(
            "absolute left-0 z-30 w-full overflow-y-auto overscroll-contain rounded-xl border border-border bg-card py-1.5 shadow-lg",
            drop.up ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
          style={{ maxHeight: drop.maxHeight }}
        >
          {canAddCustom && (
            <button
              type="button"
              role="option"
              aria-selected={highlight === flat.length}
              onMouseEnter={() => setHighlight(flat.length)}
              onClick={() => add(exact)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                highlight === flat.length ? "bg-secondary" : "hover:bg-secondary"
              )}
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-brand" />
              Add <span className="font-semibold">“{exact}”</span>
            </button>
          )}

          {groups.map((g) => (
            <div key={g.key}>
              <p className="eyebrow sticky top-0 bg-card px-4 pb-1 pt-2.5">{g.label}</p>
              {g.skills.map((s) => {
                const i = flat.indexOf(s);
                return (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => add(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors",
                      i === highlight ? "bg-secondary" : "hover:bg-secondary"
                    )}
                  >
                    <span className="min-w-0 truncate">{s}</span>
                    {i === highlight && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {groups.length === 0 && !canAddCustom && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {term ? `No skill matches “${query.trim()}”.` : "Every skill is already picked."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

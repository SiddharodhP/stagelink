"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Check, X } from "lucide-react";

import { searchCities } from "@/lib/services/profiles";
import { City } from "@/types/marketplace";
import { inputClass } from "@/components/shared/dashboard-ui";
import { cn } from "@/lib/utils";

/**
 * Searchable city picker.
 *
 * A plain <select> worked while the list was 53 hand-seeded Indian cities.
 * It is worldwide now — roughly 34,000 rows — so selection has to be a
 * typeahead. Results are ranked server-side by prefix match then
 * population, which is why "lond" gives London before Villa London.
 *
 * Controlled by city NAME rather than id, because that is what
 * profiles.city stores and what the directory filters on.
 */
export function CityCombobox({
  value,
  onChange,
  id = "city",
  placeholder = "Start typing a city…",
  className,
}: {
  value: string;
  onChange: (city: { name: string; state: string | null } | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced, and cancellable so a slow early response can't overwrite a
  // later one for different input.
  const term = query.trim();
  const tooShort = term.length < 2;

  useEffect(() => {
    if (tooShort) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchCities(term).then(({ data }) => {
        if (cancelled) return;
        setResults(data);
        setHighlight(0);
        setLoading(false);
      });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, tooShort]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const pick = (c: City) => {
    onChange({ name: c.name, state: c.state });
    setQuery("");
    setOpen(false);
  };

  // A chosen city reads as a chip, so it's obvious the value is committed
  // rather than sitting unsaved in the input.
  if (value) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-2 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {value}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            aria-label={`Clear ${value}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          className={`${inputClass} pl-11`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value.trim().length >= 2) setLoading(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && !tooShort && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-card py-1.5 shadow-lg"
        >
          {!tooShort && results.length > 0 ? (
            results.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(c)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors",
                    i === highlight ? "bg-secondary" : "hover:bg-secondary"
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.state ? `, ${c.state}` : ""}
                      {c.country ? `, ${c.country}` : ""}
                    </span>
                  </span>
                  {i === highlight && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))
          ) : loading ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Searching…</li>
          ) : (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No match for “{term}”. Try the nearest larger town —
              the list covers everywhere above 15,000 people.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

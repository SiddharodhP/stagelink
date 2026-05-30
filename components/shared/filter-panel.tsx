"use client";

import { X } from "lucide-react";
import { useFilterStore } from "@/store/filter-store";
import { GENRES, CITIES, BUDGET_RANGES, TEAM_SIZES, LANGUAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function FilterPanel() {
  const { 
    city, setCity, 
    genres, toggleGenre, 
    budgetMin, budgetMax, setBudgetRange,
    teamSize, setTeamSize,
    languages, toggleLanguage,
    resetFilters
  } = useFilterStore();

  return (
    <div className="flex flex-col space-y-8 p-6 glass-card border-white/10 h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetFilters}
          className="text-xs text-zinc-400 hover:text-white"
        >
          Reset all
        </Button>
      </div>

      {/* City Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-white">Location</Label>
        <select 
          className="w-full bg-black/40 border border-white/10 rounded-md p-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Any City</option>
          {CITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Genre Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-white">Genres</Label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                genres.includes(genre)
                  ? "bg-purple-500/20 border-purple-500 text-purple-200"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-white">Starting Price</Label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm text-zinc-400 cursor-pointer">
            <input 
              type="radio" 
              checked={budgetMin === 0 && budgetMax === Infinity}
              onChange={() => setBudgetRange(0, Infinity)}
              className="accent-purple-500" 
            />
            <span>Any Budget</span>
          </label>
          {BUDGET_RANGES.map(range => (
            <label key={range.label} className="flex items-center space-x-2 text-sm text-zinc-400 cursor-pointer">
              <input 
                type="radio" 
                checked={budgetMin === range.min && budgetMax === range.max}
                onChange={() => setBudgetRange(range.min, range.max)}
                className="accent-purple-500" 
              />
              <span>{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Team Size Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-white">Act Size</Label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm text-zinc-400 cursor-pointer">
            <input 
              type="radio" 
              checked={teamSize === ''}
              onChange={() => setTeamSize('')}
              className="accent-purple-500" 
            />
            <span>Any Size</span>
          </label>
          {TEAM_SIZES.map(size => (
            <label key={size.value} className="flex items-center space-x-2 text-sm text-zinc-400 cursor-pointer">
              <input 
                type="radio" 
                checked={teamSize === size.value}
                onChange={() => setTeamSize(size.value)}
                className="accent-purple-500" 
              />
              <span>{size.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Language Filter */}
      <div className="space-y-3 pb-8">
        <Label className="text-sm font-medium text-white">Languages</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => toggleLanguage(lang)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                languages.includes(lang)
                  ? "bg-purple-500/20 border-purple-500 text-purple-200"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

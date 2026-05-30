"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useFilterStore } from "@/store/filter-store";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Search for artists, genres, or cities...", className }: SearchBarProps) {
  const { search, setSearch } = useFilterStore();
  const [localValue, setLocalValue] = useState(search);
  const debouncedSearch = useDebounce(localValue, 500);

  // Sync with store when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // Sync local state if store is reset externally
  useEffect(() => {
    setLocalValue(search);
  }, [search]);

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-purple-400 transition-colors" />
      </div>
      
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 h-12 rounded-full border-white/20 bg-white/5 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 shadow-inner"
      />
      
      {localValue && (
        <button
          onClick={() => setLocalValue("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

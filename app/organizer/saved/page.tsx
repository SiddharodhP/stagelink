"use client";

import { useEffect, useState } from "react";
import { Search, Heart, Music } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSavedStore } from "@/store/saved-store";
import { MusicianCard } from "@/components/shared/musician-card";
import { getMusicianProfilesByIds } from "@/lib/services/musicians";
import { MusicianCardData } from "@/types/database";
import { MusicianGridSkeleton } from "@/components/shared/loading-skeleton";

export default function SavedArtistsPage() {
  const { savedArtists } = useSavedStore();
  const [latestArtists, setLatestArtists] = useState<MusicianCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      if (savedArtists.length > 0) {
        const ids = savedArtists.map(a => a.id);
        const { data } = await getMusicianProfilesByIds(ids);
        if (data) {
          const latestMap = new Map(data.map(d => [d.id, d]));
          const merged = savedArtists.map(a => latestMap.get(a.id) || a);
          setLatestArtists(merged);
        } else {
          setLatestArtists(savedArtists);
        }
      } else {
        setLatestArtists([]);
      }
      setLoading(false);
    }
    fetchLatest();
  }, [savedArtists]);

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Saved Artists</h1>
        <p className="text-zinc-400">Keep track of musicians you're interested in booking.</p>
      </div>

      {savedArtists.length > 0 ? (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search saved artists..." 
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               <MusicianGridSkeleton />
            ) : (
              latestArtists.map((artist, idx) => (
                <div key={artist.id} className="h-full">
                  <MusicianCard musician={artist} index={idx} />
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-card border-dashed border-2 border-white/10 rounded-xl">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <Heart className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">No saved artists</h3>
          <p className="max-w-md text-sm text-zinc-400">
            You haven't saved any musicians yet. Browse our talent pool and click the heart icon to save your favorites!
          </p>
          <Button asChild className="mt-6 bg-pink-600 hover:bg-pink-700">
            <Link href="/musicians">Browse Artists</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

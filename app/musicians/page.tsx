"use client";

import { useEffect, useState } from "react";
import { Filter, ChevronDown, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MusicianCard } from "@/components/shared/musician-card";
import { SearchBar } from "@/components/shared/search-bar";
import { FilterPanel } from "@/components/shared/filter-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { MusicianGridSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getMusicianProfiles } from "@/lib/services/musicians";
import { useFilterStore } from "@/store/filter-store";
import { MusicianCardData } from "@/types/database";

export default function MusiciansPage() {
  const [musicians, setMusicians] = useState<MusicianCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get filter state from store
  const filters = useFilterStore();
  
  useEffect(() => {
    let isMounted = true;
    
    async function fetchMusicians() {
      setIsLoading(true);
      const { data, count, error } = await getMusicianProfiles(filters);
      
      if (isMounted) {
        if (!error && data) {
          setMusicians(data);
          setTotalCount(count || 0);
        } else {
          setMusicians([]);
          setTotalCount(0);
        }
        setIsLoading(false);
      }
    }
    
    fetchMusicians();
    
    return () => {
      isMounted = false;
    };
  }, [
    filters.search, 
    filters.city, 
    filters.genres, 
    filters.budgetMin, 
    filters.budgetMax, 
    filters.teamSize, 
    filters.languages, 
    filters.sortBy, 
    filters.page
  ]);

  const toggleFilters = () => setShowFilters(!showFilters);

  const getSortLabel = (val: string) => {
    switch (val) {
      case 'rating': return 'Top Rated';
      case 'experience': return 'Most Experienced';
      case 'price_asc': return 'Price: Low to High';
      case 'price_desc': return 'Price: High to Low';
      case 'newest': return 'Newest';
      default: return 'Top Rated';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6">
          
          {/* Header Section */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white mb-4">Discover Artists</h1>
            <p className="text-zinc-400 max-w-2xl text-lg">
              Find the perfect talent for your event. Filter by location, genre, and budget to find exactly what you're looking for.
            </p>
          </div>

          {/* Search and Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <SearchBar placeholder="Search by name..." />
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className={`border-white/10 ${showFilters ? 'bg-white/10 text-white' : 'text-zinc-300'}`}
                onClick={toggleFilters}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {(filters.city || filters.genres.length > 0 || filters.languages.length > 0 || filters.teamSize) && (
                  <span className="ml-2 flex h-2 w-2 rounded-full bg-purple-500" />
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-white/10 text-zinc-300 min-w-[160px] justify-between">
                    {getSortLabel(filters.sortBy)}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuItem onClick={() => filters.setSortBy('rating')}>Top Rated</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => filters.setSortBy('experience')}>Most Experienced</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => filters.setSortBy('price_asc')}>Price: Low to High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => filters.setSortBy('price_desc')}>Price: High to Low</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => filters.setSortBy('newest')}>Newest First</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Filter Sidebar (Desktop and Mobile) */}
            <AnimatePresence>
              {(showFilters || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
                <motion.div
                  initial={{ width: 0, opacity: 0, overflow: "hidden" }}
                  animate={{ 
                    width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 320 : "100%", 
                    opacity: 1,
                    height: "auto",
                    overflow: "visible"
                  }}
                  exit={{ width: 0, opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3 }}
                  className={`lg:w-80 shrink-0 ${!showFilters && 'hidden lg:block'}`}
                >
                  <div className="sticky top-28 h-[calc(100vh-140px)]">
                    <FilterPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid Area */}
            <div className="flex-1 min-w-0">
              <div className="mb-6 flex justify-between items-center text-sm text-zinc-400">
                <span>
                  {isLoading ? "Searching..." : `Showing ${musicians.length} of ${totalCount} artists`}
                </span>
              </div>

              {isLoading ? (
                <MusicianGridSkeleton />
              ) : musicians.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {musicians.map((musician, idx) => (
                      <MusicianCard key={musician.id} musician={musician} index={idx} />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalCount > 12 && (
                    <div className="mt-12 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        className="border-white/10"
                        disabled={filters.page === 1}
                        onClick={() => filters.setPage(filters.page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-4 text-sm text-zinc-400">
                        Page {filters.page} of {Math.ceil(totalCount / 12)}
                      </span>
                      <Button
                        variant="outline"
                        className="border-white/10"
                        disabled={filters.page >= Math.ceil(totalCount / 12)}
                        onClick={() => filters.setPage(filters.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon="search"
                  title="No artists found"
                  description="Try adjusting your filters or search terms to find what you're looking for."
                  actionLabel="Clear Filters"
                  onAction={filters.resetFilters}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

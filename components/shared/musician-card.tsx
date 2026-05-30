"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, CheckCircle2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { MusicianCardData } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSavedStore } from "@/store/saved-store";

interface MusicianCardProps {
  musician: MusicianCardData;
  index?: number;
}

export function MusicianCard({ musician, index = 0 }: MusicianCardProps) {
  const { toggleSaveArtist, isSaved } = useSavedStore();
  const saved = isSaved(musician.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group relative h-full rounded-2xl overflow-hidden glass border-white/10 hover:border-purple-500/40 transition-all duration-300 shadow-lg hover:shadow-[0_10px_40px_rgba(168,85,247,0.15)] flex flex-col"
    >
      <Link href={`/musicians/${musician.id}`} className="absolute inset-0 z-10" prefetch={true}>
        <span className="sr-only">View {musician.stage_name}'s profile</span>
      </Link>

      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
        {musician.profile_image ? (
          <Image
            src={musician.profile_image}
            alt={musician.stage_name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <Music className="h-12 w-12 text-zinc-600" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          <Badge variant="glass" className="font-medium">
            Starting from {formatPrice(musician.starting_price)}
          </Badge>
          
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleSaveArtist(musician);
              }}
              className="bg-black/20 hover:bg-black/40 text-pink-500 p-1.5 rounded-full backdrop-blur-md border border-white/10 transition-colors z-30"
            >
              <Heart className={`h-4 w-4 ${saved ? 'fill-pink-500' : ''}`} />
            </button>
            {musician.verified && (
              <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-full backdrop-blur-md border border-blue-500/30" title="Verified Artist">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        {/* Name & Basic Info */}
        <div className="absolute bottom-3 left-4 right-4 z-20">
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{musician.stage_name}</h3>
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-purple-400" />
              {musician.city}
            </span>
            {musician.avg_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                {musician.avg_rating.toFixed(1)} ({musician.total_reviews})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-black/40 backdrop-blur-md">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {musician.genres.slice(0, 3).map((genre) => (
              <span 
                key={genre}
                className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300"
              >
                {genre}
              </span>
            ))}
            {musician.genres.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
                +{musician.genres.length - 3}
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs text-zinc-400 mt-2">
          <span>{musician.years_experience} yrs exp</span>
          <span>Team: {musician.team_size}</span>
        </div>
      </div>
    </motion.div>
  );
}

// For fallback when no image is available
function Music(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

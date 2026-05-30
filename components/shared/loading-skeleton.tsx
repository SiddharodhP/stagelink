"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  count?: number;
}

export function MusicianCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden glass border-white/10 h-[380px] flex flex-col">
      <Skeleton className="h-[250px] w-full rounded-none" />
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex gap-2 mb-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function MusicianGridSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MusicianCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="h-[300px] md:h-[400px] w-full" />
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="flex flex-col md:flex-row gap-6 -mt-20 md:-mt-24 items-start relative z-10">
          <Skeleton className="h-40 w-40 md:h-48 md:w-48 rounded-2xl border-4 border-black" />
          <div className="pt-2 md:pt-28 flex-1 w-full">
            <Skeleton className="h-10 w-64 mb-4" />
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

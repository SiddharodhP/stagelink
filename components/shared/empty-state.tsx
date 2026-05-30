import React from "react";
import { SearchX, Music, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: "search" | "music" | "calendar";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon = "search", 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  
  const IconComponent = 
    icon === "search" ? SearchX : 
    icon === "music" ? Music : 
    Calendar;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-card border-dashed border-2 border-white/10">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10">
        <IconComponent className="h-10 w-10 text-zinc-400" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-zinc-400">{description}</p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="border-white/10">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

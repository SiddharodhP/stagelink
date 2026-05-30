"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/services/auth";
import { getMusicianProfileByUserId } from "@/lib/services/musicians";
import { getMusicianAvailability, updateMusicianAvailability } from "@/lib/services/availability";

interface AvailabilityRecord {
  available_date: string;
  is_booked: boolean;
}

export default function AvailabilityPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [profile, setProfile] = useState<any>(null);
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]); // manually blocked (is_booked = false)
  const [bookedDates, setBookedDates] = useState<string[]>([]); // booked via inquiry (is_booked = true)
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { user } = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data: profileData } = await getMusicianProfileByUserId(user.id);
      if (profileData) {
        setProfile(profileData);
        const { data: availData } = await getMusicianAvailability(profileData.id);
        if (availData) {
          setAvailabilityRecords(availData);
          // Separate booked (from inquiries) vs blocked (manually set)
          const booked = availData.filter((a: any) => a.is_booked === true).map((a: any) => a.available_date);
          const blocked = availData.filter((a: any) => a.is_booked === false).map((a: any) => a.available_date);
          setBookedDates(booked);
          setBlockedDates(blocked);
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const getDateString = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    const dateStr = getDateString(day);
    
    // Don't allow toggling booked dates (those come from accepted inquiries)
    if (bookedDates.includes(dateStr)) {
      toast.info("This date is booked from an accepted inquiry and cannot be changed here.");
      return;
    }

    if (blockedDates.includes(dateStr)) {
      setBlockedDates(prev => prev.filter(d => d !== dateStr));
    } else {
      setBlockedDates(prev => [...prev, dateStr]);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    
    // Only save manually blocked dates (not booked ones)
    const thisMonthBlocked = blockedDates.filter(d => d.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`));
    
    const { error } = await updateMusicianAvailability(profile.id, startDate, endDate, thisMonthBlocked);
    
    setIsSaving(false);
    
    if (error) {
      toast.error("Failed to save calendar updates.");
    } else {
      toast.success("Calendar updated successfully!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Availability Calendar</h1>
        <p className="text-zinc-400">Manage your schedule so organizers know when they can book you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="glass-card border-white/10 bg-black/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">
                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-white/10"
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(prev => prev - 1);
                    } else {
                      setCurrentMonth(prev => prev - 1);
                    }
                  }}
                >
                  Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-white/10"
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(prev => prev + 1);
                    } else {
                      setCurrentMonth(prev => prev + 1);
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-zinc-500">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 md:h-20 rounded-md border border-transparent" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = getDateString(day);
                  const isBooked = bookedDates.includes(dateStr);
                  const isBlocked = blockedDates.includes(dateStr);
                  const isPast = new Date(currentYear, currentMonth, day) < new Date(new Date().setHours(0,0,0,0));

                  return (
                    <div
                      key={day}
                      onClick={() => !isPast && handleDateClick(day)}
                      className={`h-14 md:h-20 rounded-md border flex flex-col items-center justify-center p-1 transition-colors cursor-pointer
                        ${isPast ? 'opacity-30 cursor-not-allowed border-transparent text-zinc-600' : 
                          isBooked ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' :
                          isBlocked ? 'bg-red-500/20 border-red-500/50 text-red-200' : 
                          'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/30'
                        }
                      `}
                    >
                      <span className="text-lg font-medium">{day}</span>
                      {isBooked && <span className="text-[10px] mt-1 font-semibold tracking-wider uppercase text-purple-400 hidden md:block">Booked</span>}
                      {isBlocked && !isBooked && <span className="text-[10px] mt-1 font-semibold tracking-wider uppercase text-red-400 hidden md:block">Blocked</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-white/10 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded border border-white/10 bg-white/5" />
                <span className="text-sm text-zinc-300">Available</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded border border-purple-500/50 bg-purple-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-sm text-zinc-300">Booked</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded border border-red-500/50 bg-red-500/20" />
                <span className="text-sm text-zinc-300">Blocked / Unavailable</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-sm text-purple-200/80">
                Click on any available date to mark it as unavailable. Booked dates (from accepted inquiries) cannot be changed here.
              </p>
            </CardContent>
          </Card>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save Calendar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

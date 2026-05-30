"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Inbox, Calendar, DollarSign, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/services/auth";
import { getMusicianProfileByUserId } from "@/lib/services/musicians";
import { getMusicianInquiries, updateInquiryStatus } from "@/lib/services/inquiries";
import { formatPrice, formatDate } from "@/lib/utils";

export default function MusicianInquiriesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [inquiries, setInquiries] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await getMusicianProfileByUserId(user.id);
      if (profile) {
        const { data } = await getMusicianInquiries(profile.id);
        if (data) setInquiries(data);
      }
      setIsLoading(false);
    }
    loadData();
  }, [router]);

  const handleStatusUpdate = async (id: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await updateInquiryStatus(id, status);
      if (error) throw error;
      
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      toast.success(`Inquiry ${status}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update inquiry");
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
        <h1 className="text-3xl font-bold text-white mb-2">Inquiries</h1>
        <p className="text-zinc-400">Manage booking requests from event organizers.</p>
      </div>

      {inquiries.length > 0 ? (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="glass-card border-white/10 bg-black/40 overflow-hidden">
              <div className={`h-1 w-full ${
                inquiry.status === 'pending' ? 'bg-yellow-500' :
                inquiry.status === 'accepted' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {inquiry.organizer?.company_name || inquiry.organizer?.organizer_name}
                        </h3>
                        <p className="text-sm text-zinc-400 flex items-center mt-1">
                          <Calendar className="mr-1 h-3 w-3" /> Received {formatDate(inquiry.created_at)}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        inquiry.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        inquiry.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {inquiry.status}
                      </div>
                    </div>

                    <div className="p-4 rounded-md bg-white/5 border border-white/10">
                      <p className="text-zinc-300 italic">"{inquiry.message}"</p>
                    </div>

                    <div className="flex items-center gap-2 text-purple-400 font-semibold bg-purple-500/10 px-3 py-2 rounded-md inline-flex border border-purple-500/20">
                      <DollarSign className="h-4 w-4" />
                      Proposed Budget: {formatPrice(inquiry.proposed_budget)}
                    </div>
                  </div>

                  {inquiry.status === 'pending' && (
                    <div className="flex flex-row md:flex-col gap-3 justify-end items-end md:w-32 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                      <Button 
                        onClick={() => handleStatusUpdate(inquiry.id, 'accepted')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="mr-2 h-4 w-4" /> Accept
                      </Button>
                      <Button 
                        onClick={() => handleStatusUpdate(inquiry.id, 'declined')}
                        variant="destructive" 
                        className="w-full bg-red-950/40 hover:bg-red-900 border border-red-900"
                      >
                        <X className="mr-2 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-card border-dashed border-2 border-white/10 rounded-xl">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <Inbox className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">No inquiries yet</h3>
          <p className="max-w-md text-sm text-zinc-400">
            When organizers want to book you, their requests will appear here. Make sure your profile is complete to attract more bookings!
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Inbox, Calendar, DollarSign, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/services/auth";
import { getOrganizerProfile } from "@/lib/services/organizers";
import { getOrganizerInquiries } from "@/lib/services/inquiries";
import { formatPrice, formatDate } from "@/lib/utils";

export default function OrganizerInquiriesPage() {
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

      const { data: profile } = await getOrganizerProfile(user.id);
      if (profile) {
        const { data } = await getOrganizerInquiries(profile.id);
        if (data) setInquiries(data);
      }
      setIsLoading(false);
    }
    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Sent Inquiries</h1>
        <p className="text-zinc-400">Track the status of the booking requests you've sent to artists.</p>
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
                <div className="flex flex-col md:flex-row gap-6">
                  
                  <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6 shrink-0">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center">
                      {inquiry.musician?.profile_image ? (
                        <img src={inquiry.musician.profile_image} alt="Artist" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-zinc-500">
                          {inquiry.musician?.stage_name?.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{inquiry.musician?.stage_name}</h3>
                      <Button variant="link" className="p-0 h-auto text-pink-400 hover:text-pink-300 text-xs" asChild>
                        <Link href={`/musicians/${inquiry.musician_id}`}>
                          View Profile <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-zinc-400 flex items-center">
                        <Calendar className="mr-1 h-3 w-3" /> Sent {formatDate(inquiry.created_at)}
                      </p>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        inquiry.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        inquiry.status === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {inquiry.status}
                      </div>
                    </div>

                    <p className="text-zinc-300 text-sm italic">"{inquiry.message}"</p>

                    <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold pt-2">
                      <DollarSign className="h-4 w-4" />
                      Offered: {formatPrice(inquiry.proposed_budget)}
                    </div>
                  </div>
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
          <h3 className="mb-2 text-xl font-bold text-white">No inquiries sent</h3>
          <p className="max-w-md text-sm text-zinc-400">
            You haven't reached out to any musicians yet. Browse our talent pool and send your first inquiry!
          </p>
          <Button asChild className="mt-6 bg-pink-600 hover:bg-pink-700">
            <Link href="/musicians">Browse Artists</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Calendar, Users, Inbox, Heart, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/services/auth";
import { getOrganizerProfile } from "@/lib/services/organizers";
import { getOrganizerInquiries } from "@/lib/services/inquiries";
import { getConversations } from "@/lib/services/chat";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default function OrganizerDashboardOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    activeEvents: 0,
    totalInquiries: 0,
    savedArtists: 0,
    messages: 0,
  });
  const [profile, setProfile] = useState<any>(null);
  const [recentInquiries, setRecentInquiries] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      
      const { user } = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Get profile
      const { data: profileData } = await getOrganizerProfile(user.id);
      setProfile(profileData);

      if (profileData) {
        // 2. Get inquiries
        const { data: inquiriesData } = await getOrganizerInquiries(profileData.id);
        if (inquiriesData) {
          setRecentInquiries(inquiriesData.slice(0, 4));
          setStats(prev => ({ ...prev, totalInquiries: inquiriesData.length }));
        }
      }

      setIsLoading(false);

      // 4. Get messages
      const { data: convData } = await getConversations(user.id);
      if (convData) {
        setStats(prev => ({ ...prev, messages: convData.length }));
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-zinc-400">Welcome back, {profile?.organizer_name || "Organizer"}!</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-none shadow-[0_0_20px_rgba(236,72,153,0.3)] w-full sm:w-auto">
          <Link href="/musicians">
            <Search className="mr-2 h-4 w-4" />
            Find Musicians
          </Link>
        </Button>
      </div>

      {!profile && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Action Required: Complete Your Profile</h3>
              <p className="text-zinc-400 text-sm">You need to set up your organizer profile before you can book musicians or send messages.</p>
            </div>
          </div>
          <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <Link href="/organizer/profile">Complete Profile Now</Link>
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Inquiries</CardTitle>
            <Inbox className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalInquiries}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Saved Artists</CardTitle>
            <Heart className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.savedArtists}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Find Talent</CardTitle>
            <Search className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <Button variant="link" asChild className="p-0 h-auto text-emerald-400 hover:text-emerald-300">
              <Link href="/musicians">Browse Musicians &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Recent Inquiries Sent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sent Inquiries</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-purple-400 hover:text-purple-300">
              <Link href="/organizer/inquiries">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInquiries.length > 0 ? (
              <div className="space-y-4">
                {recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {inquiry.musician?.profile_image ? (
                          <img src={inquiry.musician.profile_image} alt="Artist" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-zinc-500">
                            {inquiry.musician?.stage_name?.substring(0, 2).toUpperCase() || "AR"}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white mb-0.5 text-sm">
                          {inquiry.musician?.stage_name || "Artist"}
                        </h4>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium ${
                          inquiry.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          inquiry.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          inquiry.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white text-sm">{formatPrice(inquiry.proposed_budget)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Inbox className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>You haven't sent any inquiries yet.</p>
                <Button variant="outline" asChild className="mt-4 border-white/10">
                  <Link href="/musicians">Browse Artists</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Eye, Calendar, DollarSign, Star, TrendingUp, Music, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/services/auth";
import { getMusicianProfileByUserId } from "@/lib/services/musicians";
import { getMusicianInquiries } from "@/lib/services/inquiries";
import { getMusicianRating } from "@/lib/services/reviews";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default function MusicianDashboardOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    profileViews: 0,
    pendingInquiries: 0,
    upcomingGigs: 0,
    totalEarned: 0,
    rating: 0,
    totalReviews: 0,
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
      const { data: profileData } = await getMusicianProfileByUserId(user.id);
      setProfile(profileData);

      if (profileData) {
        // 2. Get inquiries
        const { data: inquiriesData } = await getMusicianInquiries(profileData.id);
        if (inquiriesData) {
          const pending = inquiriesData.filter((i: any) => i.status === 'pending');
          const accepted = inquiriesData.filter((i: any) => i.status === 'accepted');
          
          setRecentInquiries(inquiriesData.slice(0, 5));
          
          // 3. Get ratings
          const { data: ratingData } = await getMusicianRating(profileData.id);
          
          setStats(prev => ({
            ...prev,
            pendingInquiries: pending.length,
            upcomingGigs: accepted.length, // Simplified for now
            rating: ratingData?.avg_rating || 0,
            totalReviews: ratingData?.total_reviews || 0,
          }));
        }
      }

      setIsLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">Welcome back, {profile?.stage_name || "Musician"}!</p>
      </div>




      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Inquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Inquiries</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-purple-400 hover:text-purple-300">
              <Link href="/musician/inquiries">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInquiries.length > 0 ? (
              <div className="space-y-4">
                {recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <h4 className="font-medium text-white mb-1">
                        {inquiry.organizer?.company_name || inquiry.organizer?.organizer_name || "Organizer"}
                      </h4>
                      <p className="text-sm text-zinc-400 line-clamp-1">{inquiry.message}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium text-white mb-1">{formatPrice(inquiry.proposed_budget)}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        inquiry.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        inquiry.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                        inquiry.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Music className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No recent inquiries.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Needed */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {!profile ? (
              <div className="p-6 rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 text-center">
                <h3 className="text-lg font-medium text-white mb-2">Complete your profile</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  You need to set up your profile before organizers can find and book you.
                </p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/musician/profile">Setup Profile</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">Profile Strength</span>
                  <span className="text-purple-400 font-medium">
                    {profile.profile_image && profile.bio && profile.genres?.length > 0 ? "100%" : "40%"}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" 
                    style={{ width: profile.profile_image && profile.bio && profile.genres?.length > 0 ? "100%" : "40%" }}
                  />
                </div>
                
                <ul className="space-y-3 mt-6">
                  <li className="flex items-center gap-3 text-sm">
                    <div className={`h-2 w-2 rounded-full ${profile.profile_image ? 'bg-green-500' : 'bg-zinc-600'}`} />
                    <span className={profile.profile_image ? 'text-zinc-300' : 'text-zinc-500'}>Add a profile image</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className={`h-2 w-2 rounded-full ${profile.bio ? 'bg-green-500' : 'bg-zinc-600'}`} />
                    <span className={profile.bio ? 'text-zinc-300' : 'text-zinc-500'}>Write a compelling bio</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className={`h-2 w-2 rounded-full ${profile.genres?.length > 0 ? 'bg-green-500' : 'bg-zinc-600'}`} />
                    <span className={profile.genres?.length > 0 ? 'text-zinc-300' : 'text-zinc-500'}>Select your genres</span>
                  </li>

                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

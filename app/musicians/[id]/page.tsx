"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, MapPin, CheckCircle2, Instagram, Youtube, Globe, Play, Calendar as CalendarIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileHeaderSkeleton } from "@/components/shared/loading-skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getMusicianProfile } from "@/lib/services/musicians";
import { getMusicianMedia } from "@/lib/services/media";
import { getCurrentUser } from "@/lib/services/auth";
import { getOrganizerProfile } from "@/lib/services/organizers";
import { getOrCreateConversation } from "@/lib/services/chat";
import { sendInquiry } from "@/lib/services/inquiries";
import { MusicianProfile, MusicianMedia } from "@/types/database";
import { formatPrice } from "@/lib/utils";

export default function MusicianProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<MusicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingBudget, setBookingBudget] = useState(0);
  const [bookingDate, setBookingDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [media, setMedia] = useState<MusicianMedia[]>([]);

  useEffect(() => {
    async function loadProfile() {
      if (!params.id || Array.isArray(params.id)) return;
      
      setIsLoading(true);
      const { data, error } = await getMusicianProfile(params.id);
      
      if (error || !data) {
        toast.error("Failed to load profile");
        router.push("/musicians");
      } else {
        setProfile(data);
        setBookingBudget(data.starting_price || 0);
        
        // Fetch media
        const { data: mediaData } = await getMusicianMedia(params.id);
        if (mediaData) setMedia(mediaData);
      }

      const { user } = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const { data: orgData } = await getOrganizerProfile(user.id);
        if (orgData) {
          setOrganizerProfile(orgData);
        }
      }
      
      setIsLoading(false);
    }
    
    loadProfile();
  }, [params.id, router]);

  const handleBookNow = () => {
    if (!currentUser) {
      toast.error("Please log in to book this musician");
      router.push("/login");
      return;
    }
    if (!organizerProfile) {
      toast.error("Please create your organizer profile first to book musicians.", {
        action: {
          label: "Create Profile",
          onClick: () => router.push("/organizer/profile"),
        },
      });
      return;
    }
    setIsBookingOpen(true);
  };
  
  const submitBooking = async () => {
    if (!bookingMessage.trim()) {
      toast.error("Please provide a message for your inquiry");
      return;
    }
    if (!bookingDate) {
      toast.error("Please select a date for your event");
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await sendInquiry({
      organizer_id: organizerProfile.id,
      musician_id: profile!.id,
      message: bookingMessage,
      proposed_budget: bookingBudget,
      event_date: bookingDate
    });
    setIsSubmitting(false);
    
    if (error) {
      toast.error("Failed to send booking inquiry");
    } else {
      toast.success("Booking inquiry sent successfully!");
      setIsBookingOpen(false);
      setBookingMessage("");
      setBookingDate("");
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error("Please log in to send a message");
      router.push("/login");
      return;
    }
    
    setIsMessaging(true);
    const { data, error } = await getOrCreateConversation(currentUser.id, profile!.user_id);
    setIsMessaging(false);
    
    if (error || !data) {
      toast.error("Failed to start conversation");
    } else {
      if (organizerProfile) {
        router.push(`/organizer/messages?chat=${data.id}`);
      } else {
        router.push(`/musician/messages?chat=${data.id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Navbar />
        <main className="flex-1 pt-20">
          <ProfileHeaderSkeleton />
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <main className="flex-1">
        {/* Cover Image & Header */}
        <section className="relative w-full">
          <div className="h-[300px] md:h-[400px] relative w-full overflow-hidden bg-zinc-900">
            {profile.cover_image ? (
              <Image
                src={profile.cover_image}
                alt={`${profile.stage_name} cover`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-hero-gradient" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 -mt-20 md:-mt-32 items-start md:items-end relative z-10 pb-10 border-b border-white/10">
              
              {/* Profile Image */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-40 w-40 md:h-56 md:w-56 rounded-2xl overflow-hidden border-4 border-black bg-zinc-800 shrink-0 shadow-2xl relative"
              >
                {profile.profile_image ? (
                  <Image
                    src={profile.profile_image}
                    alt={profile.stage_name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-600">
                    <Music className="h-16 w-16" />
                  </div>
                )}
              </motion.div>

              {/* Profile Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 w-full pt-2 md:pb-4 flex flex-col md:flex-row md:items-end justify-between gap-6"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-5xl font-bold text-white">{profile.stage_name}</h1>
                    {profile.verified && (
                      <CheckCircle2 className="h-6 w-6 text-blue-400" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300 mb-4">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                      <MapPin className="h-4 w-4 text-purple-400" />
                      {profile.city}, {profile.state}
                    </span>
                    {profile.avg_rating && profile.avg_rating > 0 ? (
                      <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-medium text-white">{profile.avg_rating.toFixed(1)}</span>
                        <span>({profile.total_reviews} reviews)</span>
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                      <span className="text-purple-400 font-medium">Starting at</span>
                      <span className="font-semibold text-white">{formatPrice(profile.starting_price)}</span>
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {profile.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {profile.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {profile.spotify_url && (
                      <a href={profile.spotify_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
                        <Music className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                  <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full md:w-48 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] border-0" onClick={(e) => {
                        e.preventDefault();
                        handleBookNow();
                      }}>
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        Book Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Book {profile.stage_name}</DialogTitle>
                        <DialogDescription>
                          Send an inquiry for your upcoming event. The musician will review your proposal and get back to you.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="message">Message details</Label>
                          <Textarea
                            id="message"
                            value={bookingMessage}
                            onChange={(e) => setBookingMessage(e.target.value)}
                            placeholder="Tell them about the event type, date, location, and what you're looking for..."
                            className="h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Event Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="budget">Proposed Budget (₹)</Label>
                          <Input
                            id="budget"
                            type="number"
                            value={bookingBudget}
                            onChange={(e) => setBookingBudget(Number(e.target.value))}
                            min={0}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
                        <Button onClick={submitBooking} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                          {isSubmitting ? "Sending..." : "Send Inquiry"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button size="lg" variant="outline" className="w-full md:w-48 border-white/10 bg-white/5 hover:bg-white/10" disabled={isMessaging} onClick={handleSendMessage}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {isMessaging ? "Starting chat..." : "Send Message"}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Details Tabs */}
        <section className="container mx-auto px-4 md:px-6 py-12">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="bg-transparent border-b border-white/10 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto flex-nowrap">
              <TabsTrigger value="about" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none text-base px-6 py-4 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200">
                About
              </TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none text-base px-6 py-4 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200">
                Media & Gallery
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none text-base px-6 py-4 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200">
                Reviews
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="animate-in fade-in-50 duration-500 mt-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-bold text-white mb-6">Biography</h2>
                  <div className="prose prose-invert max-w-none prose-p:text-zinc-400 prose-p:leading-relaxed">
                    {profile.bio ? (
                      profile.bio.split('\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))
                    ) : (
                      <p className="italic">No biography provided yet.</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="glass-card p-6 border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-zinc-500 block mb-2">Genres</span>
                        <div className="flex flex-wrap gap-2">
                          {profile.genres.map(genre => (
                            <Badge key={genre} variant="outline" className="bg-white/5">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-zinc-500 block mb-2">Languages</span>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map(lang => (
                            <Badge key={lang} variant="outline" className="bg-white/5">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                        <div>
                          <span className="text-sm text-zinc-500 block">Experience</span>
                          <span className="text-white font-medium">{profile.years_experience} years</span>
                        </div>
                        <div>
                          <span className="text-sm text-zinc-500 block">Act Size</span>
                          <span className="text-white font-medium">{profile.team_size} members</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="mt-0 outline-none">
              <div className="py-6">
                {media && media.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {media.map((item) => (
                      <div key={item.id} className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 group">
                        {item.type === 'video' ? (
                          <>
                            <video 
                              src={item.media_url} 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              controls
                            />
                            {item.title && (
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-sm font-medium text-white truncate">{item.title}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <Image 
                              src={item.media_url} 
                              alt={item.title || "Musician media"} 
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {item.title && (
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-sm font-medium text-white truncate">{item.title}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center glass-card border-white/10 rounded-xl">
                    <Music className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No media yet</h3>
                    <p className="text-zinc-400">This musician hasn't uploaded any photos or videos.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-0 outline-none">
              <div className="py-10 text-center">
                <p className="text-zinc-400">Reviews coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

// Fallback icons for missing lucide imports in this specific context
function Music(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}

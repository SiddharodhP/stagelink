"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Save, Loader2, Music, MapPin, DollarSign, Users, Clock, Instagram, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/services/auth";
import { getMusicianProfileByUserId, updateMusicianProfile, createMusicianProfile, uploadProfileImage } from "@/lib/services/musicians";
import { MusicianProfile } from "@/types/database";
import { GENRES, CITIES, LANGUAGES } from "@/lib/constants";

export default function EditProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);

  const [formData, setFormData] = useState({
    stage_name: "",
    bio: "",
    city: "",
    state: "State",
    genres: [] as string[],
    languages: [] as string[],
    team_size: 1,
    starting_price: 0,
    years_experience: 0,
    instagram_url: "",
    youtube_url: "",
    spotify_url: "",
    profile_image: "",
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      setUserId(user.id);

      const { data } = await getMusicianProfileByUserId(user.id);
      
      if (data) {
        setProfileId(data.id);
        setFormData({
          stage_name: data.stage_name || "",
          bio: data.bio || "",
          city: data.city || "",
          state: data.state || "State",
          genres: data.genres || [],
          languages: data.languages || [],
          team_size: data.team_size || 1,
          starting_price: data.starting_price || 0,
          years_experience: data.years_experience || 0,
          instagram_url: data.instagram_url || "",
          youtube_url: data.youtube_url || "",
          spotify_url: data.spotify_url || "",
          profile_image: data.profile_image || "",
        });
      } else {
        setIsNewProfile(true);
      }
      
      setIsLoading(false);
    }
    
    loadData();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const toggleArrayItem = (field: 'genres' | 'languages', item: string) => {
    setFormData(prev => {
      const array = prev[field];
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter(i => i !== item) };
      } else {
        return { ...prev, [field]: [...array, item] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setIsSaving(true);
    
    try {
      if (isNewProfile) {
        const { error } = await createMusicianProfile(userId, formData);
        if (error) throw error;
        toast.success("Profile created successfully!");
        setIsNewProfile(false);
      } else if (profileId) {
        const { error } = await updateMusicianProfile(profileId, formData);
        if (error) throw error;
        toast.success("Profile updated successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-2" />
        <Card className="glass-card border-white/10">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-zinc-400">Update your public information to attract more bookings.</p>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 hidden md:flex"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Card className="glass-card border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>This is how organizers will see you on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="h-32 w-32 rounded-full border-4 border-black bg-zinc-800 overflow-hidden relative mb-4">
                {formData.profile_image ? (
                  <Image src={formData.profile_image} alt="Profile" fill className="object-cover" />
                ) : (
                  <Music className="h-12 w-12 text-zinc-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <Label htmlFor="profile_image" className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md text-sm text-white">
                Upload Profile Picture
              </Label>
              <Input 
                id="profile_image" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && userId) {
                    toast.info("Uploading image...");
                    const { url, error } = await uploadProfileImage(userId, file);
                    if (error || !url) toast.error("Upload failed");
                    else {
                      setFormData(prev => ({ ...prev, profile_image: url }));
                      toast.success("Image uploaded!");
                    }
                  }
                }} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="stage_name">Stage Name / Band Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="stage_name" 
                    name="stage_name"
                    value={formData.stage_name} 
                    onChange={handleInputChange}
                    className="pl-10" 
                    placeholder="e.g. The Midnight Echo" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <select 
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pl-10 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white focus:ring-purple-500"
                    required
                  >
                    <option value="" disabled>Select a city</option>
                    {CITIES.map(city => (
                      <option key={city} value={city} className="bg-zinc-900 text-white">{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biography</Label>
              <textarea 
                id="bio" 
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="flex min-h-[120px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 text-white resize-none"
                placeholder="Tell organizers about your journey, style, and what makes your performance unique..." 
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="glass-card border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
            <CardDescription>Help organizers understand your pricing and experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="starting_price">Starting Price (₹) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="starting_price" 
                    name="starting_price"
                    type="number"
                    min="0"
                    value={formData.starting_price}
                    onChange={handleInputChange}
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_size">Team Size</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="team_size" 
                    name="team_size"
                    type="number"
                    min="1"
                    value={formData.team_size}
                    onChange={handleInputChange}
                    className="pl-10" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_experience">Years of Experience</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="years_experience" 
                    name="years_experience"
                    type="number"
                    min="0"
                    value={formData.years_experience}
                    onChange={handleInputChange}
                    className="pl-10" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Genres</Label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleArrayItem('genres', genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      formData.genres.includes(genre)
                        ? "bg-purple-500/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleArrayItem('languages', lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      formData.languages.includes(lang)
                        ? "bg-purple-500/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card className="glass-card border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Social & Links</CardTitle>
            <CardDescription>Link your social media so organizers can see your performances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="instagram_url" 
                    name="instagram_url"
                    value={formData.instagram_url}
                    onChange={handleInputChange}
                    className="pl-10" 
                    placeholder="https://instagram.com/yourhandle" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube Channel URL</Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="youtube_url" 
                    name="youtube_url"
                    value={formData.youtube_url}
                    onChange={handleInputChange}
                    className="pl-10" 
                    placeholder="https://youtube.com/c/yourchannel" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="spotify_url">Spotify Artist URL</Label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="spotify_url" 
                    name="spotify_url"
                    value={formData.spotify_url}
                    onChange={handleInputChange}
                    className="pl-10" 
                    placeholder="https://open.spotify.com/artist/..." 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Save Button */}
        <Button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-purple-600 hover:bg-purple-700 md:hidden"
          size="lg"
        >
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Save Changes
        </Button>
      </form>
    </div>
  );
}

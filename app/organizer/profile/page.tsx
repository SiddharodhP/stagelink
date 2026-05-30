"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, Building, User, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCurrentUser } from "@/lib/services/auth";
import { getOrganizerProfile, createOrganizerProfile, updateOrganizerProfile } from "@/lib/services/organizers";
import { CITIES } from "@/lib/constants";

export default function OrganizerProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    organizer_name: "",
    phone: "",
    city: "",
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

      const { data } = await getOrganizerProfile(user.id);
      
      if (data) {
        setProfileId(data.id);
        setFormData({
          company_name: data.company_name || "",
          organizer_name: data.organizer_name || "",
          phone: data.phone || "",
          city: data.city || "",
        });
      } else {
        setIsNewProfile(true);
      }
      
      setIsLoading(false);
    }
    
    loadData();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setIsSaving(true);
    
    try {
      if (isNewProfile) {
        const { error } = await createOrganizerProfile(userId, formData);
        if (error) throw error;
        toast.success("Profile created successfully!");
        setIsNewProfile(false);
        router.push("/organizer/dashboard"); // Redirect to dashboard after creation
      } else if (profileId) {
        const { error } = await updateOrganizerProfile(profileId, formData);
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
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organizer Profile</h1>
          <p className="text-zinc-400">Manage your company details and contact information.</p>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isSaving}
          className="bg-pink-600 hover:bg-pink-700 hidden md:flex"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Profile
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="glass-card border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>This information will be visible to musicians when you send messages or booking inquiries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company / Agency Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="company_name" 
                    name="company_name"
                    value={formData.company_name} 
                    onChange={handleInputChange}
                    className="pl-10 bg-white/5" 
                    placeholder="e.g. Elite Events Co." 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer_name">Your Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="organizer_name" 
                    name="organizer_name"
                    value={formData.organizer_name} 
                    onChange={handleInputChange}
                    className="pl-10 bg-white/5" 
                    placeholder="e.g. John Doe" 
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
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pl-10 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white focus:ring-pink-500"
                    required
                  >
                    <option value="" disabled>Select a city</option>
                    {CITIES.map(city => (
                      <option key={city} value={city} className="bg-zinc-900 text-white">{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="phone" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleInputChange}
                    className="pl-10 bg-white/5" 
                    placeholder="+91 98765 43210" 
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
          className="w-full bg-pink-600 hover:bg-pink-700 md:hidden"
          size="lg"
        >
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Save Profile
        </Button>
      </form>
    </div>
  );
}

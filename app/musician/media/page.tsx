"use client";

import { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Video, Trash2, Loader2, Music } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/services/auth";
import { getMusicianProfileByUserId } from "@/lib/services/musicians";
import { getMusicianMedia, uploadMedia, deleteMedia } from "@/lib/services/media";

export default function MediaManagementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [musicianId, setMusicianId] = useState<string | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    async function loadData() {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await getMusicianProfileByUserId(user.id);
      if (profile) {
        setMusicianId(profile.id);
        const { data: mediaData } = await getMusicianMedia(profile.id);
        if (mediaData) setMedia(mediaData);
      } else {
        toast.error("Please complete your profile first");
        router.push("/musician/profile");
      }
      setIsLoading(false);
    }
    loadData();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !musicianId) return;
    
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    
    try {
      const { data, error } = await uploadMedia(file, musicianId, uploadType, file.name);
      if (error) throw error;
      
      if (data) {
        setMedia(prev => [data, ...prev]);
        toast.success("Media uploaded successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload media");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, url: string) => {
    try {
      const { error } = await deleteMedia(id, url);
      if (error) throw error;
      
      setMedia(prev => prev.filter(m => m.id !== id));
      toast.success("Media deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete media");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const images = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video');

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Media Gallery</h1>
        <p className="text-zinc-400">Upload photos and performance videos to showcase your talent.</p>
      </div>

      <Card className="glass-card border-white/10 bg-black/40">
        <CardHeader>
          <CardTitle>Upload New Media</CardTitle>
          <CardDescription>Supported formats: JPG, PNG, MP4. Max size: 10MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="flex gap-4">
              <Button 
                variant={uploadType === 'image' ? 'default' : 'outline'}
                onClick={() => setUploadType('image')}
                className={uploadType === 'image' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/10'}
                type="button"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button 
                variant={uploadType === 'video' ? 'default' : 'outline'}
                onClick={() => setUploadType('video')}
                className={uploadType === 'video' ? 'bg-purple-600 hover:bg-purple-700' : 'border-white/10'}
                type="button"
              >
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept={uploadType === 'image' ? "image/*" : "video/*"}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button disabled={isUploading} className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200">
                {isUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Choose File</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Photos ({images.length})</h2>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="relative aspect-square group rounded-lg overflow-hidden bg-zinc-900 border border-white/10">
                <img src={img.media_url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(img.id, img.media_url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 italic">No photos uploaded yet.</p>
        )}
      </div>

      <div className="space-y-6 pt-4">
        <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Videos ({videos.length})</h2>
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(vid => (
              <div key={vid.id} className="relative aspect-video group rounded-lg overflow-hidden bg-zinc-900 border border-white/10">
                <video src={vid.media_url} controls className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(vid.id, vid.media_url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 italic">No videos uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

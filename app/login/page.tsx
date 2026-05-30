"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Music, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGoogle, signInWithMagicLink } from "@/lib/services/auth";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    const { error } = await signInWithMagicLink(email);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Magic link sent! Check your email.");
      setEmail("");
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-[128px] animate-pulse-glow" />
        <div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[128px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-600/10 blur-[128px] animate-float" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        <div className="glass-card flex flex-col p-8 sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
            >
              <Music className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">{APP_NAME}</h1>
            <p className="text-sm text-zinc-400">Welcome back to the stage</p>
          </div>

          <div className="flex flex-col space-y-4">
            <Button
              variant="outline"
              className="relative h-12 w-full overflow-hidden border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-white/20"
              onClick={handleGoogleSignIn}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-zinc-500">or</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="group h-12 w-full bg-white text-black hover:bg-zinc-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-pulse">Sending link...</span>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 transition-transform group-hover:scale-125 group-hover:text-purple-500" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-400">
            By continuing, you agree to our <a href="#" className="text-white hover:underline">Terms of Service</a> and <a href="#" className="text-white hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

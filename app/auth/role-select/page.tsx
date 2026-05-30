"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Music, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUserRole, getCurrentUser } from "@/lib/services/auth";
import { UserRole } from "@/types/database";

export default function RoleSelectPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    try {
      const { user, error: authError } = await getCurrentUser();
      
      if (authError || !user) {
        toast.error("Authentication error. Please log in again.");
        router.push("/login");
        return;
      }

      const { error } = await updateUserRole(user.id, selectedRole);
      
      if (error) {
        toast.error("Failed to update role. Please try again.");
        setIsLoading(false);
        return;
      }
      
      toast.success(`Welcome to StageLink as a${selectedRole === 'organizer' ? 'n' : ''} ${selectedRole}!`);
      
      if (selectedRole === 'musician') {
        router.push("/musician/profile");
      } else {
        router.push("/organizer/profile");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 w-full max-w-4xl flex flex-col items-center"
      >
        <motion.div variants={itemVariants} className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            How will you use <span className="gradient-text">StageLink</span>?
          </h1>
          <p className="text-lg text-zinc-400">Choose your role to personalize your experience.</p>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {/* Musician Card */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <div 
              onClick={() => setSelectedRole('musician')}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${
                selectedRole === 'musician' 
                  ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                  : 'border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/10'
              }`}
            >
              {selectedRole === 'musician' && (
                <div className="absolute right-6 top-6 text-purple-400 animate-in zoom-in">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
                <Music className="h-8 w-8 text-purple-400" />
              </div>
              
              <h2 className="mb-3 text-2xl font-bold text-white">I'm a Performer</h2>
              <p className="text-zinc-400 leading-relaxed">
                Create a stunning profile, showcase your talent, set your availability, and get booked for amazing events.
              </p>
            </div>
          </motion.div>

          {/* Organizer Card */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <div 
              onClick={() => setSelectedRole('organizer')}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${
                selectedRole === 'organizer' 
                  ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_30px_rgba(236,72,153,0.2)]' 
                  : 'border-white/10 bg-white/5 hover:border-pink-500/50 hover:bg-white/10'
              }`}
            >
              {selectedRole === 'organizer' && (
                <div className="absolute right-6 top-6 text-pink-400 animate-in zoom-in">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30">
                <Calendar className="h-8 w-8 text-pink-400" />
              </div>
              
              <h2 className="mb-3 text-2xl font-bold text-white">I'm an Organizer</h2>
              <p className="text-zinc-400 leading-relaxed">
                Find the perfect musicians for weddings, corporate events, college fests, private parties, and more.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="mt-12">
          <Button
            size="lg"
            className={`h-14 px-10 text-lg transition-all ${
              selectedRole 
                ? 'bg-white text-black hover:bg-zinc-200' 
                : 'bg-white/10 text-white/50 cursor-not-allowed hover:bg-white/10'
            }`}
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? (
              <span className="animate-pulse">Setting up your account...</span>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

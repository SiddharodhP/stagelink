"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase, Hammer, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRole } from "@/lib/services/auth";
import { BRAND_NAME } from "@/lib/constants";

export default function RoleSelectPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"client" | "freelancer" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;
    setIsLoading(true);
    try {
      const { error } = await setRole(selectedRole);
      if (error) throw error;
      toast.success(`Welcome to ${BRAND_NAME}!`);
      router.push("/onboarding");
    } catch (err: any) {
      toast.error(err.message || "Failed to set account type");
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex w-full max-w-4xl flex-col items-center"
      >
        <motion.div variants={itemVariants} className="mb-12 text-center">
          <p className="eyebrow mb-4">One quick question</p>
          <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            How will you use <span className="italic text-brand">{BRAND_NAME}</span>?
          </h1>
          <p className="text-lg text-muted-foreground">
            This sets up your workspace — it can&apos;t be changed later.
          </p>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
          <motion.div variants={itemVariants} whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}>
            <div
              onClick={() => setSelectedRole("client")}
              className={`relative h-full cursor-pointer overflow-hidden rounded-2xl border bg-card p-8 transition-all duration-300 ${
                selectedRole === "client"
                  ? "border-client ring-1 ring-client shadow-[0_24px_50px_-30px_rgba(26,23,19,0.4)]"
                  : "border-border hover:border-client/60"
              }`}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-client" />
              {selectedRole === "client" && (
                <div className="absolute right-6 top-6 text-client">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-client-soft">
                <Briefcase className="h-7 w-7 text-client" />
              </div>
              <h2 className="font-display mb-3 text-2xl font-semibold">I&apos;m hiring</h2>
              <p className="leading-relaxed text-muted-foreground">
                Post projects, structure the work into milestones, compare
                competing bids, and only pay as approved work is delivered.
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}>
            <div
              onClick={() => setSelectedRole("freelancer")}
              className={`relative h-full cursor-pointer overflow-hidden rounded-2xl border bg-card p-8 transition-all duration-300 ${
                selectedRole === "freelancer"
                  ? "border-freelancer ring-1 ring-freelancer shadow-[0_24px_50px_-30px_rgba(26,23,19,0.4)]"
                  : "border-border hover:border-freelancer/60"
              }`}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-freelancer" />
              {selectedRole === "freelancer" && (
                <div className="absolute right-6 top-6 text-freelancer">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-freelancer-soft">
                <Hammer className="h-7 w-7 text-freelancer" />
              </div>
              <h2 className="font-display mb-3 text-2xl font-semibold">I&apos;m freelancing</h2>
              <p className="leading-relaxed text-muted-foreground">
                Find projects with clear milestones and budgets, bid
                competitively, and get paid per milestone — escrow-protected.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="mt-12">
          <Button
            size="lg"
            className={`h-14 rounded-full px-10 text-lg transition-all ${
              selectedRole
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-secondary text-muted-foreground"
            }`}
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? (
              <span className="animate-pulse">Setting up your workspace…</span>
            ) : (
              <>
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

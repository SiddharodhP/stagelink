"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Music, Star, MapPin, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";



export default function Home() {
  const router = useRouter();

  return (
    <>
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-hero-gradient z-0" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
          
          <div className="container relative z-10 mx-auto px-4 md:px-6 text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl"
            >
              <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-300 mb-8 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse"></span>
                The new standard for live music booking
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                Find the <span className="gradient-text">Perfect Sound</span><br className="hidden md:block" /> for Your Event
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                Discover live musicians, bands, DJs, and performers for weddings, college fests, corporate events, and unforgettable nights.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="rounded-full h-14 px-8 text-base bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-transform w-full sm:w-auto shadow-[0_0_30px_rgba(255,255,255,0.3)]" onClick={() => router.push('/musicians')}>
                  Explore Artists
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black to-purple-950/20 z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="glass-card p-12 max-w-4xl mx-auto border-purple-500/20"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to take the stage?</h2>
              <p className="text-lg text-zinc-300 mb-10 max-w-2xl mx-auto">
                Join thousands of musicians who are finding incredible gigs and managing their bookings effortlessly on StageLink.
              </p>
              <Button size="lg" className="rounded-full h-14 px-10 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-none shadow-[0_0_40px_rgba(168,85,247,0.4)]" onClick={() => router.push('/auth/role-select')}>
                Create Your Profile Today
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

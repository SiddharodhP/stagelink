import Link from "next/link";
import { Music, Instagram, Twitter, Youtube, Mail } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Music className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              The premier marketplace connecting extraordinary musical talent with unforgettable events.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Discover</h3>
            <ul className="space-y-3">
              <li><Link href="/musicians" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Explore Artists</Link></li>
              <li><Link href="/genres" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Browse by Genre</Link></li>
              <li><Link href="/cities" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Cities</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">About Us</Link></li>
              <li><Link href="/pricing" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Pricing</Link></li>
              <li><Link href="/support" className="text-sm text-zinc-400 hover:text-purple-400 transition-colors">Help Center</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-white mb-4">Stay in the Loop</h3>
            <p className="text-sm text-zinc-400 mb-4">Get the latest updates on new artists and platform features.</p>
            <form className="flex">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="bg-white/5 border border-white/10 rounded-l-md px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-purple-500"
              />
              <button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 transition-colors text-white px-3 py-2 rounded-r-md flex items-center justify-center"
              >
                <Mail className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500">
            &copy; {currentYear} {APP_NAME} Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-xs text-zinc-500 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

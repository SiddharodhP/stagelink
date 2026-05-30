import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function OrganizerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar role="organizer" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center p-4 border-b border-white/10 bg-black">
          {/* Mobile header (hamburger menu could go here) */}
          <span className="font-bold text-white">StageLink Organizer</span>
        </div>
        
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

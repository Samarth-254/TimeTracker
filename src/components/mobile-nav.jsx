import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Clock, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function MobileNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  if (!user) return null;
  
  const getTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/time-entries":
        return "Time Entries";
      case "/leave-management":
        return "Leave Management";
      case "/export":
        return "Export Data";
      default:
        return "Timekeeper";
    }
  };

  const initials = (user.fullName || user.user_metadata?.full_name)
    ? (user.fullName || user.user_metadata?.full_name)
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user.username || user.email
      ? (user.username || user.email).substring(0, 2).toUpperCase()
      : "U"; // Default fallback if all are undefined
  
  return (
    <>
      <div className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-primary h-6 w-6" />
          <h1 className="font-bold text-xl">Timekeeper</h1>
        </div>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-md hover:bg-accent">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-card border-r border-border">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Clock className="text-primary h-6 w-6" />
                Timekeeper
              </SheetTitle>
            </SheetHeader>
            <div className="py-6">
              <nav className="flex flex-col gap-2">
                <Link href="/">
                  <span 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    Dashboard
                  </span>
                </Link>
                <Link href="/time-entries">
                  <span 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/time-entries" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Time Entries
                  </span>
                </Link>
                <Link href="/leave-management">
                  <span 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/leave-management" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Leave Management
                  </span>
                </Link>
                <Link href="/export">
                  <span 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/export" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export Data
                  </span>
                </Link>
                <button
                  onClick={() => {
                    logoutMutation.mutate();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground hover:bg-accent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </nav>
            </div>
            <div className="absolute bottom-6 left-0 right-0 border-t border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg font-medium">
                  {initials}
                </div>
                <div>
                  <p className="font-medium">{user.fullName || user.user_metadata?.full_name || user.username || user.email || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {/* <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-3 z-50">
        <Link href="/">
          <span className={`flex flex-col items-center justify-center cursor-pointer ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span className="text-xs mt-1">Dashboard</span>
          </span>
        </Link>
        <Link href="/time-entries">
          <span className={`flex flex-col items-center justify-center cursor-pointer ${location === "/time-entries" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-xs mt-1">Time</span>
          </span>
        </Link>
        <Link href="/leave-management">
          <span className={`flex flex-col items-center justify-center cursor-pointer ${location === "/leave-management" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-xs mt-1">Leave</span>
          </span>
        </Link>
        <Link href="/export">
          <span className={`flex flex-col items-center justify-center cursor-pointer ${location === "/export" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="text-xs mt-1">Export</span>
          </span>
        </Link>
      </div> */}
    </>
  );
}

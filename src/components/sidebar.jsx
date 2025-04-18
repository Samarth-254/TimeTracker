import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Clock, 
  Calendar, 
  LayoutDashboard, 
  Download, 
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  
  if (!user) return null;
  
  // Add safety check for both fullName and username
  const initials = user.fullName || user.user_metadata?.full_name
    ? (user.fullName || user.user_metadata?.full_name)
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : user.username || user.email
        ? (user.username || user.email).substring(0, 2).toUpperCase()
        : "U"; // Default fallback if both are undefined
  
  // Handle logout with the correct method
  const handleLogout = async () => {
    try {
      if (typeof signOut === 'function') {
        await signOut();
      } else {
        console.error("Logout function not available");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Clock className="text-primary h-6 w-6" />
        <h1 className="font-bold text-xl">Timekeeper</h1>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          <li>
            <Link href="/">
              <span className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}>
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </span>
            </Link>
          </li>
          <li>
            <Link href="/time-entries">
              <span className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/time-entries" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}>
                <Clock className="h-5 w-5" />
                Time Entries
              </span>
            </Link>
          </li>
          <li>
            <Link href="/leave-management">
              <span className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/leave-management" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}>
                <Calendar className="h-5 w-5" />
                Leave Management
              </span>
            </Link>
          </li>
          <li>
            <Link href="/export">
              <span className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer ${location === "/export" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent transition-colors"}`}>
                <Download className="h-5 w-5" />
                Export Data
              </span>
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg font-medium">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium truncate">
              {user.fullName || user.user_metadata?.full_name || user.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email || ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
import { NotificationsList } from "@/components/notifications/notifications-list";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      {/* Mobile Header */}
      <MobileNav />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar with Notifications */}
{/*         <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-end">
          <NotificationsList />
        </div>
         */}
        {children}
      </main>
    </div>
  );
}

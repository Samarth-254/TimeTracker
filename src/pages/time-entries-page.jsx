import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, Calendar, Search } from "lucide-react";
import { formatDateInIndianTimezone } from "@/lib/utils";
import { Layout } from "@/components/layout";
import TimeEntriesTable from "@/components/dashboard/time-entries-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { timeEntriesApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserTimeEntries } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import "@/styles/calendar-custom.css";

export default function TimeEntriesPage() {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Update month at midnight
  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      if (month.getMonth() !== currentMonth || month.getFullYear() !== currentYear) {
        setMonth(now);
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      }
    };

    // Check every minute
    const interval = setInterval(checkDate, 60000);
    
    // Initial check
    checkDate();

    return () => clearInterval(interval);
  }, [month, queryClient]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time-entries", format(month, "yyyy-MM")],
    queryFn: async () => {
      const startDate = format(startOfMonth(month), "yyyy-MM-dd");
      const endDate = format(endOfMonth(month), "yyyy-MM-dd");
      return timeEntriesApi.getRange(startDate, endDate, user?.id);
    },
    enabled: !!user?.id
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  const filteredEntries = entries.filter(entry => {
    // First apply date filter if selected
    if (selectedDate) {
      const entryDate = parseISO(entry.date);
      if (
        entryDate.getDate() !== selectedDate.getDate() ||
        entryDate.getMonth() !== selectedDate.getMonth() ||
        entryDate.getFullYear() !== selectedDate.getFullYear()
      ) {
        return false;
      }
    }

    // Then apply search filter
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      format(parseISO(entry.date), "EEEE, MMMM d, yyyy").toLowerCase().includes(searchLower) ||
      entry.status.toLowerCase().includes(searchLower) ||
      (entry.check_in && entry.check_in.toLowerCase().includes(searchLower)) ||
      (entry.check_out && entry.check_out.toLowerCase().includes(searchLower))
    );
  });

  const handleDateSelect = (date) => {
    setSelectedDate(date === selectedDate ? null : date);
    // If a new date is selected, update the month view to match
    if (date && (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear())) {
      setMonth(date);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Time Entries</h1>
            <p className="text-muted-foreground">
              {selectedDate 
                ? `Showing entries for ${format(selectedDate, "MMMM d, yyyy")}`
                : "View and manage your time entries"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search entries..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={selectedDate ? "default" : "outline"} 
                  className="w-full sm:w-auto"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate 
                    ? format(selectedDate, "MMM d, yyyy")
                    : format(month, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={month}
                  onMonthChange={setMonth}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </header>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <TimeEntriesTable 
              entries={filteredEntries} 
              showEditButton={true} 
              showPagination={true}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}

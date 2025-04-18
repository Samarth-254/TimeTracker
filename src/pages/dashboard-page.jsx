import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { formatDateInIndianTimezone, formatHoursToHMS } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserTimeEntries, getTimeEntriesStats, subscribeToLeaveRecords } from "@/lib/supabase";
import { Layout } from "@/components/layout";
import StatusCard from "@/components/dashboard/status-card";
import WeeklyChart from "@/components/dashboard/weekly-chart";
import CurrentStatus from "@/components/dashboard/current-status";
import ClockActions from "@/components/dashboard/clock-actions";
import TimeEntriesTable from "@/components/dashboard/time-entries-table";
import { leaveRecordsApi } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Stats data query with leave stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const today = new Date();
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        const [weeklyEntries, monthlyEntries, leaveStats] = await Promise.all([
          getTimeEntriesStats(user.id, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),
          getTimeEntriesStats(user.id, format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')),
          leaveRecordsApi.getLeaveStats(user.id)
        ]);

        // Calculate weekly stats
        const weeklyTotal = weeklyEntries.reduce((sum, entry) => {
          const hours = entry?.total_hours ? parseFloat(entry.total_hours) : 0;
          return sum + hours;
        }, 0);
        
        const weeklyAvg = weeklyEntries.length > 0 ? weeklyTotal / 5 : 0;

        // Calculate monthly stats
        const monthlyTotal = monthlyEntries.reduce((sum, entry) => {
          const hours = entry?.total_hours ? parseFloat(entry.total_hours) : 0;
          return sum + hours;
        }, 0);
        
        const workingDays = 22;
        const monthlyAvg = monthlyEntries.length > 0 ? monthlyTotal / workingDays : 0;

        // Fetch leave records for the current month
        const leaveRecords = await leaveRecordsApi.getRange(
          format(monthStart, 'yyyy-MM-dd'),
          format(monthEnd, 'yyyy-MM-dd'),
          user.id
        );
        // Calculate paid/unpaid leaves for this month from leave records
        const paidLeavesThisMonth = leaveRecords.filter(lr => lr.leave_type === 'paid').length;
        const unpaidLeavesThisMonth = leaveRecords.filter(lr => lr.leave_type === 'unpaid').length;

        // Get recent entries sorted by date
        const recentEntries = [...monthlyEntries]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        return {
          weekly: {
            total: weeklyTotal.toFixed(2),
            average: weeklyAvg.toFixed(2),
            entries: weeklyEntries.map(entry => ({
              date: entry.date,
              day_of_week: entry.day_of_week,
              total_hours: entry.total_hours || 0
            })),
            trendType: "up"
          },
          monthly: {
            total: monthlyTotal.toFixed(2),
            average: monthlyAvg.toFixed(2),
            trendType: "up"
          },
          leave: {
            balance: leaveStats.remaining,
            total: leaveStats.total,
            used: { paid: paidLeavesThisMonth },
            unpaid: unpaidLeavesThisMonth
          },
          recentEntries: recentEntries
        };
      } catch (error) {
        console.error("Error in stats query:", error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchInterval: 60000
  });

  // Subscribe to real-time updates for both time entries and leave records
  useEffect(() => {
    if (!user?.id) return;

    const timeEntriesSubscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
        queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      }
    });

    const leaveRecordsSubscription = subscribeToLeaveRecords(user.id, (payload) => {
      const { eventType } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
        queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
        queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      }
    });

    return () => {
      timeEntriesSubscription.unsubscribe();
      leaveRecordsSubscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your time tracking</p>
          </div>
          
          <ClockActions />
        </header>

        {statsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard
                title="This Week"
                value={formatHoursToHMS(Number(statsData?.weekly?.total || 0))}
                description="Total hours logged"
                trend={statsData?.weekly?.trend || "+0:00"}
                trendType={statsData?.weekly?.trendType || "none"}
              />
              
              <StatusCard
                title="This Month"
                value={formatHoursToHMS(Number(statsData?.monthly?.total || 0))}
                description="Total hours logged"
                trend={statsData?.monthly?.trend || "+0:00"}
                trendType={statsData?.monthly?.trendType || "none"}
              />
              
              {/* <StatusCard
                title="Leave Balance"
                value={`${statsData?.leave?.balance || 15} days`}
                description="Paid leave remaining"
                trend={`Used: ${statsData?.leave?.used || 0}`}
                trendType={statsData?.leave?.used > 0 ? "down" : "none"}
              /> */}

              <StatusCard
                title="Total Unpaid Leaves"
                value={`${statsData?.leave?.unpaid || 0} day${statsData?.leave?.unpaid !== 1 ? 's' : ''}`}
                description="Unpaid leave taken"
                trend={statsData?.leave?.unpaid > 0 ? "Warning" : "None"}
                trendType={statsData?.leave?.unpaid > 0 ? "alert" : "none"}
              />

              <StatusCard
                title="Paid Leave (This Month)"
                value={`${statsData?.leave?.used?.paid || 0} / 1`}
                description="Paid leave taken this month"
                trend={statsData?.leave?.used?.paid === 1 ? 'Maxed' : 'Available'}
                trendType={statsData?.leave?.used?.paid === 1 ? 'alert' : 'up'}
              />
            </div>

            {/* Time Summary & Current Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Day Status */}
              <div className="bg-card rounded-lg border border-border p-4 shadow-sm lg:col-span-1">
                <h3 className="text-lg font-semibold mb-4">Today's Status</h3>
                <CurrentStatus />
              </div>
              
              {/* Weekly Summary Chart */}
              <div className="bg-card rounded-lg border border-border p-4 shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Weekly Summary</h3>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center rounded-md text-xs h-7 px-2 font-medium bg-accent hover:bg-accent/80">
                      This Week
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md text-xs h-7 px-2 font-medium hover:bg-accent">
                      Last Week
                    </button>
                  </div>
                </div>
                
                <WeeklyChart entries={statsData?.weekly?.entries || []} />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <div>Total: <span className="font-mono font-medium text-foreground">{formatHoursToHMS(Number(statsData?.weekly?.total || 0))}</span></div>
                  <div>Average: <span className="font-mono font-medium text-foreground">{formatHoursToHMS(Number(statsData?.weekly?.average || 0))}</span> / day</div>
                </div>
              </div>
            </div>
            
            {/* Recent Time Entries */}
            <div className="bg-card rounded-lg border border-border shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-semibold">Recent Time Entries</h3>
                <a href="/time-entries" className="text-sm text-primary hover:underline">View All</a>
              </div>
              
              <TimeEntriesTable 
// Inside your TimeEntriesTable component props
entries={statsData?.recentEntries?.map(entry => ({
  id: entry.id,
  date: entry.date,
  day_of_week: entry.day_of_week,
  check_in: entry.check_in,
  check_out: entry.check_out,
  total_hours: entry.total_hours,
  status: entry.status
})) || []}              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

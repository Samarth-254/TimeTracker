import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { useAuth } from "@/hooks/use-auth";
import { getCurrentTimeEntry, subscribeToUserTimeEntries } from "@/lib/supabase";

export default function CurrentStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentEntry, isLoading } = useQuery({
    queryKey: ["current-time-entry"],
    queryFn: () => getCurrentTimeEntry(user?.id),
    enabled: !!user?.id,
    staleTime: 0,
    refetchInterval: 60000 // Refetch every minute
  });

  const { hours, minutes, seconds, isRunning } = useTimer(
    currentEntry?.status === "active" ? `${currentEntry.date}T${currentEntry.check_in}` : null
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
        // Invalidate the current time entry query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ["current-time-entry"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[120px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentEntry?.status === "active" ? (
        <>
          <div className="flex items-center gap-2 text-success">
            <Clock className="h-4 w-4" />
            <span>Currently Working</span>
          </div>
          
          <div className="font-mono text-3xl font-medium">
            {String(hours).padStart(2, "0")}:
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
          
          <div className="text-sm text-muted-foreground">
            Since {format(new Date(`${currentEntry.date}T${currentEntry.check_in}`), "hh:mm a")}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Not Working</span>
          </div>
          
          <div className="font-mono text-3xl font-medium">
            00:00:00
          </div>
          
          <div className="text-sm text-muted-foreground">
            Click the Clock In button to start tracking
          </div>
        </>
      )}
    </div>
  );
}

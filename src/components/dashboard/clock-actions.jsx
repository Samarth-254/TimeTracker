import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { clockIn as clockInApi, clockOut as clockOutApi, getCurrentTimeEntry } from "@/lib/supabase";

export default function ClockActions() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get current time entry status
  const { data: currentEntry } = useQuery({
    queryKey: ["current-time-entry"],
    queryFn: async () => {
      if (!user?.id) return null;
      return getCurrentTimeEntry(user.id);
    },
    enabled: !!user?.id,
    staleTime: 0 // Disable stale time
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      return await clockInApi(user.id);
    },
    onSuccess: () => {
      toast({
        title: "Clocked in successfully",
        description: "Your work time is now being tracked.",
      });
      // Invalidate all affected queries
      queryClient.invalidateQueries({ queryKey: ["current-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-chart"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to clock in",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const result = await clockOutApi(user.id);
      // Force an immediate update of current entry
      queryClient.setQueryData(["current-time-entry"], {
        ...result,
        status: 'completed'
      });
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Clocked out successfully",
        description: "Your work time has been recorded.",
      });
      // Invalidate all affected queries to ensure full dashboard sync
      queryClient.invalidateQueries({ queryKey: ["current-time-entry"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["leave-records"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-chart"] });
      queryClient.invalidateQueries(); // Invalidate all queries to ensure complete sync
    },
    onError: (error) => {
      toast({
        title: "Failed to clock out",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleClockIn = () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to clock in.",
        variant: "destructive",
      });
      return;
    }
    clockIn.mutate();
  };

  const handleClockOut = () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to clock out.",
        variant: "destructive",
      });
      return;
    }
    clockOut.mutate();
  };

  const isActive = currentEntry?.status === "active";

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleClockIn}
        disabled={isLoading || isActive}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded"
      >
        {isLoading && clockIn.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Clock In
      </Button>
      
      <Button
        onClick={handleClockOut}
        disabled={isLoading || !isActive}
        className="bg-red-600 hover:bg-red-700 text-white font-medium rounded"
      >
        {isLoading && clockOut.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Clock Out
      </Button>
    </div>
  );
}
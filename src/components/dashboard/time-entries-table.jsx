import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Loader2 } from "lucide-react";
import { formatDateInIndianTimezone, formatHoursToHMS } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserTimeEntries } from "@/lib/supabase";
import { timeEntriesApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const timeEntryFormSchema = z.object({
  check_in: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Invalid time format (HH:MM:SS)"),
  check_out: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Invalid time format (HH:MM:SS)"),
});

export default function TimeEntriesTable({ 
  entries = [], 
  showEditButton = false,
  showPagination = false
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [localEntries, setLocalEntries] = useState(entries);
  const [isUpdating, setIsUpdating] = useState(false);

  // For debugging - moved after localEntries is defined
  console.log("Current entries:", localEntries);

  // Update local entries when prop changes
  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Update the local state immediately for optimistic updates
      setLocalEntries(currentEntries => {
        if (eventType === 'INSERT') {
          return [newRecord, ...currentEntries];
        }
        
        if (eventType === 'UPDATE') {
          return currentEntries.map(entry => 
            entry.id === newRecord.id ? newRecord : entry
          );
        }
        
        if (eventType === 'DELETE') {
          return currentEntries.filter(entry => entry.id !== oldRecord.id);
        }
        
        return currentEntries;
      });

      // Also invalidate the query cache to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  const form = useForm({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      check_in: "",
      check_out: "",
    },
  });

  const updateTimeEntry = useMutation({
    mutationFn: async (data) => {
      if (!selectedEntry) throw new Error("No entry selected");
      setIsUpdating(true);
      return await timeEntriesApi.update(selectedEntry.id, data);
    },
    onSuccess: () => {
      toast({
        title: "Time entry updated",
        description: "Your time entry has been successfully updated.",
      });
      // Invalidate all relevant queries for full UI refresh
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-chart"] });
      queryClient.invalidateQueries({ queryKey: ["current-time-entry"] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    form.reset({
      check_in: entry.check_in || "",
      check_out: entry.check_out || "",
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (data) => {
    updateTimeEntry.mutate(data);
  };

  const getStatusBadge = (entry) => {
    if (!entry.check_in && !entry.check_out) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Weekend
        </Badge>
      );
    }
    
    if (entry.status === "completed") {
      return (
        <Badge className="bg-success/20 text-success">
          Completed
        </Badge>
      );
    }
    
    if (entry.status === "active") {
      return (
        <Badge className="bg-success/20 text-success">
          Active
        </Badge>
      );
    }
    
    if (entry.status === "pending") {
      return (
        <Badge className="bg-warning/20 text-warning-DEFAULT">
          Partial Day
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="bg-destructive/20">
        Missing
      </Badge>
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
              {showEditButton && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {localEntries.length > 0 ? (
              localEntries.map((entry) => (
                <TableRow key={entry.id} className="border-b border-border hover:bg-accent/30">
<TableCell className="px-4 py-3 text-sm">
  {format(parseISO(entry.date), "MMM d, yyyy")}
</TableCell>
<TableCell className="px-4 py-3 text-sm">
  {entry.day_of_week}  {/* Use the stored day_of_week directly */}
</TableCell>                 <TableCell className="px-4 py-3 text-sm">
                    {entry.check_in || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {entry.check_out || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono">
                    {entry.total_hours !== undefined && entry.total_hours !== null && entry.total_hours !== "-" ? formatHoursToHMS(Number(entry.total_hours)) : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {getStatusBadge(entry)}
                  </TableCell>
                  {showEditButton && (
                    <TableCell className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={showEditButton ? 7 : 6}
                  className="h-24 text-center"
                >
                  No entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Update the check-in and check-out times for this entry.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="check_in"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check In Time</FormLabel>
                    <FormControl>
                      <Input placeholder="HH:MM:SS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="check_out"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Out Time</FormLabel>
                    <FormControl>
                      <Input placeholder="HH:MM:SS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

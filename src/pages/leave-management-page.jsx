import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfYear, endOfYear } from "date-fns";
import { Loader2, Plus, Calendar, Info } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { leaveRecordsApi } from "@/lib/api";
import { subscribeToUserLeaveRecords } from "@/lib/supabase";
import { Layout } from "@/components/layout";
import LeaveForm from "@/components/leave/leave-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LeaveManagementPage() {
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for leave records and stats
  const { data: leaveData, isLoading } = useQuery({
    queryKey: ["leave-records-and-stats"],
    queryFn: async () => {
      const startDate = format(startOfYear(new Date()), "yyyy-MM-dd");
      const endDate = format(endOfYear(new Date()), "yyyy-MM-dd");
      
      const [records, stats] = await Promise.all([
        leaveRecordsApi.getRange(startDate, endDate, user.id),
        leaveRecordsApi.getLeaveStats(user.id)
      ]);

      return {
        records,
        stats
      };
    },
    enabled: !!user?.id
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = subscribeToUserLeaveRecords(user.id, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
        // Optimistically update the UI
        queryClient.setQueryData(["leave-records-and-stats"], (old) => {
          if (!old) return old;

          let updatedRecords = [...(old.records || [])];
          
          if (eventType === 'INSERT') {
            updatedRecords = [newRecord, ...updatedRecords];
          } else if (eventType === 'UPDATE') {
            updatedRecords = updatedRecords.map(record => 
              record.id === newRecord.id ? newRecord : record
            );
          } else if (eventType === 'DELETE') {
            updatedRecords = updatedRecords.filter(record => 
              record.id !== oldRecord.id
            );
          }

          // Sort records by date (most recent first)
          updatedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

          return {
            ...old,
            records: updatedRecords,
          };
        });

        // Also invalidate the queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: ["leave-records-and-stats"] });
        queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  const deleteLeaveRecord = useMutation({
    mutationFn: async (id) => {
      return leaveRecordsApi.delete(id);
    },
    onSuccess: () => {
      toast({
        title: "Leave record deleted",
        description: "The leave record has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["leave-records-and-stats"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      setIsDeleteDialogOpen(false);
      setSelectedLeave(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (record) => {
    setSelectedLeave(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteLeave = () => {
    if (selectedLeave?.id) {
      deleteLeaveRecord.mutate(selectedLeave.id);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 bg-black text-white">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leave Management</h1>
            <p className="text-gray-400">Request and manage your leave days</p>
          </div>
          
          <Button 
            onClick={() => setIsAddLeaveOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Apply for Leave
          </Button>
        </header>
        
        {/* Leave Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black rounded-lg border border-gray-800 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Paid Leave</p>
                <h3 className="text-2xl font-bold mt-1">
                  {leaveData?.stats?.used?.paid || 0} / 1
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {leaveData?.stats?.used?.paid === 1 ? 'Taken this month' : 'Available this month'}
                </p>
              </div>
              <div className="bg-green-900 rounded-full px-2 py-1 text-xs text-green-400">
                Paid
              </div>
            </div>
          </div>

          <div className="bg-black rounded-lg border border-gray-800 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Unpaid Leave</p>
                <h3 className="text-2xl font-bold mt-1">{leaveData?.stats?.used?.unpaid || 0}</h3>
                <p className="text-xs text-gray-500 mt-1">Used this year</p>
              </div>
              <div className="bg-yellow-900 rounded-full px-2 py-1 text-xs text-yellow-400">
                Unpaid
              </div>
            </div>
          </div>

          <div className="bg-black rounded-lg border border-gray-800 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">Casual Leave</p>
                <h3 className="text-2xl font-bold mt-1">{leaveData?.stats?.used?.casual || 0}</h3>
                <p className="text-xs text-gray-500 mt-1">Used this year</p>
              </div>
              <div className="bg-blue-900 rounded-full px-2 py-1 text-xs text-blue-400">
                Casual
              </div>
            </div>
          </div>
        </div>
        
        {/* Leave Records Table */}
        <div className="rounded-lg border border-gray-800 bg-black">
          <header className="p-4 border-b border-gray-800">
            <h2 className="font-semibold">Leave Records</h2>
          </header>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Day</TableHead>
                    <TableHead className="text-gray-400">Leave Type</TableHead>
                    <TableHead className="text-gray-400">Note</TableHead>
                    <TableHead className="text-right text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveData?.records && leaveData.records.length > 0 ? (
                    leaveData.records.map((record) => (
                      <TableRow key={record.id} className="border-gray-800">
                        <TableCell className="text-white">
                          {format(parseISO(record.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-white">
                          {format(parseISO(record.date), "EEEE")}
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium 
                            ${record.leave_type === 'paid' ? 'bg-green-900 text-green-400' : 
                              record.leave_type === 'unpaid' ? 'bg-yellow-900 text-yellow-400' : 
                              'bg-blue-900 text-blue-400'}`}>
                            {record.leave_type === 'paid' ? 'Paid Leave' : 
                             record.leave_type === 'unpaid' ? 'Unpaid Leave' : 'Casual Leave'}
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          {record.note || "No note"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(record)}
                            className="bg-red-700 hover:bg-red-800 text-white"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-gray-800">
                      <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                        No leave records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Leave Dialog */}
      <Dialog open={isAddLeaveOpen} onOpenChange={setIsAddLeaveOpen}>
        <DialogContent className="bg-zinc-900 text-white border border-gray-800">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the details to request leave
            </DialogDescription>
          </DialogHeader>
          
          <LeaveForm 
            onSuccess={() => setIsAddLeaveOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 text-white border border-gray-800">
          <DialogHeader>
            <DialogTitle>Delete Leave Record</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this leave record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="py-3">
              <p>
                <span className="font-medium">Date:</span>{" "}
                {format(parseISO(selectedLeave.date), "MMM d, yyyy")} ({format(parseISO(selectedLeave.date), "EEEE")})
              </p>
              <p>
                <span className="font-medium">Leave Type:</span>{" "}
                {selectedLeave.leave_type.charAt(0).toUpperCase() + selectedLeave.leave_type.slice(1)} Leave
              </p>
              {selectedLeave.note && (
                <p>
                  <span className="font-medium">Note:</span> {selectedLeave.note}
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteLeave}
              disabled={deleteLeaveRecord.isPending}
              className="bg-red-700 hover:bg-red-800"
            >
              {deleteLeaveRecord.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
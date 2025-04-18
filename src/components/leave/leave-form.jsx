import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { leaveRecordsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const leaveFormSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  leaveType: z.enum(["paid", "unpaid", "casual"], {
    required_error: "Please select a leave type",
  }),
  note: z.string().optional(),
});

export default function LeaveForm({ onSuccess }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      date: new Date(),
      leaveType: "paid",
      note: "",
    },
  });
  
  const createLeaveRecord = useMutation({
    mutationFn: async (data) => {
      const formattedData = {
        date: format(data.date, "yyyy-MM-dd"),
        leave_type: data.leaveType,
        note: data.note || null,
        user_id: user.id
      };
      
      return leaveRecordsApi.create(formattedData);
    },
    onSuccess: (newRecord) => {
      toast({
        title: "Leave request submitted",
        description: "Your leave request has been successfully submitted.",
      });
      
      // Optimistically update the UI
      queryClient.setQueryData(["leave-records-and-stats"], (old) => {
        if (!old) return old;

        // Add new record to the beginning of the list
        const updatedRecords = [newRecord, ...(old.records || [])];
        
        // Sort records by date (most recent first)
        updatedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
          ...old,
          records: updatedRecords,
        };
      });

      // Also invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["leave-records-and-stats"] });
      queryClient.invalidateQueries({ queryKey: ["stats-summary"] });
      
      // Reset form
      form.reset({
        date: new Date(),
        leaveType: "paid",
        note: "",
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Leave request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data) => {
    createLeaveRecord.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Leave Date</FormLabel>
              <FormDescription>Select the date for your leave</FormDescription>
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                minDate={new Date()}
                className="rounded-md border"
                initialFocus
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="paid">Paid Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {field.value === "paid" && "Deducted from your annual leave balance"}
                {field.value === "unpaid" && "Leave without pay"}
                {field.value === "casual" && "Short-term leave for personal matters"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide any additional details about your leave request"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={createLeaveRecord.isPending}>
            {createLeaveRecord.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Leave Request
          </Button>
        </div>
      </form>
    </Form>
  );
}

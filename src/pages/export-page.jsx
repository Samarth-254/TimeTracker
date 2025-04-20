import { useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Loader2, FileDown, Calendar } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase"; // Import supabase client
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHoursToHMS } from "@/lib/utils";

export default function ExportPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [exportType, setExportType] = useState("time-entries");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
  
  // Use React Query for fetching time entries directly from Supabase
  const { data: timeEntries, isLoading: isLoadingTimeEntries } = useQuery({
    queryKey: ["time-entries-export", startDate, endDate],
    queryFn: async () => {
      try {
        console.log(`Fetching time entries from ${startDate} to ${endDate}`);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { data, error } = await supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        console.log(`Retrieved ${data?.length || 0} time entries`);
        return data || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        toast({
          title: "Error fetching time entries",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: exportType === "time-entries",
  });
  
  // Use React Query for fetching leave records directly from Supabase
  const { data: leaveRecords, isLoading: isLoadingLeaveRecords } = useQuery({
    queryKey: ["leave-records-export", startDate, endDate],
    queryFn: async () => {
      try {
        console.log(`Fetching leave records from ${startDate} to ${endDate}`);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { data, error } = await supabase
          .from('leave_records')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        console.log(`Retrieved ${data?.length || 0} leave records`);
        return data || [];
      } catch (error) {
        console.error("Error fetching leave records:", error);
        toast({
          title: "Error fetching leave records",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: exportType === "leave-records",
  });
  
  const isLoading = exportType === "time-entries" ? isLoadingTimeEntries : isLoadingLeaveRecords;
  const data = exportType === "time-entries" ? timeEntries : leaveRecords;
  
  const handleExport = async () => {
    if (!data || data.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no records available for the selected month.",
        variant: "default",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      if (exportType === "time-entries") {
        csvContent += "Date,Day,Check In,Check Out,Total Hours,Status\n";
        
        // Add data rows
        data.forEach((entry) => {
          const day = format(parseISO(entry.date), "EEEE");
          const totalHoursHMS = entry.total_hours ? formatHoursToHMS(Number(entry.total_hours)) : "00:00:00";
          const row = [
            entry.date,
            day,
            entry.check_in || "",
            entry.check_out || "",
            totalHoursHMS,
            entry.status
          ].map(field => `"${field}"`).join(",");
          csvContent += row + "\n";
        });
      } else {
        csvContent += "Date,Day,Leave Type,Note\n";
        
        // Add data rows
        data.forEach((record) => {
          const day = format(parseISO(record.date), "EEEE");
          const row = [
            record.date,
            day,
            record.leave_type,
            record.note || ""
          ].map(field => `"${field}"`).join(",");
          csvContent += row + "\n";
        });
      }
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${exportType}-${format(selectedMonth, "yyyy-MM")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Export Data</h1>
          <p className="text-muted-foreground">Export your time entries and leave records</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Settings</CardTitle>
              <CardDescription>
                Select what data you want to export and the time period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Export Type</label>
                <Select
                  value={exportType}
                  onValueChange={setExportType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select export type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time-entries">Time Entries</SelectItem>
                    <SelectItem value="leave-records">Leave Records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Select Month</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(selectedMonth, "MMMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      initialFocus
                      granularity="month"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleExport}
                disabled={isLoading || isExporting || !data || data.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                {isExporting ? "Exporting..." : "Export to CSV"}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {exportType === "time-entries"
                  ? "Preview of time entries for the selected month"
                  : "Preview of leave records for the selected month"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : data && data.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 bg-muted/50 sticky top-0">Date</th>
                        {exportType === "time-entries" ? (
                          <>
                            <th className="text-left p-2 bg-muted/50 sticky top-0">Check In</th>
                            <th className="text-left p-2 bg-muted/50 sticky top-0">Check Out</th>
                            <th className="text-left p-2 bg-muted/50 sticky top-0">Hours</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left p-2 bg-muted/50 sticky top-0">Leave Type</th>
                            <th className="text-left p-2 bg-muted/50 sticky top-0">Note</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {exportType === "time-entries" ? (
                        data.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="p-2">{format(parseISO(entry.date), "MMM d, EEE")}</td>
                            <td className="p-2 font-mono">{entry.check_in || "--:--"}</td>
                            <td className="p-2 font-mono">{entry.check_out || "--:--"}</td>
                            <td className="p-2 font-mono">
                              {entry.total_hours ? formatHoursToHMS(Number(entry.total_hours)) : "00:00:00"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        data.map((record) => (
                          <tr key={record.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="p-2">{format(parseISO(record.date), "MMM d, EEE")}</td>
                            <td className="p-2 capitalize">{record.leave_type}</td>
                            <td className="p-2">{record.note || "N/A"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for the selected month
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              {data ? `${data.length} record${data.length !== 1 ? "s" : ""} found` : "Loading data..."}
            </CardFooter>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Previous Exports</CardTitle>
            <CardDescription>
              Quick access to export data from previous months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((monthsAgo) => {
                const prevMonth = subMonths(new Date(), monthsAgo);
                return (
                  <Button
                    key={monthsAgo}
                    variant="outline"
                    className="justify-start"
                    onClick={() => setSelectedMonth(prevMonth)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(prevMonth, "MMMM yyyy")}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
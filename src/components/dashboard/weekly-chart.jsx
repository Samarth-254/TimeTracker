import { format, parseISO } from "date-fns";
import { formatHoursToHMS } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function WeeklyChart({ entries = [] }) {
  // Transform entries into chart data
  const chartData = entries.map(entry => ({
    name: format(parseISO(entry.date), "EEE"),
    hours: entry.total_hours ? parseFloat(entry.total_hours) : 0,
    color: entry.status === "completed" ? "#22c55e" : entry.status === "active" ? "#3b82f6" : "#6b7280"
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {formatHoursToHMS(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis 
            dataKey="name"
            tick={{ fill: '#fff' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={{ stroke: 'var(--border)' }}
          />
          <YAxis 
            tick={{ fill: '#fff', fontSize: 13 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="hours"
            fill="currentColor"
            className="fill-primary"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

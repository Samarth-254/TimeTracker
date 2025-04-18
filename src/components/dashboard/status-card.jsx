import { ChevronUp, ChevronDown, Plus, AlertCircle } from "lucide-react";

export default function StatusCard({
  title,
  value,
  description,
  trend,
  trendType
}) {
  const getTrendIcon = () => {
    switch (trendType) {
      case "up":
        return <ChevronUp className="mr-1 h-3 w-3" />;
      case "down":
        return <ChevronDown className="mr-1 h-3 w-3" />;
      case "alert":
        return <AlertCircle className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTrendClasses = () => {
    switch (trendType) {
      case "up":
        return "border-green-500 text-green-500 bg-green-500/10";
      case "down":
        return "border-warning-DEFAULT text-warning-DEFAULT bg-warning-DEFAULT/10";
      case "alert":
        return "border-destructive text-destructive bg-destructive/10";
      default:
        return "border-muted text-muted-foreground bg-muted/10";
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1 font-mono">{value}</h3>
        </div>
        
        {trend && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getTrendClasses()}`}>
            {getTrendIcon()}
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}

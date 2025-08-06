import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return {
          variant: "secondary" as const,
          className: "status-pending",
          icon: Clock,
          text: "Pending",
        };
      case "approved":
        return {
          variant: "secondary" as const,
          className: "status-approved",
          icon: CheckCircle,
          text: "Approved",
        };
      case "denied":
        return {
          variant: "destructive" as const,
          className: "status-denied",
          icon: XCircle,
          text: "Denied",
        };
      case "appealed":
        return {
          variant: "secondary" as const,
          className: "status-appealed",
          icon: AlertCircle,
          text: "Appealed",
        };
      default:
        return {
          variant: "secondary" as const,
          className: "status-pending",
          icon: Clock,
          text: status,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`status-badge ${config.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  );
}

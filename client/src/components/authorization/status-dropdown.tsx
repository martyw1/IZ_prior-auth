import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


interface StatusDropdownProps {
  authorizationId: number;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "denied", label: "Denied", color: "bg-red-100 text-red-800" },
  { value: "in_review", label: "In Review", color: "bg-blue-100 text-blue-800" },
  { value: "appealed", label: "Appealed", color: "bg-purple-100 text-purple-800" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-800" },
];

export default function StatusDropdown({ 
  authorizationId, 
  currentStatus, 
  onStatusChange 
}: StatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/authorizations/${authorizationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Status Updated",
        description: `Authorization status changed to ${variables}`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      onStatusChange?.(variables);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update authorization status",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsUpdating(true);
    updateStatusMutation.mutate(newStatus);
  };

  return (
    <Select 
      value={currentStatus} 
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                {option.label}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
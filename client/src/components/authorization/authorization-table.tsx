import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import StatusBadge from "./status-badge";

interface Authorization {
  id: number;
  authorizationId: string;
  patientId: number;
  treatmentType: string;
  cptCode: string;
  status: string;
  submittedDate: string;
  patient?: {
    firstName: string;
    lastName: string;
    patientId: string;
  };
  insurance?: {
    insuranceProvider: {
      name: string;
    };
    memberId: string;
  };
}

interface AuthorizationTableProps {
  onView: (authorization: Authorization) => void;
  onEdit: (authorization: Authorization) => void;
}

export default function AuthorizationTable({
  onView,
  onEdit,
}: AuthorizationTableProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authorizations, isLoading } = useQuery({
    queryKey: ["/api/authorizations", page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/authorizations?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch authorizations");
      return response.json();
    },
  });

  const deleteAuthorizationMutation = useMutation({
    mutationFn: async (authId: number) => {
      return await apiRequest(`/api/authorizations/${authId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
      toast({
        title: "Success",
        description: "Authorization deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete authorization",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (authId: number) => {
    deleteAuthorizationMutation.mutate(authId);
  };

  if (isLoading) {
    return (
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Recent Prior Authorizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="healthcare-card">
      <CardHeader>
        <CardTitle>Recent Prior Authorizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorizations?.map((auth: Authorization) => (
                <TableRow key={auth.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-gray-300">
                          <User className="h-5 w-5 text-gray-500" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {auth.patient?.firstName} {auth.patient?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {auth.patient?.patientId}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {auth.treatmentType}
                    </div>
                    <div className="text-sm text-gray-500">
                      CPT: {auth.cptCode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {auth.insurance?.insuranceProvider?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Member: {auth.insurance?.memberId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={auth.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(auth.submittedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(auth)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(auth)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Authorization</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this prior authorization request? 
                              This action cannot be undone and will permanently remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(auth.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteAuthorizationMutation.isPending}
                            >
                              {deleteAuthorizationMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

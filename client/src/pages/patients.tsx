import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, UserPlus, Eye, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PatientForm from "@/components/patients/patient-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const { token } = useAuth();

  // Delete single patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete patient');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient Deleted",
        description: "Patient record has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete all patients mutation
  const deleteAllPatientsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/patients-deleteall', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete all patients');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "All Patients Deleted",
        description: "All patient records have been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete all patients. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ["/api/patients", page],
    queryFn: async () => {
      const response = await fetch(`/api/patients?page=${page}&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  const patients = patientsData?.patients || [];
  const totalPages = patientsData?.totalPages || 1;
  const totalCount = patientsData?.totalCount || 0;

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/patients/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to search patients");
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const [viewingPatient, setViewingPatient] = useState<any>(null);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleViewPatient = (patient: any) => {
    setViewingPatient(patient);
    setViewModalOpen(true);
  };

  const handleEditPatient = (patient: any) => {
    setEditingPatient(patient);
    setEditModalOpen(true);
  };

  const handleDeletePatient = (patient: any) => {
    deletePatientMutation.mutate(patient.id);
  };

  const handleDeleteAllPatients = () => {
    deleteAllPatientsMutation.mutate();
  };

  const displayedPatients = searchQuery.trim() ? (searchResults || []) : (patients || []);
  const loading = searchQuery.trim() ? searchLoading : isLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Management</h2>
          <p className="text-gray-600">Manage patient records and information ({totalCount} total patients)</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={totalCount === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Records
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Patient Records</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all {totalCount} patient records and remove all data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllPatients} className="bg-red-600 hover:bg-red-700">
                  Delete All Records
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <PatientForm
            trigger={
              <Button className="healthcare-button-primary">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Patient
              </Button>
            }
          />
        </div>
      </div>

      {/* Search Bar */}
      <Card className="healthcare-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="healthcare-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {searchQuery.trim() ? "Search Results" : `All Patients (Page ${page} of ${totalPages})`}
            </CardTitle>
            {!searchQuery.trim() && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Emergency Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(displayedPatients) || displayedPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          {searchQuery.trim() ? "No patients found matching your search." : "No patients found."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    Array.isArray(displayedPatients) && displayedPatients.map((patient: any) => (
                      <TableRow key={patient.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {patient.patientId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {patient.phone || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {patient.email || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {patient.emergencyContact || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPatient(patient)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPatient(patient)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
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
                                  <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {patient.firstName} {patient.lastName}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePatient(patient)} className="bg-red-600 hover:bg-red-700">
                                    Delete Patient
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Patient Modal */}
      {viewingPatient && (
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Patient Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.firstName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.lastName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="text-sm text-gray-900 mt-1">
                    {new Date(viewingPatient.dateOfBirth).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient ID</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.patientId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.phone || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.email || 'N/A'}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.address || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Emergency Contact</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.emergencyContact || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Emergency Phone</label>
                  <div className="text-sm text-gray-900 mt-1">{viewingPatient.emergencyPhone || 'N/A'}</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Patient Modal */}
      {editingPatient && (
        <PatientForm
          trigger={<div />}
          isOpen={editModalOpen}
          onOpenChange={setEditModalOpen}
          editData={editingPatient}
          mode="edit"
          onSuccess={() => {
            setEditingPatient(null);
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

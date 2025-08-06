import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Filter, Eye, Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AuthorizationModal from "@/components/authorization/authorization-modal";
import StatusBadge from "@/components/authorization/status-badge";
import StatusDropdown from "@/components/authorization/status-dropdown";
import { useToast } from "@/hooks/use-toast";

export default function Authorizations() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const { data: authorizations, isLoading } = useQuery({
    queryKey: ["/api/authorizations", page, statusFilter],
    queryFn: async () => {
      let url = `/api/authorizations?page=${page}&limit=50`;
      if (statusFilter !== "all") {
        url = `/api/authorizations/status/${statusFilter}`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch authorizations");
      return response.json();
    },
  });

  const handleViewAuthorization = (authorization: any) => {
    // Create modal or navigate to detailed view
    const cptCodes = authorization.cptCodes || [authorization.cptCode].filter(Boolean);
    const icd10Codes = authorization.icd10Codes || [authorization.icd10Code].filter(Boolean);
    
    const authDetails = `
Authorization ID: ${authorization.authorizationId}
Patient: ${authorization.patient?.firstName || 'N/A'} ${authorization.patient?.lastName || 'N/A'}
Treatment: ${authorization.treatmentType}
CPT Codes: ${cptCodes.join(', ') || 'None'}
ICD-10 Codes: ${icd10Codes.join(', ') || 'None'}
Status: ${authorization.status}
Submitted: ${authorization.submittedDate ? new Date(authorization.submittedDate).toLocaleDateString() : 'Not submitted'}
Insurance: ${authorization.insurance?.insuranceProvider?.name || 'N/A'}
Clinical Justification: ${authorization.clinicalJustification || 'None provided'}
    `;
    
    alert(`Authorization Details:\n\n${authDetails}`);
  };

  const [editingAuth, setEditingAuth] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleEditAuthorization = (authorization: any) => {
    console.log("Edit authorization:", authorization);
    setEditingAuth(authorization);
    setEditModalOpen(true);
  };

  const handleAppeal = (authorization: any) => {
    toast({
      title: "Appeal Authorization",
      description: `Starting appeal process for ${authorization.authorizationId}`,
    });
  };

  const filteredAuthorizations = authorizations?.filter((auth: any) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      auth.authorizationId.toLowerCase().includes(searchLower) ||
      auth.treatmentType.toLowerCase().includes(searchLower) ||
      auth.cptCode.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prior Authorizations</h2>
          <p className="text-gray-600">Manage and track authorization requests</p>
        </div>
        <AuthorizationModal
          trigger={
            <Button className="healthcare-button-primary">
              <Plus className="h-4 w-4 mr-2" />
              New Authorization Request
            </Button>
          }
        />
      </div>

      {/* Filters and Search */}
      <Card className="healthcare-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by authorization ID, treatment, or CPT code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="appealed">Appealed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorizations Table */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Authorization Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <TableHead>Authorization ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuthorizations?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-500">
                          {searchQuery.trim() ? "No authorizations found matching your search." : "No authorizations found."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuthorizations?.map((auth: any) => (
                      <TableRow key={auth.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="text-sm font-medium text-gray-900">
                            {auth.authorizationId}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {auth.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarFallback className="bg-gray-300 text-gray-600">
                                P
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Patient #{auth.patientId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {auth.treatmentType}
                          </div>
                          <div className="text-sm text-gray-500">
                            CPT: {auth.cptCodes ? auth.cptCodes.join(', ') : auth.cptCode || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            Insurance #{auth.insuranceId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusDropdown 
                            authorizationId={auth.id}
                            currentStatus={auth.status}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {auth.submittedDate ? new Date(auth.submittedDate).toLocaleDateString() : "Not submitted"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAuthorization(auth)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAuthorization(auth)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {auth.status === "denied" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAppeal(auth)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Appeal
                              </Button>
                            )}
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
      
      {/* Edit Modal */}
      {editingAuth && (
        <AuthorizationModal
          trigger={<div />}
          isOpen={editModalOpen}
          onOpenChange={setEditModalOpen}
          editData={editingAuth}
          mode="edit"
          onSuccess={() => {
            setEditingAuth(null);
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

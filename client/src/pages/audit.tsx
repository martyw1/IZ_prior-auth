import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Download, Filter, Search, Shield, Eye, User } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Audit() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["/api/audit/logs"],
    queryFn: async () => {
      const response = await fetch("/api/audit/logs", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
    enabled: user?.role === "admin",
  });

  const handleExportAudit = () => {
    toast({
      title: "Exporting Audit Log",
      description: "Audit log export functionality would be implemented here",
    });
  };

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates for the audit report",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating Audit Report",
      description: `Generating audit report for ${startDate} to ${endDate}`,
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN_SUCCESS":
      case "LOGIN_FAILURE":
        return <User className="h-4 w-4" />;
      case "PATIENT_VIEW":
      case "PATIENT_CREATE":
      case "PATIENT_UPDATE":
        return <Eye className="h-4 w-4" />;
      case "AUTHORIZATION_VIEW":
      case "AUTHORIZATION_CREATE":
      case "AUTHORIZATION_UPDATE":
        return <Shield className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-green-100 text-green-800";
    if (action.includes("UPDATE")) return "bg-blue-100 text-blue-800";
    if (action.includes("DELETE")) return "bg-red-100 text-red-800";
    if (action.includes("VIEW")) return "bg-gray-100 text-gray-800";
    if (action.includes("LOGIN")) return "bg-purple-100 text-purple-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const filteredLogs = auditLogs?.filter((log: any) => {
    const matchesSearch = !searchQuery.trim() || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesResource = resourceFilter === "all" || log.resourceType === resourceFilter;
    
    return matchesSearch && matchesAction && matchesResource;
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-sm text-gray-600">
                You don't have permission to view audit logs. Contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
          <p className="text-gray-600">Monitor system access and user activities</p>
        </div>
        <Button onClick={handleExportAudit} className="healthcare-button-primary">
          <Download className="h-4 w-4 mr-2" />
          Export Audit Log
        </Button>
      </div>

      {/* Audit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-blue-600">{auditLogs?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <History className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Patient Access</p>
                <p className="text-3xl font-bold text-green-600">
                  {auditLogs?.filter((log: any) => log.resourceType === "patient").length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Auth Events</p>
                <p className="text-3xl font-bold text-purple-600">
                  {auditLogs?.filter((log: any) => log.resourceType === "authorization").length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Login Events</p>
                <p className="text-3xl font-bold text-orange-600">
                  {auditLogs?.filter((log: any) => log.action.includes("LOGIN")).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Generate Audit Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleGenerateReport} className="healthcare-button-primary">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="healthcare-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by action or resource type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                  <SelectItem value="LOGIN_FAILURE">Login Failure</SelectItem>
                  <SelectItem value="PATIENT_VIEW">Patient View</SelectItem>
                  <SelectItem value="PATIENT_CREATE">Patient Create</SelectItem>
                  <SelectItem value="AUTHORIZATION_VIEW">Authorization View</SelectItem>
                  <SelectItem value="AUTHORIZATION_CREATE">Authorization Create</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="authorization">Authorization</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Audit Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
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
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          {searchQuery.trim() ? "No audit logs found matching your search." : "No audit logs found."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user?.username || `User #${log.userId}`}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getActionColor(log.action)} flex items-center gap-1`}>
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resourceType}
                          {log.resourceId && ` #${log.resourceId}`}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.ipAddress || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.details ? (() => {
                            try {
                              const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                              if (log.action === 'LOGIN_SUCCESS') return 'User logged in successfully';
                              if (log.action === 'LOGIN_FAILURE') return 'Failed login attempt';
                              if (log.action === 'PATIENT_VIEW') return `Viewed patient record ${details.patientId || ''}`;
                              if (log.action === 'PATIENT_CREATE') return `Created new patient record`;
                              if (log.action === 'AUTHORIZATION_VIEW') return `Viewed authorization ${details.authorizationId || ''}`;
                              if (log.action === 'AUTHORIZATION_CREATE') return `Created new authorization request`;
                              if (log.action === 'DASHBOARD_VIEW') return 'Accessed dashboard';
                              if (log.action === 'AUTHORIZATION_LIST_VIEW') return 'Viewed authorization list';
                              if (log.action === 'INSURANCE_VERIFICATION') return `Verified insurance for patient ${details.patientId || ''}`;
                              return Object.keys(details).map(key => `${key}: ${details[key]}`).join(', ');
                            } catch (e) {
                              return log.details.toString();
                            }
                          })() : "N/A"}
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
    </div>
  );
}

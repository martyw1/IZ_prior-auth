import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Calendar, TrendingUp, Users, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [reportType, setReportType] = useState("authorizations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: authorizations } = useQuery({
    queryKey: ["/api/authorizations"],
    queryFn: async () => {
      const response = await fetch("/api/authorizations", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch authorizations");
      return response.json();
    },
  });

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating Report",
      description: `Generating ${reportType} report for ${startDate} to ${endDate}`,
    });
  };

  const handleExportReport = () => {
    toast({
      title: "Exporting Report",
      description: "Report export functionality would be implemented here",
    });
  };

  // Mock performance data
  const performanceData = [
    { month: "Jan", pending: 45, approved: 32, denied: 8 },
    { month: "Feb", pending: 52, approved: 38, denied: 12 },
    { month: "Mar", pending: 48, approved: 41, denied: 7 },
    { month: "Apr", pending: 61, approved: 45, denied: 14 },
    { month: "May", pending: 55, approved: 48, denied: 9 },
    { month: "Jun", pending: 67, approved: 52, denied: 11 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "denied": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Generate reports and analyze practice performance</p>
        </div>
        <Button onClick={handleExportReport} className="healthcare-button-primary">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Authorizations</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
                <p className="text-3xl font-bold text-purple-600">2.4</p>
                <p className="text-sm text-gray-500">days</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Generate Custom Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authorizations">Authorization Summary</SelectItem>
                  <SelectItem value="patients">Patient Activity</SelectItem>
                  <SelectItem value="insurance">Insurance Performance</SelectItem>
                  <SelectItem value="financial">Financial Analysis</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleGenerateReport} className="healthcare-button-primary">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Authorization Performance (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{data.month}</div>
                <div className="flex space-x-4">
                  <div className="text-sm">
                    <span className="text-yellow-600">Pending: {data.pending}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600">Approved: {data.approved}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-red-600">Denied: {data.denied}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Recent Authorization Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Authorization ID</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Processing Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizations?.slice(0, 10).map((auth: any) => (
                  <TableRow key={auth.id}>
                    <TableCell className="font-medium">{auth.authorizationId}</TableCell>
                    <TableCell>{auth.treatmentType}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(auth.status)}>
                        {auth.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {auth.submittedDate ? new Date(auth.submittedDate).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      {auth.submittedDate ? 
                        Math.ceil((Date.now() - new Date(auth.submittedDate).getTime()) / (1000 * 60 * 60 * 24)) + " days"
                        : "N/A"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

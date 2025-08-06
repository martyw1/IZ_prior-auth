import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bug, Info, AlertTriangle, AlertCircle, Skull, Download, Filter, Search } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AppLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: appLogs, isLoading, refetch } = useQuery({
    queryKey: ["/api/app-logs", levelFilter, componentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (levelFilter !== "all") params.append("level", levelFilter);
      if (componentFilter !== "all") params.append("component", componentFilter);
      params.append("_t", Date.now().toString()); // Cache busting
      
      const response = await fetch(`/api/app-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!response.ok) throw new Error("Failed to fetch app logs");
      return response.json();
    },
    enabled: user?.role === "admin",
    refetchInterval: 10000, // Refresh every 10 seconds to reduce API spam
  });

  const handleExportLogs = () => {
    toast({
      title: "Exporting App Logs",
      description: "App logs export functionality would be implemented here",
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "DEBUG":
        return <Bug className="h-4 w-4" />;
      case "INFO":
        return <Info className="h-4 w-4" />;
      case "WARN":
        return <AlertTriangle className="h-4 w-4" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4" />;
      case "FATAL":
        return <Skull className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "DEBUG":
        return "bg-gray-100 text-gray-800";
      case "INFO":
        return "bg-blue-100 text-blue-800";
      case "WARN":
        return "bg-yellow-100 text-yellow-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      case "FATAL":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredLogs = appLogs?.filter((log: any) => {
    const matchesSearch = !searchQuery.trim() || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.component.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesComponent = componentFilter === "all" || log.component === componentFilter;
    
    return matchesSearch && matchesLevel && matchesComponent;
  })?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (user?.role !== "admin") {
    return (
      <div className="space-y-6">
        <Card className="healthcare-card">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">Only administrators can access app event logs.</p>
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
          <h2 className="text-2xl font-bold text-gray-900">App Event Logs</h2>
          <p className="text-gray-600">Monitor system events and application performance</p>
        </div>
        <Button onClick={handleExportLogs} className="healthcare-button-primary">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Log Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {["DEBUG", "INFO", "WARN", "ERROR", "FATAL"].map((level) => (
          <Card key={level} className="healthcare-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{level}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appLogs?.filter((log: any) => log.level === level).length || 0}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getLevelColor(level)}`}>
                  {getLevelIcon(level)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="healthcare-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs by message or component..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="FATAL">FATAL</SelectItem>
                </SelectContent>
              </Select>
              <Select value={componentFilter} onValueChange={setComponentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by component" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                  <SelectItem value="AUTH">AUTH</SelectItem>
                  <SelectItem value="DATABASE">DATABASE</SelectItem>
                  <SelectItem value="REQUEST">REQUEST</SelectItem>
                  <SelectItem value="SECURITY">SECURITY</SelectItem>
                  <SelectItem value="PERFORMANCE">PERFORMANCE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Logs Table */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Application Event Log</CardTitle>
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
                    <TableHead>Level</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          {searchQuery.trim() ? "No logs found matching your search." : "No application logs found."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getLevelColor(log.level)} flex items-center gap-1`}>
                            {getLevelIcon(log.level)}
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {log.component}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.userId ? `User #${log.userId}` : "System"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.metadata ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:text-blue-800">View Details</summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                                {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                              </pre>
                            </details>
                          ) : (
                            "N/A"
                          )}
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
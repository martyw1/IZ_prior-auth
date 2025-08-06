import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Upload,
  FileText,
  Filter,
  Eye,
  Download,
  Trash2,
  Calendar,
} from "lucide-react";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents from API
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  // Fetch patients for filter dropdown
  const { data: patientsData } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  const patients = patientsData?.patients || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: any) => {
      console.log("🌐 [DURING-UPLOAD] Starting API request", {
        fileName: fileData.fileName,
        endpoint: "/api/documents/upload",
        method: "POST",
        hasToken: !!localStorage.getItem("token"),
        payloadSize: JSON.stringify(fileData).length,
      });

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ [DURING-UPLOAD] Authentication token missing");
        throw new Error("Authentication required");
      }
      
      console.log("📡 [DURING-UPLOAD] Sending request to server");
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(fileData),
      });
      
      console.log("📡 [DURING-UPLOAD] Server response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      });
      
      if (!response.ok) {
        console.error("❌ [DURING-UPLOAD] Server error response", {
          status: response.status,
          statusText: response.statusText,
        });
        
        const errorText = await response.text();
        console.error("❌ [DURING-UPLOAD] Server error details", {
          errorText,
          errorLength: errorText.length,
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error("❌ [DURING-UPLOAD] Parsed error data", errorData);
        } catch {
          errorData = { error: `Upload failed: ${response.status} ${response.statusText}` };
          console.error("❌ [DURING-UPLOAD] Could not parse error response, using fallback");
        }
        throw new Error(errorData.error || errorData.message || "Upload failed");
      }
      
      console.log("📄 [DURING-UPLOAD] Parsing successful response");
      const result = await response.json();
      
      console.log("✅ [POST-UPLOAD] Document upload completed successfully", {
        fileName: fileData.fileName,
        documentId: result.id,
        encryptedPath: result.encryptedPath,
        uploadedBy: result.uploadedBy,
        timestamp: new Date().toISOString(),
      });
      
      return result;
    },
    onSuccess: (result) => {
      console.log("🎉 [POST-UPLOAD] Upload mutation completed successfully", {
        documentId: result.id,
        fileName: result.fileName,
        completedAt: new Date().toISOString(),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Upload Complete",
        description: "Document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("❌ [POST-UPLOAD] Upload mutation failed", {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUpload = (file?: File) => {
    if (file) {
      console.log("📄 [PRE-UPLOAD] Document upload initiated", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        selectedPatient,
        timestamp: new Date().toISOString(),
      });

      // Validate file size (max 25MB to account for base64 encoding overhead)
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      if (file.size > maxSize) {
        console.error("❌ [PRE-UPLOAD] File size validation failed", {
          fileName: file.name,
          fileSize: file.size,
          maxSize,
          exceeded: file.size - maxSize,
        });
        toast({
          title: "File Too Large",
          description: "File size must be less than 25MB.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [PRE-UPLOAD] File size validation passed");

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'text/csv',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type) && file.type !== "") {
        console.error("❌ [PRE-UPLOAD] File type validation failed", {
          fileName: file.name,
          fileType: file.type,
          allowedTypes,
        });
        toast({
          title: "Invalid File Type",
          description: "Please upload a supported file format.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ [PRE-UPLOAD] File type validation passed");
      console.log("📖 [DURING-UPLOAD] Starting file content reading");

      // Convert file to base64 for sending to API
      const reader = new FileReader();
      reader.onload = () => {
        console.log("✅ [DURING-UPLOAD] File content read successfully", {
          contentLength: reader.result ? reader.result.toString().length : 0,
          encoding: "base64",
        });

        const fileData = {
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileContent: reader.result,
          patientId: selectedPatient !== "all" && selectedPatient ? parseInt(selectedPatient) : null,
          authorizationId: null,
        };
        
        console.log("🚀 [DURING-UPLOAD] Initiating upload mutation", { 
          fileName: file.name, 
          fileType: file.type, 
          fileSize: file.size,
          patientId: fileData.patientId,
          base64Length: reader.result ? reader.result.toString().length : 0,
          timestamp: new Date().toISOString(),
        });
        
        uploadMutation.mutate(fileData);
      };
      
      reader.onerror = (error) => {
        console.error("❌ [DURING-UPLOAD] File reading failed", {
          fileName: file.name,
          error: error,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: "File Read Error",
          description: "Failed to read the selected file.",
          variant: "destructive",
        });
      };
      
      reader.readAsDataURL(file);
    } else {
      // Trigger file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.rtf,.txt,.xls,.xlsx,.csv,.jpg,.jpeg,.png';
      input.onchange = (e) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
          handleUpload(selectedFile);
        }
      };
      input.click();
    }
  };

  const handleView = async (document: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view documents",
          variant: "destructive",
        });
        return;
      }

      // Fetch document with proper authentication
      const response = await fetch(`/api/documents/${document.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }

      // Create blob URL and open in new tab
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast({
        title: "Opening Document",
        description: `Opening ${document.fileName} in new tab`,
      });
    } catch (error) {
      toast({
        title: "View Error",
        description: "Failed to open the document",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (document: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to download documents",
          variant: "destructive",
        });
        return;
      }

      // Fetch document with proper authentication
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${document.fileName}`,
      });
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download the document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (document: any) => {
    if (confirm(`Are you sure you want to delete ${document.fileName}?`)) {
      deleteMutation.mutate(document.id);
    }
  };

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch = !searchQuery.trim() || 
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || doc.fileType.toLowerCase().includes(filterType.toLowerCase());
    const matchesPatient = selectedPatient === "all" || !selectedPatient || doc.patientId?.toString() === selectedPatient;
    
    return matchesSearch && matchesType && matchesPatient;
  });

  const getPatientName = (patientId: number) => {
    const patient = patients.find((p: any) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <p className="text-gray-600 mt-1">Manage and organize patient documents and authorization files</p>
      </div>

      {/* Upload Section */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop files here or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: PDF, DOC, DOCX, RTF, TXT, XLS, XLSX, JPG, PNG (Max 25MB)
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.txt,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="hidden"
              id="document-upload"
            />
            <label htmlFor="document-upload">
              <Button 
                asChild 
                variant="outline" 
                disabled={uploadMutation.isPending}
              >
                <span>
                  {uploadMutation.isPending ? "Uploading..." : "Browse Files"}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Section */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="File Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Patients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {patients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents Table */}
          {documentsLoading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {documents.length === 0 ? "No documents uploaded yet." : "No documents match your filters."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.fileName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.fileType}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {doc.patientId ? getPatientName(doc.patientId) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
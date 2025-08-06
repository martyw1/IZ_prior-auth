import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Mail, Code } from "lucide-react";

export default function PriorAuthGenerator() {
  const [selectedAuthorization, setSelectedAuthorization] = useState("");
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [customNotes, setCustomNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch authorizations
  const { data: authorizations = [], isLoading } = useQuery({
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

  // Generate package mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/prior-auth/generate-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to generate package");
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Package Generated",
        description: `Prior authorization package generated successfully in ${outputFormat.toUpperCase()} format.`,
      });
      
      if (result.downloadUrl) {
        // Trigger download with authentication
        const token = localStorage.getItem("token");
        const downloadUrl = result.downloadUrl.includes('?') 
          ? `${result.downloadUrl}&token=${token}`
          : `${result.downloadUrl}?token=${token}`;
        
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = result.fileName;
        link.click();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate prior authorization package.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedAuthorization) {
      toast({
        title: "Selection Required",
        description: "Please select a prior authorization to generate package for.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      authorizationId: selectedAuthorization,
      format: outputFormat,
      customNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Prior Authorization Package</h2>
          <p className="text-gray-600">Create formatted packages for insurance submission</p>
        </div>
        
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Prior Authorization Package</h2>
        <p className="text-gray-600">Create formatted packages for insurance submission</p>
      </div>

      {/* Main Form */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Package Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authorization Selection */}
          <div className="space-y-2">
            <Label htmlFor="authorization">Select Prior Authorization</Label>
            <Select value={selectedAuthorization} onValueChange={setSelectedAuthorization}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an authorization..." />
              </SelectTrigger>
              <SelectContent>
                {authorizations.map((auth: any) => (
                  <SelectItem key={auth.id} value={auth.id.toString()}>
                    {auth.authorizationId} - {auth.treatmentType} ({auth.patient?.firstName} {auth.patient?.lastName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Output Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Output Format</Label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF Document
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Pre-written Email
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    JSON Format
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes or comments..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Selected Authorization Details */}
          {selectedAuthorization && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Selected Authorization Details:</h4>
              {(() => {
                const auth = authorizations.find((a: any) => a.id.toString() === selectedAuthorization);
                return auth ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Authorization ID:</span> {auth.authorizationId}
                    </div>
                    <div>
                      <span className="font-medium">Patient:</span> {auth.patient?.firstName} {auth.patient?.lastName}
                    </div>
                    <div>
                      <span className="font-medium">Treatment:</span> {auth.treatmentType}
                    </div>
                    <div>
                      <span className="font-medium">CPT Code:</span> {auth.cptCode}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {auth.status}
                    </div>
                    <div>
                      <span className="font-medium">Insurance:</span> {auth.insurance?.insuranceProvider?.name}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={!selectedAuthorization || generateMutation.isPending}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : `Generate ${outputFormat.toUpperCase()} Package`}
          </Button>
        </CardContent>
      </Card>

      {/* Format Information */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Output Format Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">PDF Document</h4>
                <p className="text-sm text-gray-600">
                  Complete formatted document ready for printing or email attachment. Includes all patient information, 
                  medical justification, and required forms.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Pre-written Email</h4>
                <p className="text-sm text-gray-600">
                  Template email with subject line and body text ready to send to insurance provider. 
                  Includes all necessary information formatted for email submission.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Code className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">JSON Format</h4>
                <p className="text-sm text-gray-600">
                  Structured data format for API integration or custom processing. 
                  Contains all authorization data in machine-readable format.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
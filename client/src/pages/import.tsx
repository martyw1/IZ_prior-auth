import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Upload, 
  FileText, 
  Users, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Download,
  Cloud,
  Key,
  Database
} from "lucide-react";
import ImportTabContent from "@/components/import/import-tab-content";

export default function ImportPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  
  // Persist state using sessionStorage to prevent reset on navigation
  const getStoredState = (key: string, defaultValue: any) => {
    try {
      const stored = sessionStorage.getItem(`import_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };
  
  const setStoredState = (key: string, value: any) => {
    try {
      sessionStorage.setItem(`import_${key}`, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  };
  
  const [uploadProgress, setUploadProgress] = useState(() => getStoredState('progress', 0));
  const [isUploading, setIsUploading] = useState(() => getStoredState('uploading', false));
  const [uploadResults, setUploadResults] = useState(() => getStoredState('results', null));
  
  // ModMed EMA FHIR API integration state
  const [emaCredentials, setEmaCredentials] = useState(() => getStoredState('ema_credentials', {
    clientId: '',
    clientSecret: '',
    baseUrl: 'https://exscribe-prod-fhir.ema-api.com/fhir/modmed/root/r4',
    environment: 'production' // production or sandbox
  }));
  const [emaConnected, setEmaConnected] = useState(() => getStoredState('ema_connected', false));
  const [emaToken, setEmaToken] = useState(() => getStoredState('ema_token', null));
  const [emaPatients, setEmaPatients] = useState(() => getStoredState('ema_patients', []));

  const handleFileUpload = async (file: File, type: string, updateExisting = false) => {
    console.log("🚀 [PRE-UPLOAD] Starting file upload process", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadType: type,
      updateExisting,
      timestamp: new Date().toISOString(),
    });

    if (!token) {
      console.error("❌ [PRE-UPLOAD] Authentication token missing");
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ [PRE-UPLOAD] Authentication token found, proceeding with upload");

    const newIsUploading = true;
    const newProgress = 0;
    const newResults = null;
    
    setIsUploading(newIsUploading);
    setUploadProgress(newProgress);
    setUploadResults(newResults);
    
    // Store state immediately
    setStoredState('uploading', newIsUploading);
    setStoredState('progress', newProgress);
    setStoredState('results', newResults);
    
    try {
      console.log("📦 [DURING-UPLOAD] Preparing FormData and request");
      
      // Read file content
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('updateExisting', updateExisting.toString());

      console.log("⏳ [DURING-UPLOAD] Starting progress tracking");
      
      // Update progress incrementally but don't get stuck at 90%
      let progressCount = 0;
      const progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => {
          progressCount++;
          const newProg = Math.min(prev + 8, 85); // Only go up to 85% during fake progress
          console.log(`📊 [DURING-UPLOAD] Progress update ${progressCount}: ${newProg}%`);
          setStoredState('progress', newProg);
          return newProg;
        });
      }, 300);

      console.log("🌐 [DURING-UPLOAD] Sending request to server");

      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("📡 [DURING-UPLOAD] Server response received", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      clearInterval(progressInterval);
      
      // Immediately jump to 95% when server responds
      console.log("📊 [DURING-UPLOAD] Setting progress to 95% - server responded");
      setUploadProgress(95);
      setStoredState('progress', 95);

      if (!response.ok) {
        console.error("❌ [DURING-UPLOAD] Server error response", {
          status: response.status,
          statusText: response.statusText,
        });
        
        const errorData = await response.json();
        console.error("❌ [DURING-UPLOAD] Server error details", errorData);
        
        if (response.status === 401) {
          console.error("❌ [DURING-UPLOAD] Authentication failed - token expired");
          toast({
            title: "Authentication Failed",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.message || 'Import failed');
      }

      console.log("📊 [DURING-UPLOAD] Setting progress to 98% - parsing response");
      setUploadProgress(98);
      setStoredState('progress', 98);

      console.log("📄 [DURING-UPLOAD] Parsing server response");
      const result = await response.json();
      
      console.log("✅ [POST-UPLOAD] Server response parsed successfully", {
        recordsProcessed: result.recordsProcessed,
        recordsImported: result.recordsImported,
        recordsUpdated: result.recordsUpdated || 0,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        errorsCount: result.errors || 0,
      });

      const resultData = {
        type,
        fileName: file.name,
        recordsProcessed: result.recordsProcessed,
        recordsImported: result.recordsImported,
        recordsUpdated: result.recordsUpdated || 0,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        errors: result.errors,
        errorDetails: result.errorDetails || [],
        duplicates: result.duplicates || [],
        updates: result.updates || [],
        updateExisting
      };
      
      console.log("📊 [POST-UPLOAD] Setting final progress to 100%");
      const finalProgress = 100;
      setUploadProgress(finalProgress);
      setStoredState('progress', finalProgress);
      
      setUploadResults(resultData);
      setStoredState('results', resultData);

      const successCount = result.recordsImported + (result.recordsUpdated || 0);
      
      console.log("🎉 [POST-UPLOAD] Upload completed successfully", {
        fileName: file.name,
        successCount,
        finalResultData: resultData,
        completedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Import Complete",
        description: `${file.name} processed: ${successCount} records processed successfully.`,
      });
    } catch (error: any) {
      console.error("❌ [POST-UPLOAD] Upload failed with error", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process file.",
        variant: "destructive",
      });
    } finally {
      console.log("🏁 [POST-UPLOAD] Cleaning up upload state");
      const finalUploading = false;
      setIsUploading(finalUploading);
      setStoredState('uploading', finalUploading);
    }
  };

  // Clear stored state when user wants to start fresh
  const clearImportState = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setUploadResults(null);
    setStoredState('progress', 0);
    setStoredState('uploading', false);
    setStoredState('results', null);
  };

  // ModMed EMA FHIR API Functions
  const connectToEMA = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Authenticate with ModMed EMA OAuth2
      const authResponse = await fetch('/api/modmed-ema/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: emaCredentials.clientId,
          clientSecret: emaCredentials.clientSecret,
          baseUrl: emaCredentials.baseUrl,
          environment: emaCredentials.environment
        }),
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const authData = await authResponse.json();
      setEmaToken(authData.access_token);
      setStoredState('ema_token', authData.access_token);
      setUploadProgress(50);

      // Test connection by fetching metadata
      const metadataResponse = await fetch('/api/modmed-ema/metadata', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'EMA-Token': authData.access_token,
        },
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to connect to ModMed EMA system');
      }

      setEmaConnected(true);
      setStoredState('ema_connected', true);
      setUploadProgress(100);

      toast({
        title: "Connected to ModMed EMA",
        description: "Successfully connected to ModMed EMA cloud system.",
      });

    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to ModMed EMA system.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const fetchEMAPatients = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(20);

      const response = await fetch('/api/modmed-ema/patients', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'EMA-Token': emaToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch patients');
      }

      const patientData = await response.json();
      setEmaPatients(patientData.patients || []);
      setStoredState('ema_patients', patientData.patients || []);
      setUploadProgress(100);

      toast({
        title: "Patients Retrieved",
        description: `Found ${patientData.patients?.length || 0} patients in ModMed EMA system.`,
      });

    } catch (error: any) {
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to retrieve patients from ModMed EMA.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const importSelectedPatients = async (selectedIds: string[]) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      const response = await fetch('/api/modmed-ema/import-patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'EMA-Token': emaToken,
        },
        body: JSON.stringify({
          patientIds: selectedIds,
          baseUrl: emaCredentials.baseUrl
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      setUploadResults({
        ...result,
        fileName: 'ModMed EMA Import',
        type: 'ema-patients'
      });
      setStoredState('results', {
        ...result,
        fileName: 'ModMed EMA Import',
        type: 'ema-patients'
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.recordsImported} patients from ModMed EMA.`,
      });

    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import patients from ModMed EMA.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const PatientImportCard = () => (
    <Card className="healthcare-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          EMR Patient Records Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supports HL7 FHIR R4, CCD (C-CDA), and CSV formats. Ensure patient data includes required fields: MRN, demographics, and insurance information.
          </AlertDescription>
        </Alert>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Upload EMR Patient Records</p>
          <p className="text-sm text-gray-500 mb-4">
            Accepted formats: .xml (HL7 FHIR), .xml (CCD), .csv (Max 100MB)
          </p>
          <input
            type="file"
            accept=".xml,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "patients");
            }}
            className="hidden"
            id="patient-upload"
          />
          <label htmlFor="patient-upload">
            <Button asChild variant="outline">
              <span>Select Patient File</span>
            </Button>
          </label>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Supported Patient Data Fields:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Medical Record Number (MRN)</li>
            <li>• Demographics (Name, DOB, Gender, Address)</li>
            <li>• Contact Information (Phone, Email)</li>
            <li>• Insurance Information (Primary/Secondary)</li>
            <li>• Emergency Contact Details</li>
            <li>• Medical History and Allergies</li>
          </ul>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            const link = document.createElement('a');
            link.href = '/templates/patient-import-template.csv';
            link.download = 'patient-import-template.csv';
            link.click();
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV Template
        </Button>
      </CardContent>
    </Card>
  );

  const AuthorizationImportCard = () => (
    <Card className="healthcare-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authorization Data Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supports X12 278 (Authorization Request/Response), HL7 FHIR Coverage, and CSV formats for prior authorization data.
          </AlertDescription>
        </Alert>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Upload Authorization Records</p>
          <p className="text-sm text-gray-500 mb-4">
            Accepted formats: .edi (X12), .xml (HL7 FHIR), .csv (Max 50MB)
          </p>
          <input
            type="file"
            accept=".edi,.xml,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "authorizations");
            }}
            className="hidden"
            id="auth-upload"
          />
          <label htmlFor="auth-upload">
            <Button asChild variant="outline">
              <span>Select Authorization File</span>
            </Button>
          </label>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Supported Authorization Fields:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Authorization ID and Reference Numbers</li>
            <li>• Patient MRN and Demographics</li>
            <li>• Insurance Provider and Policy Information</li>
            <li>• Service/Procedure Codes (CPT, HCPCS)</li>
            <li>• Diagnosis Codes (ICD-10)</li>
            <li>• Authorization Status and Dates</li>
            <li>• Clinical Justification and Notes</li>
          </ul>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            const link = document.createElement('a');
            link.href = '/templates/authorization-import-template.csv';
            link.download = 'authorization-import-template.csv';
            link.click();
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV Template
        </Button>
      </CardContent>
    </Card>
  );

  const UploadProgressCard = () => (
    isUploading && (
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle>Upload Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={uploadProgress} className="mb-2" />
          <p className="text-sm text-gray-600">Uploading and processing file... {uploadProgress}%</p>
        </CardContent>
      </Card>
    )
  );

  const UploadResultsCard = () => (
    uploadResults && (
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Import Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">File Name</p>
              <p className="font-medium">{uploadResults.fileName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Import Type</p>
              <p className="font-medium capitalize">{uploadResults.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Records Processed</p>
              <p className="font-medium">{uploadResults.recordsProcessed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Records Imported</p>
              <p className="font-medium text-green-600">{uploadResults.recordsImported}</p>
            </div>
            {uploadResults.recordsUpdated > 0 && (
              <div>
                <p className="text-sm text-gray-600">Records Updated</p>
                <p className="font-medium text-blue-600">{uploadResults.recordsUpdated}</p>
              </div>
            )}
            {uploadResults.duplicatesSkipped > 0 && (
              <div>
                <p className="text-sm text-gray-600">Duplicates Skipped</p>
                <p className="font-medium text-yellow-600">{uploadResults.duplicatesSkipped}</p>
              </div>
            )}
          </div>

          {uploadResults.duplicates && uploadResults.duplicates.length > 0 && !uploadResults.updateExisting && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>{uploadResults.duplicates.length} duplicate records found with changes. These were skipped to prevent data loss.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const fileInput = document.querySelector(`#${uploadResults.type === 'patients' ? 'patient' : 'auth'}-upload`) as HTMLInputElement;
                    if (fileInput?.files?.[0]) {
                      handleFileUpload(fileInput.files[0], uploadResults.type, true);
                    }
                  }}
                >
                  Re-import and Update Existing Records
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {uploadResults.duplicates && uploadResults.duplicates.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Duplicate Records Found:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResults.duplicates.slice(0, 5).map((dup: any, index: number) => (
                  <div key={index} className="text-sm text-yellow-800 bg-white p-2 rounded border">
                    <p><strong>Row {dup.rowNumber}:</strong> {dup.existing.name} (ID: {dup.existing.patientId})</p>
                    <p className="text-xs">Changes detected in: {Object.entries(dup.changes).filter(([_, changed]) => changed).map(([field, _]) => field).join(', ')}</p>
                  </div>
                ))}
                {uploadResults.duplicates.length > 5 && (
                  <p className="text-sm text-yellow-700">... and {uploadResults.duplicates.length - 5} more duplicates</p>
                )}
              </div>
            </div>
          )}

          {uploadResults.updates && uploadResults.updates.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Records Updated:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResults.updates.slice(0, 5).map((upd: any, index: number) => (
                  <div key={index} className="text-sm text-blue-800 bg-white p-2 rounded border">
                    <p><strong>Row {upd.rowNumber}:</strong> {upd.existing.name} (ID: {upd.existing.patientId})</p>
                    <p className="text-xs">Updated: {Object.entries(upd.changes).filter(([_, changed]) => changed).map(([field, _]) => field).join(', ')}</p>
                  </div>
                ))}
                {uploadResults.updates.length > 5 && (
                  <p className="text-sm text-blue-700">... and {uploadResults.updates.length - 5} more updates</p>
                )}
              </div>
            </div>
          )}

          {uploadResults.errors > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadResults.errors} records had errors and were not imported. 
                <Button variant="link" className="p-0 ml-1">View error log</Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
        <p className="text-gray-600 mt-1">Import patient records and authorization data from external systems</p>
      </div>

      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="patients">Patient Records</TabsTrigger>
          <TabsTrigger value="authorizations">Authorization Data</TabsTrigger>
          <TabsTrigger value="modmed-ema">ModMed EMA Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="patients">
          <ImportTabContent
            uploadResults={uploadResults}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            clearImportState={clearImportState}
            UploadProgressCard={UploadProgressCard}
            UploadResultsCard={UploadResultsCard}
          >
            <PatientImportCard />
          </ImportTabContent>
        </TabsContent>

        <TabsContent value="authorizations" className="space-y-6">
          <AuthorizationImportCard />
          <UploadProgressCard />
          <UploadResultsCard />
        </TabsContent>

        <TabsContent value="modmed-ema">
          <ImportTabContent
            uploadResults={uploadResults}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            clearImportState={clearImportState}
            UploadProgressCard={UploadProgressCard}
            UploadResultsCard={UploadResultsCard}
          >
            <ModMedEMACard />
          </ImportTabContent>
        </TabsContent>
      </Tabs>
    </div>
  );

  // ModMed EMA Integration Card Component
  function ModMedEMACard() {
    const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

    return (
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            ModMed EMA Cloud Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Connect to ModMed EMA cloud-based Electronic Medical Assistant system to import patient records via HL7 FHIR R4 API. Supports OAuth2 authentication and bulk patient data export.
            </AlertDescription>
          </Alert>

          {!emaConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">ModMed EMA Connection Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={emaCredentials.clientId}
                      onChange={(e) => {
                        const newCreds = { ...emaCredentials, clientId: e.target.value };
                        setEmaCredentials(newCreds);
                        setStoredState('ema_credentials', newCreds);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter ModMed Client ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={emaCredentials.clientSecret}
                      onChange={(e) => {
                        const newCreds = { ...emaCredentials, clientSecret: e.target.value };
                        setEmaCredentials(newCreds);
                        setStoredState('ema_credentials', newCreds);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter ModMed Client Secret"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Environment
                    </label>
                    <select
                      value={emaCredentials.environment}
                      onChange={(e) => {
                        const newCreds = { 
                          ...emaCredentials, 
                          environment: e.target.value,
                          baseUrl: e.target.value === 'production' 
                            ? 'https://exscribe-prod-fhir.ema-api.com/fhir/modmed/root/r4'
                            : 'https://exscribe-sandbox-fhir.ema-api.com/fhir/modmed/root/r4'
                        };
                        setEmaCredentials(newCreds);
                        setStoredState('ema_credentials', newCreds);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="production">Production</option>
                      <option value="sandbox">Sandbox</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={emaCredentials.baseUrl}
                      onChange={(e) => {
                        const newCreds = { ...emaCredentials, baseUrl: e.target.value };
                        setEmaCredentials(newCreds);
                        setStoredState('ema_credentials', newCreds);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ModMed FHIR API Base URL"
                    />
                  </div>
                </div>
                <Button 
                  onClick={connectToEMA}
                  disabled={!emaCredentials.clientId || !emaCredentials.clientSecret || isUploading}
                  className="mt-4 w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Connect to ModMed EMA
                </Button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Setup Instructions:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Contact ModMed support at 561.235.7505 to request API credentials</li>
                  <li>• Register your application at portal.api.modmed.com</li>
                  <li>• Obtain OAuth2 Client ID and Client Secret for FHIR API access</li>
                  <li>• Test connection with sandbox environment before production use</li>
                  <li>• Ensure your practice has proper authorization for patient data access</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Connected to ModMed EMA
                </h4>
                <p className="text-sm text-green-800">
                  Successfully connected to {emaCredentials.environment} environment: {emaCredentials.baseUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={fetchEMAPatients} disabled={isUploading}>
                  <Users className="h-4 w-4 mr-2" />
                  Fetch Patient List
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEmaConnected(false);
                    setEmaToken(null);
                    setEmaPatients([]);
                    setStoredState('ema_connected', false);
                    setStoredState('ema_token', null);
                    setStoredState('ema_patients', []);
                  }}
                >
                  Disconnect
                </Button>
              </div>

              {emaPatients.length > 0 && (
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-gray-900">Available Patients ({emaPatients.length})</h4>
                    <p className="text-sm text-gray-600">Select patients to import into MedAuth Pro</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {emaPatients.slice(0, 50).map((patient: any, index: number) => (
                      <div key={patient.id || index} className="p-3 border-b last:border-b-0 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPatients.includes(patient.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatients([...selectedPatients, patient.id]);
                            } else {
                              setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {patient.name?.[0]?.family}, {patient.name?.[0]?.given?.join(' ')} 
                          </p>
                          <p className="text-xs text-gray-600">
                            DOB: {patient.birthDate} | ID: {patient.identifier?.[0]?.value}
                          </p>
                        </div>
                      </div>
                    ))}
                    {emaPatients.length > 50 && (
                      <div className="p-3 text-center text-sm text-gray-600">
                        Showing first 50 patients. {emaPatients.length - 50} more available.
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedPatients.length} patients selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = emaPatients.slice(0, 50).map((p: any) => p.id);
                          setSelectedPatients(allIds);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPatients([])}
                      >
                        Clear All
                      </Button>
                      <Button
                        disabled={selectedPatients.length === 0 || isUploading}
                        onClick={() => importSelectedPatients(selectedPatients)}
                      >
                        Import Selected ({selectedPatients.length})
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ModMed EMA Data Support:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Patient Demographics (Name, DOB, Gender, Address)</li>
              <li>• Medical Record Numbers and Identifiers</li>
              <li>• Insurance Information and Coverage Details</li>
              <li>• Clinical Conditions and Diagnoses (ICD-10)</li>
              <li>• Prescription and Medication History</li>
              <li>• Lab Results and Diagnostic Reports</li>
              <li>• Appointment History and Scheduling Data</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }
}
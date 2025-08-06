import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Settings, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Shield,
  Zap,
  Building2,
  Key,
  Globe,
  Trash2,
  Upload,
  File,
  Download,
  Edit
} from "lucide-react";

interface ExternalConnection {
  id: string;
  name: string;
  type: 'insurance' | 'clearinghouse' | 'edi' | 'api';
  provider: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  description: string;
  baseUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  oauthToken?: string;
  tokenType?: 'Bearer' | 'Basic' | 'API-Key';
  tokenExpiry?: string;
  refreshToken?: string;
  scopes?: string[];
  environment: 'production' | 'sandbox' | 'test';
  capabilities: string[];
  customCapabilities?: string[];
  isActive: boolean;
  lastConnected?: string;
  lastSync?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  configFiles?: {
    name: string;
    type: 'json' | 'yaml';
    content: any;
    uploadedAt: string;
  }[];
  httpMethods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  headers?: { [key: string]: string };
  timeout?: number;
  retryCount?: number;
}

const connectionTypes = [
  { value: 'insurance', label: 'Insurance Provider', icon: Shield },
  { value: 'clearinghouse', label: 'Clearinghouse', icon: Building2 },
  { value: 'edi', label: 'EDI Gateway', icon: Zap },
  { value: 'api', label: 'API Service', icon: Globe },
];

const presetProviders = [
  {
    name: 'Availity',
    type: 'clearinghouse',
    baseUrl: 'https://api.availity.com',
    capabilities: ['prior_auth_lookup', 'eligibility_verification', 'claim_status'],
    description: 'Real-time eligibility, prior authorization, and claim status checking',
  },
  {
    name: 'Change Healthcare',
    type: 'clearinghouse', 
    baseUrl: 'https://api.changehealthcare.com',
    capabilities: ['prior_auth_lookup', 'eligibility_verification', 'claim_submission'],
    description: 'Comprehensive healthcare data exchange and revenue cycle management',
  },
  {
    name: 'Relay Health',
    type: 'clearinghouse',
    baseUrl: 'https://api.relayhealth.com',
    capabilities: ['prior_auth_lookup', 'patient_scheduling', 'clinical_messaging'],
    description: 'Clinical and administrative connectivity solutions',
  },
  {
    name: 'Aetna Provider API',
    type: 'insurance',
    baseUrl: 'https://api.aetna.com',
    capabilities: ['prior_auth_status', 'member_eligibility', 'benefit_verification'],
    description: 'Direct integration with Aetna insurance systems',
  },
  {
    name: 'Anthem Provider Portal',
    type: 'insurance',
    baseUrl: 'https://api.anthem.com',
    capabilities: ['prior_auth_lookup', 'claim_status', 'provider_directory'],
    description: 'Access to Anthem provider services and member information',
  },
];

export default function ExternalConnections() {
  const [selectedConnection, setSelectedConnection] = useState<ExternalConnection | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfigureDialogOpen, setIsConfigureDialogOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<ExternalConnection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<ExternalConnection | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [newCapability, setNewCapability] = useState('');
  const [newConnection, setNewConnection] = useState({
    name: '',
    type: 'insurance' as const,
    provider: '',
    baseUrl: '',
    environment: 'sandbox' as const,
    description: '',
    clientId: '',
    clientSecret: '',
    apiKey: '',
    oauthToken: '',
    tokenType: 'Bearer' as const,
    tokenExpiry: '',
    refreshToken: '',
    scopes: [] as string[],
    capabilities: [] as string[],
    customCapabilities: [] as string[],
    httpMethods: ['GET', 'POST'] as ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[],
    headers: {} as { [key: string]: string },
    timeout: 30000,
    retryCount: 3,
    configFiles: [] as any[],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data - in production this would come from API
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['/api/external-connections'],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          id: '1',
          name: 'Availity Production',
          type: 'clearinghouse',
          provider: 'Availity',
          status: 'connected',
          description: 'Real-time eligibility and prior authorization lookup',
          baseUrl: 'https://api.availity.com',
          environment: 'production',
          capabilities: ['prior_auth_lookup', 'eligibility_verification'],
          isActive: true,
          lastConnected: '2025-07-30T10:15:00Z',
          lastSync: '2025-07-30T15:30:00Z',
          createdAt: '2025-07-25T09:00:00Z',
          updatedAt: '2025-07-30T15:30:00Z',
        },
        {
          id: '2', 
          name: 'Aetna Provider API',
          type: 'insurance',
          provider: 'Aetna',
          status: 'disconnected',
          description: 'Direct integration with Aetna insurance systems',
          baseUrl: 'https://api.aetna.com',
          environment: 'sandbox',
          capabilities: ['prior_auth_status', 'member_eligibility'],
          isActive: false,
          lastConnected: '2025-07-28T14:22:00Z',
          errorMessage: 'API key expired',
          createdAt: '2025-07-20T11:30:00Z',
          updatedAt: '2025-07-28T14:22:00Z',
        }
      ] as ExternalConnection[];
    },
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (connectionData: typeof newConnection) => {
      // In production, this would create the connection via API
      return { id: Math.random().toString(), ...connectionData, status: 'testing' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/external-connections'] });
      setIsCreateDialogOpen(false);
      setNewConnection({
        name: '',
        type: 'insurance',
        provider: '',
        baseUrl: '',
        environment: 'sandbox',
        description: '',
        clientId: '',
        clientSecret: '',
        apiKey: '',
        capabilities: [],
      });
      toast({
        title: "Connection Created",
        description: "External connection has been created successfully.",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) throw new Error('Connection not found');
      
      // Simulate testing the connection with some realistic validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Basic validation checks
      if (!connection.baseUrl) throw new Error('Base URL is required');
      if (!connection.clientId && !connection.apiKey) throw new Error('Authentication credentials are required');
      
      // Simulate different outcomes based on connection status
      if (connection.status === 'error') {
        throw new Error(connection.errorMessage || 'Connection failed');
      }
      
      return { success: true, message: 'Connection test successful' };
    },
    onSuccess: (_, connectionId) => {
      // Update the connection status to 'connected'
      queryClient.setQueryData(['/api/external-connections'], (oldData: ExternalConnection[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'connected' as const, lastConnected: new Date().toISOString(), errorMessage: undefined }
            : conn
        );
      });
      
      toast({
        title: "Connection Test Successful",
        description: "The external connection is working properly.",
      });
    },
    onError: (error, connectionId) => {
      // Update the connection status to 'error'
      queryClient.setQueryData(['/api/external-connections'], (oldData: ExternalConnection[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'error' as const, errorMessage: error.message }
            : conn
        );
      });
      
      toast({
        title: "Connection Test Failed",
        description: error.message || "Unable to connect to the external service.",
        variant: "destructive",
      });
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async (connectionData: Partial<ExternalConnection>) => {
      // In production, this would update the connection via API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log the update in audit trail
      await fetch('/api/audit/external-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'UPDATE_EXTERNAL_CONNECTION',
          connectionId: connectionData.id,
          changes: connectionData,
        }),
      });
      
      return connectionData;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['/api/external-connections'], (oldData: ExternalConnection[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(conn => 
          conn.id === updatedData.id 
            ? { ...conn, ...updatedData, updatedAt: new Date().toISOString() }
            : conn
        );
      });
      
      setIsConfigureDialogOpen(false);
      setConnectionToEdit(null);
      setUploadedFiles([]);
      toast({
        title: "Connection Updated",
        description: "Connection settings have been saved successfully.",
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      // In production, this would delete the connection via API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log the deletion in audit trail
      await fetch('/api/audit/external-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action: 'DELETE_EXTERNAL_CONNECTION',
          connectionId,
        }),
      });
      
      return connectionId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['/api/external-connections'], (oldData: ExternalConnection[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(conn => conn.id !== deletedId);
      });
      
      setIsDeleteDialogOpen(false);
      setConnectionToDelete(null);
      toast({
        title: "Connection Deleted",
        description: "External connection has been permanently removed.",
      });
    },
  });

  const handleCreateConnection = () => {
    createConnectionMutation.mutate(newConnection);
  };

  const handlePresetSelection = (preset: typeof presetProviders[0]) => {
    setNewConnection({
      ...newConnection,
      name: `${preset.name} ${newConnection.environment}`,
      provider: preset.name,
      type: preset.type as any,
      baseUrl: preset.baseUrl,
      description: preset.description,
      capabilities: preset.capabilities,
    });
  };

  const handleConfigureConnection = (connection: ExternalConnection) => {
    setConnectionToEdit(connection);
    setIsConfigureDialogOpen(true);
  };

  const handleUpdateConnection = () => {
    if (!connectionToEdit) return;
    updateConnectionMutation.mutate(connectionToEdit);
  };

  const handleViewDocs = (connection: ExternalConnection) => {
    // Open documentation in new tab based on provider
    const docUrls: Record<string, string> = {
      'Availity': 'https://developer.availity.com/partner/documentation',
      'Change Healthcare': 'https://developers.changehealthcare.com/eligibilityandbenefits',
      'Relay Health': 'https://www.relayhealth.com/developer',
      'Aetna': 'https://developer.aetna.com',
      'Anthem': 'https://developer.anthem.com',
    };
    
    const docUrl = docUrls[connection.provider] || connection.baseUrl;
    window.open(docUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteConnection = (connection: ExternalConnection) => {
    setConnectionToDelete(connection);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteConnection = () => {
    if (connectionToDelete) {
      deleteConnectionMutation.mutate(connectionToDelete.id);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => 
      file.type === 'application/json' || 
      file.type === 'application/x-yaml' || 
      file.type === 'text/yaml' ||
      file.name.endsWith('.yaml') || 
      file.name.endsWith('.yml') || 
      file.name.endsWith('.json')
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only JSON or YAML files.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // Process files and extract API configuration
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const config = file.type.includes('json') ? JSON.parse(content) : content;
          
          if (connectionToEdit) {
            // Auto-configure from API spec
            const updatedConnection = { ...connectionToEdit };
            
            if (config.swagger || config.openapi) {
              // OpenAPI/Swagger spec
              updatedConnection.baseUrl = config.host ? `https://${config.host}${config.basePath || ''}` : updatedConnection.baseUrl;
              
              if (config.paths) {
                const methods = new Set<string>();
                Object.values(config.paths).forEach((pathObj: any) => {
                  Object.keys(pathObj).forEach(method => {
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                      methods.add(method.toUpperCase());
                    }
                  });
                });
                updatedConnection.httpMethods = Array.from(methods) as any;
              }
              
              if (config.securityDefinitions?.oauth2) {
                updatedConnection.tokenType = 'Bearer';
                if (config.securityDefinitions.oauth2.scopes) {
                  updatedConnection.scopes = Object.keys(config.securityDefinitions.oauth2.scopes);
                }
              }
            }
            
            // Add file to connection config
            updatedConnection.configFiles = updatedConnection.configFiles || [];
            updatedConnection.configFiles.push({
              name: file.name,
              type: file.type.includes('json') ? 'json' : 'yaml',
              content: config,
              uploadedAt: new Date().toISOString(),
            });
            
            setConnectionToEdit(updatedConnection);
          }
        } catch (error) {
          toast({
            title: "File Processing Error",
            description: `Failed to process ${file.name}: ${error}`,
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    });
  };

  const addCustomCapability = () => {
    if (newCapability.trim() && connectionToEdit) {
      const updated = { ...connectionToEdit };
      updated.customCapabilities = updated.customCapabilities || [];
      if (!updated.customCapabilities.includes(newCapability.trim())) {
        updated.customCapabilities.push(newCapability.trim());
        setConnectionToEdit(updated);
        setNewCapability('');
      }
    }
  };

  const removeCustomCapability = (capability: string) => {
    if (connectionToEdit) {
      const updated = { ...connectionToEdit };
      updated.customCapabilities = updated.customCapabilities?.filter(c => c !== capability) || [];
      setConnectionToEdit(updated);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />;
      case 'disconnected': return <XCircle className="h-4 w-4" />;
      case 'testing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">External Connections</h1>
          <p className="text-muted-foreground mt-2">
            Manage connections to insurance providers, clearinghouses, and other healthcare systems
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create External Connection</DialogTitle>
              <DialogDescription>
                Set up a new connection to an external healthcare system for prior authorization lookups and other services.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="preset" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preset">Choose Preset</TabsTrigger>
                <TabsTrigger value="custom">Custom Configuration</TabsTrigger>
              </TabsList>

              <TabsContent value="preset" className="space-y-4">
                <div className="grid gap-4">
                  <Label>Select a preset provider configuration:</Label>
                  <div className="grid gap-3">
                    {presetProviders.map((preset, index) => (
                      <Card 
                        key={index} 
                        className="cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => handlePresetSelection(preset)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                {(() => {
                                  const IconComponent = connectionTypes.find(t => t.value === preset.type)?.icon;
                                  return IconComponent ? <IconComponent className="h-5 w-5 text-blue-600" /> : null;
                                })()}
                              </div>
                              <div>
                                <h4 className="font-semibold">{preset.name}</h4>
                                <p className="text-sm text-muted-foreground">{preset.description}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {preset.capabilities.map((capability) => (
                                    <Badge key={capability} variant="secondary" className="text-xs">
                                      {capability.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {connectionTypes.find(t => t.value === preset.type)?.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Connection Name</Label>
                      <Input
                        id="name"
                        value={newConnection.name}
                        onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                        placeholder="e.g., Availity Production"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Connection Type</Label>
                      <Select value={newConnection.type} onValueChange={(value: any) => setNewConnection({ ...newConnection, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {connectionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="provider">Provider</Label>
                      <Input
                        id="provider"
                        value={newConnection.provider}
                        onChange={(e) => setNewConnection({ ...newConnection, provider: e.target.value })}
                        placeholder="e.g., Availity, Aetna"
                      />
                    </div>
                    <div>
                      <Label htmlFor="environment">Environment</Label>
                      <Select value={newConnection.environment} onValueChange={(value: any) => setNewConnection({ ...newConnection, environment: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="baseUrl">Base URL</Label>
                    <Input
                      id="baseUrl"
                      value={newConnection.baseUrl}
                      onChange={(e) => setNewConnection({ ...newConnection, baseUrl: e.target.value })}
                      placeholder="https://api.example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newConnection.description}
                      onChange={(e) => setNewConnection({ ...newConnection, description: e.target.value })}
                      placeholder="Describe what this connection is used for..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Authentication</Label>
                <div className="grid gap-4 mt-2">
                  <div>
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      type="password"
                      value={newConnection.clientId}
                      onChange={(e) => setNewConnection({ ...newConnection, clientId: e.target.value })}
                      placeholder="Enter client ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={newConnection.clientSecret}
                      onChange={(e) => setNewConnection({ ...newConnection, clientSecret: e.target.value })}
                      placeholder="Enter client secret"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKey">API Key (if required)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={newConnection.apiKey}
                      onChange={(e) => setNewConnection({ ...newConnection, apiKey: e.target.value })}
                      placeholder="Enter API key"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateConnection}
                  disabled={!newConnection.name || !newConnection.baseUrl || createConnectionMutation.isPending}
                >
                  {createConnectionMutation.isPending ? 'Creating...' : 'Create Connection'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Configure Connection Dialog */}
        <Dialog open={isConfigureDialogOpen} onOpenChange={setIsConfigureDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Connection</DialogTitle>
              <DialogDescription>
                Update the settings for {connectionToEdit?.name}
              </DialogDescription>
            </DialogHeader>

            {connectionToEdit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Connection Name</Label>
                    <Input
                      id="edit-name"
                      value={connectionToEdit.name}
                      onChange={(e) => setConnectionToEdit({ ...connectionToEdit, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-environment">Environment</Label>
                    <Select 
                      value={connectionToEdit.environment} 
                      onValueChange={(value: any) => setConnectionToEdit({ ...connectionToEdit, environment: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-baseUrl">Base URL</Label>
                  <Input
                    id="edit-baseUrl"
                    value={connectionToEdit.baseUrl}
                    onChange={(e) => setConnectionToEdit({ ...connectionToEdit, baseUrl: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={connectionToEdit.description}
                    onChange={(e) => setConnectionToEdit({ ...connectionToEdit, description: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">API Configuration Files</Label>
                  <div className="mt-2 space-y-4">
                    <div>
                      <Label htmlFor="config-upload">Upload API Specification (.json/.yaml)</Label>
                      <Input
                        id="config-upload"
                        type="file"
                        multiple
                        accept=".json,.yaml,.yml"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Upload OpenAPI/Swagger specifications to auto-configure connection settings
                      </p>
                    </div>
                    
                    {connectionToEdit.configFiles && connectionToEdit.configFiles.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Uploaded Configuration Files</Label>
                        <div className="mt-2 space-y-2">
                          {connectionToEdit.configFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <File className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <Badge variant="outline">{file.type.toUpperCase()}</Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = { ...connectionToEdit };
                                  updated.configFiles = updated.configFiles?.filter((_, i) => i !== index);
                                  setConnectionToEdit(updated);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Authentication</Label>
                  <div className="grid gap-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-clientId">Client ID</Label>
                        <Input
                          id="edit-clientId"
                          type="password"
                          value={connectionToEdit.clientId || ''}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, clientId: e.target.value })}
                          placeholder="Enter client ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-clientSecret">Client Secret</Label>
                        <Input
                          id="edit-clientSecret"
                          type="password"
                          value={connectionToEdit.clientSecret || ''}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, clientSecret: e.target.value })}
                          placeholder="Enter client secret"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-apiKey">API Key (if required)</Label>
                      <Input
                        id="edit-apiKey"
                        type="password"
                        value={connectionToEdit.apiKey || ''}
                        onChange={(e) => setConnectionToEdit({ ...connectionToEdit, apiKey: e.target.value })}
                        placeholder="Enter API key"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-oauthToken">OAuth2 Token</Label>
                        <Input
                          id="edit-oauthToken"
                          type="password"
                          value={connectionToEdit.oauthToken || ''}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, oauthToken: e.target.value })}
                          placeholder="Enter OAuth2 token"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-tokenType">Token Type</Label>
                        <Select 
                          value={connectionToEdit.tokenType || 'Bearer'} 
                          onValueChange={(value: any) => setConnectionToEdit({ ...connectionToEdit, tokenType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bearer">Bearer</SelectItem>
                            <SelectItem value="Basic">Basic</SelectItem>
                            <SelectItem value="API-Key">API-Key</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-refreshToken">Refresh Token</Label>
                        <Input
                          id="edit-refreshToken"
                          type="password"
                          value={connectionToEdit.refreshToken || ''}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, refreshToken: e.target.value })}
                          placeholder="Enter refresh token"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-tokenExpiry">Token Expiry</Label>
                        <Input
                          id="edit-tokenExpiry"
                          type="datetime-local"
                          value={connectionToEdit.tokenExpiry || ''}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, tokenExpiry: e.target.value })}
                        />
                      </div>
                    </div>

                    {connectionToEdit.scopes && connectionToEdit.scopes.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">OAuth2 Scopes</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {connectionToEdit.scopes.map((scope, index) => (
                            <Badge key={index} variant="secondary">{scope}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">API Configuration</Label>
                  <div className="grid gap-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-timeout">Timeout (ms)</Label>
                        <Input
                          id="edit-timeout"
                          type="number"
                          value={connectionToEdit.timeout || 30000}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, timeout: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-retryCount">Retry Count</Label>
                        <Input
                          id="edit-retryCount"
                          type="number"
                          value={connectionToEdit.retryCount || 3}
                          onChange={(e) => setConnectionToEdit({ ...connectionToEdit, retryCount: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Supported HTTP Methods</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => (
                          <label key={method} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={connectionToEdit.httpMethods?.includes(method as any) || false}
                              onChange={(e) => {
                                const updated = { ...connectionToEdit };
                                updated.httpMethods = updated.httpMethods || [];
                                if (e.target.checked) {
                                  if (!updated.httpMethods.includes(method as any)) {
                                    updated.httpMethods.push(method as any);
                                  }
                                } else {
                                  updated.httpMethods = updated.httpMethods.filter(m => m !== method);
                                }
                                setConnectionToEdit(updated);
                              }}
                            />
                            <span className="text-sm">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Connection Capabilities</Label>
                  <div className="mt-2 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Standard Capabilities</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {connectionToEdit.capabilities.map((capability, index) => (
                          <Badge key={index} variant="default">{capability}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Custom Capabilities</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          value={newCapability}
                          onChange={(e) => setNewCapability(e.target.value)}
                          placeholder="Enter custom capability label"
                          onKeyPress={(e) => e.key === 'Enter' && addCustomCapability()}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomCapability}
                        >
                          Add
                        </Button>
                      </div>
                      {connectionToEdit.customCapabilities && connectionToEdit.customCapabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {connectionToEdit.customCapabilities.map((capability, index) => (
                            <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeCustomCapability(capability)}>
                              {capability} <Trash2 className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-active"
                      checked={connectionToEdit.isActive}
                      onCheckedChange={(checked) => setConnectionToEdit({ ...connectionToEdit, isActive: checked })}
                    />
                    <Label htmlFor="edit-active">Active Connection</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsConfigureDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateConnection}
                    disabled={!connectionToEdit.name || !connectionToEdit.baseUrl || updateConnectionMutation.isPending}
                  >
                    {updateConnectionMutation.isPending ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Connection Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Connection</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the connection "{connectionToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDeleteConnection}
                disabled={deleteConnectionMutation.isPending}
              >
                {deleteConnectionMutation.isPending ? 'Deleting...' : 'Delete Connection'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connection Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {connections.filter(c => c.status === 'connected').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {connections.filter(c => c.status !== 'connected').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.find(c => c.lastSync) ? '2 min' : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No external connections configured yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first connection to start pulling prior authorization codes from external systems.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <Card key={connection.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          {(() => {
                            const IconComponent = connectionTypes.find(t => t.value === connection.type)?.icon;
                            return IconComponent ? <IconComponent className="h-6 w-6 text-blue-600" /> : null;
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{connection.name}</h3>
                            <Badge className={getStatusColor(connection.status)}>
                              {getStatusIcon(connection.status)}
                              <span className="ml-1 capitalize">{connection.status}</span>
                            </Badge>
                            <Badge variant="outline">{connection.environment}</Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{connection.description}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {connection.capabilities.map((capability) => (
                              <Badge key={capability} variant="secondary" className="text-xs">
                                {capability.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Provider: {connection.provider}</div>
                            <div>Base URL: {connection.baseUrl}</div>
                            {connection.lastConnected && (
                              <div>Last Connected: {new Date(connection.lastConnected).toLocaleString()}</div>
                            )}
                            {connection.errorMessage && (
                              <div className="text-red-600">Error: {connection.errorMessage}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(connection.id)}
                          disabled={testConnectionMutation.isPending}
                        >
                          {testConnectionMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Test
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConfigureConnection(connection)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDocs(connection)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Docs
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteConnection(connection)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
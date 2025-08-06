import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Clock, FileText, Search, AlertTriangle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  PriorAuthorization,
  Patient, 
  ProcedureCode,
  PriorAuthWorkflowStep 
} from "@/../../shared/schema";

// Workflow step schema
const workflowStepSchema = z.object({
  treatmentType: z.string().optional(),
  cptCode: z.string().optional(),
  icd10Code: z.string().optional(),
  clinicalJustification: z.string().optional(),
  patientId: z.number().optional(),
  insuranceId: z.number().optional(),
  clinicalEvidence: z.string().optional(),
  previousTreatments: z.string().optional(),
  providerNotes: z.string().optional(),
  urgentRequest: z.boolean().optional(),
  notes: z.string().optional(),
});

type WorkflowStepData = z.infer<typeof workflowStepSchema>;

export default function PriorAuthorizationWorkflow() {
  const [selectedAuthId, setSelectedAuthId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [procedureSearchQuery, setProcedureSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WorkflowStepData>({
    resolver: zodResolver(workflowStepSchema),
    defaultValues: {
      urgentRequest: false,
    },
  });

  // Fetch prior authorizations
  const { data: authorizations = [], isLoading: authLoading } = useQuery<PriorAuthorization[]>({
    queryKey: ['/api/authorizations'],
  });

  // Fetch patients for selection
  const { data: patientsData } = useQuery<{patients: Patient[], totalCount: number}>({
    queryKey: ['/api/patients'],
  });
  const patients = patientsData?.patients || [];

  // Fetch procedure codes
  const { data: procedureCodes = [] } = useQuery<ProcedureCode[]>({
    queryKey: ['/api/procedure-codes', procedureSearchQuery],
    enabled: procedureSearchQuery.length > 2,
  });

  // Fetch workflow steps for selected authorization
  const { data: workflowSteps = [] } = useQuery<PriorAuthWorkflowStep[]>({
    queryKey: ['/api/prior-auth-workflow-steps', selectedAuthId],
    enabled: !!selectedAuthId,
  });

  // Fetch current step details
  const { data: currentStepData } = useQuery<PriorAuthWorkflowStep>({
    queryKey: ['/api/prior-auth-current-step', selectedAuthId],
    enabled: !!selectedAuthId,
  });

  // Create new prior authorization mutation
  const createAuthMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/authorizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create authorization');
      return response.json();
    },
    onSuccess: (newAuth: PriorAuthorization) => {
      queryClient.invalidateQueries({ queryKey: ['/api/authorizations'] });
      setSelectedAuthId(newAuth.id);
      toast({
        title: "Prior Authorization Created",
        description: "New authorization request has been created and workflow initialized.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create prior authorization request.",
        variant: "destructive",
      });
    },
  });

  // Complete workflow step mutation
  const completeStepMutation = useMutation({
    mutationFn: async ({ authId, stepNumber, formData, notes }: {
      authId: number;
      stepNumber: number;
      formData: WorkflowStepData;
      notes?: string;
    }) => {
      const response = await fetch(`/api/prior-auth-workflow-steps/${authId}/${stepNumber}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ formData, notes }),
      });
      if (!response.ok) throw new Error('Failed to complete step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prior-auth-workflow-steps', selectedAuthId] });
      queryClient.invalidateQueries({ queryKey: ['/api/prior-auth-current-step', selectedAuthId] });
      setCurrentStep(prev => prev + 1);
      form.reset();
      toast({
        title: "Step Completed",
        description: "Workflow step has been completed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete workflow step.",
        variant: "destructive",
      });
    },
  });

  // Generate form package mutation
  const generateFormsMutation = useMutation({
    mutationFn: async ({ authId, state }: { authId: number; state: string }) => {
      const response = await fetch(`/api/prior-auth-generate-forms/${authId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) throw new Error('Failed to generate forms');
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Forms Generated",
        description: "State-specific form package has been generated and is ready for submission.",
      });
    },
  });

  const onSubmitStep = (data: WorkflowStepData) => {
    if (!selectedAuthId || !currentStepData) return;

    completeStepMutation.mutate({
      authId: selectedAuthId,
      stepNumber: currentStepData.stepNumber,
      formData: data,
      notes: data.notes,
    });
  };

  const handleCreateNewAuth = () => {
    const formData = form.getValues();
    
    if (!formData.patientId || !formData.treatmentType || !formData.cptCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in patient, treatment type, and CPT code.",
        variant: "destructive",
      });
      return;
    }

    createAuthMutation.mutate({
      patientId: formData.patientId,
      treatmentType: formData.treatmentType,
      cptCode: formData.cptCode,
      icd10Code: formData.icd10Code || "",
      clinicalJustification: formData.clinicalJustification || "",
      urgentRequest: formData.urgentRequest || false,
      requestedDate: new Date(),
      insuranceId: 1, // Default to first insurance provider for testing
    });
  };

  const getStepIcon = (step: any) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const calculateProgress = () => {
    if (!workflowSteps.length) return 0;
    const completedSteps = workflowSteps.filter((step: any) => step.status === 'completed').length;
    return (completedSteps / workflowSteps.length) * 100;
  };

  if (authLoading) {
    return <div className="p-6">Loading prior authorizations...</div>;
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Prior Authorization Workflow</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">Streamlined 10-step process for Medicaid prior authorization requests</p>
        </div>
        <Button 
          onClick={handleCreateNewAuth} 
          disabled={createAuthMutation.isPending}
          className="w-full sm:w-auto touch-target"
        >
          {createAuthMutation.isPending ? "Creating..." : "New Authorization"}
        </Button>
      </div>

      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflow" className="text-xs sm:text-sm">Active Workflow</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">All Authorizations</TabsTrigger>
          <TabsTrigger value="procedure-lookup" className="text-xs sm:text-sm">Procedure Lookup</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          {selectedAuthId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Workflow Progress */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Workflow Progress</CardTitle>
                  <CardDescription>
                    Complete each step to progress through the prior authorization process
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{Math.round(calculateProgress())}%</span>
                    </div>
                    <Progress value={calculateProgress()} className="w-full" />
                  </div>
                  
                  <div className="space-y-2">
                    {workflowSteps.map((step: any) => (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                          step.status === 'in_progress' ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => setCurrentStep(step.stepNumber)}
                      >
                        {getStepIcon(step)}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{step.stepName}</div>
                          <div className="text-xs text-gray-500">Step {step.stepNumber}</div>
                        </div>
                        <Badge variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {step.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Current Step Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {currentStepData ? `Step ${currentStepData.stepNumber}: ${currentStepData.stepName}` : 'Select a Step'}
                  </CardTitle>
                  <CardDescription>
                    {currentStepData?.notes || 'Complete the required information for this step'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentStepData && (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitStep)} className="space-y-4">
                        {/* Dynamic form fields based on current step */}
                        {currentStep === 1 && (
                          <>
                            <FormField
                              control={form.control}
                              name="patientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Patient</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select patient" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {patients?.map((patient: any) => (
                                        <SelectItem key={patient.id} value={patient.id.toString()}>
                                          {patient.firstName} {patient.lastName} - {patient.patientId}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="treatmentType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Treatment Type</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., MRI, Surgery, Medication" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="cptCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CPT Code</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 70551" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {currentStep === 3 && (
                          <>
                            <FormField
                              control={form.control}
                              name="clinicalEvidence"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Clinical Evidence</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Lab results, imaging findings, etc."
                                      className="min-h-[100px]"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="previousTreatments"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Previous Treatments (Step Therapy)</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Document previous treatments tried and outcomes"
                                      className="min-h-[100px]"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Step Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional notes for this step"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => generateFormsMutation.mutate({ authId: selectedAuthId, state: 'MA' })}
                            disabled={generateFormsMutation.isPending}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {generateFormsMutation.isPending ? "Generating..." : "Generate Forms"}
                          </Button>
                          
                          <Button 
                            type="submit" 
                            disabled={completeStepMutation.isPending}
                          >
                            {completeStepMutation.isPending ? "Completing..." : "Complete Step"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Workflow</h3>
                <p className="text-gray-600 mb-4">
                  Create a new prior authorization request to begin the workflow process.
                </p>
                <Button onClick={handleCreateNewAuth}>
                  Create New Authorization
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizations.map((auth: any) => (
              <Card 
                key={auth.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAuthId === auth.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedAuthId(auth.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{auth.treatmentType}</CardTitle>
                  <CardDescription>
                    {auth.authorizationId} • CPT: {auth.cptCode}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant={
                        auth.status === 'approved' ? 'default' :
                        auth.status === 'denied' ? 'destructive' : 'secondary'
                      }>
                        {auth.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Step:</span>
                      <span>{auth.currentStep || 1} of {auth.totalSteps || 10}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Requested: {new Date(auth.requestedDate).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="procedure-lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Procedure Code Lookup</CardTitle>
              <CardDescription>
                Search CPT codes to check prior authorization requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search CPT codes or descriptions..."
                    value={procedureSearchQuery}
                    onChange={(e) => setProcedureSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {procedureCodes.length > 0 && (
                <div className="space-y-2">
                  {procedureCodes.map((code: any) => (
                    <div key={code.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{code.cptCode}</div>
                        <div className="text-sm text-gray-600">{code.description}</div>
                        <div className="text-xs text-gray-500">{code.category}</div>
                      </div>
                      <Badge variant={code.requiresPriorAuth ? 'destructive' : 'secondary'}>
                        {code.requiresPriorAuth ? 'Prior Auth Required' : 'No Prior Auth'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
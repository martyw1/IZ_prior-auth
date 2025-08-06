import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, Check, ChevronsUpDown } from "lucide-react";
import { getCPTDescription, getTreatmentTypeFromCPT } from "@shared/cpt-codes-data";

const authorizationSchema = z.object({
  patientId: z.number().min(1, "Patient is required"),
  insuranceId: z.number().min(1, "Insurance is required"),
  treatmentType: z.string().min(1, "Treatment type is required"),
  cptCodes: z.array(z.string()).min(1, "At least one CPT code is required"),
  icd10Codes: z.array(z.string()).min(1, "At least one ICD-10 code is required"),
  requestedDate: z.string().min(1, "Requested date is required"),
  clinicalJustification: z.string().min(10, "Clinical justification is required (minimum 10 characters)"),
});

type AuthorizationFormData = z.infer<typeof authorizationSchema>;

interface AuthorizationModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  editData?: any;
  mode?: 'create' | 'edit';
}

export default function AuthorizationModal({
  trigger,
  onSuccess,
  isOpen,
  onOpenChange,
  editData,
  mode = 'create',
}: AuthorizationModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedCptCodes, setSelectedCptCodes] = useState<string[]>(editData?.cptCodes || []);
  const [selectedIcd10Codes, setSelectedIcd10Codes] = useState<string[]>(editData?.icd10Codes || []);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: editData ? {
      patientId: editData.patientId,
      insuranceId: editData.insuranceId,
      treatmentType: editData.treatmentType,
      cptCodes: editData.cptCodes || [],
      icd10Codes: editData.icd10Codes || [],
      requestedDate: editData.requestedDate?.split('T')[0] || "",
      clinicalJustification: editData.clinicalJustification || "",
    } : {
      patientId: 0,
      insuranceId: 0,
      treatmentType: "",
      cptCodes: [],
      icd10Codes: [],
      requestedDate: "",
      clinicalJustification: "",
    },
  });

  const { data: procedureCodes } = useQuery({
    queryKey: ["/api/procedure-codes"],
    queryFn: async () => {
      const response = await fetch("/api/procedure-codes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch procedure codes");
      return response.json();
    },
  });

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

  const { data: insuranceProviders } = useQuery({
    queryKey: ["/api/insurance/providers"],
    queryFn: async () => {
      const response = await fetch("/api/insurance/providers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch insurance providers");
      return response.json();
    },
  });

  const { data: icd10Codes } = useQuery({
    queryKey: ["/api/icd10-codes"],
    queryFn: async () => {
      const response = await fetch("/api/icd10-codes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch ICD-10 codes");
      return response.json();
    },
  });

  // Query for patient insurance information
  const selectedPatientId = form.watch("patientId");
  const { data: patientInsurance } = useQuery({
    queryKey: ["/api/patients", selectedPatientId, "insurance"],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const response = await fetch(`/api/patients/${selectedPatientId}/insurance`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPatientId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AuthorizationFormData) => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const url = mode === 'edit' ? `/api/authorizations/${editData.id}` : "/api/authorizations";
      const method = mode === 'edit' ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${mode} authorization`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `Prior authorization request ${mode === 'edit' ? 'updated' : 'submitted'} successfully`,
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${mode} authorization request`,
        variant: "destructive",
      });
    },
  });

  const handleCptCodeAdd = (cptCode: string) => {
    if (!selectedCptCodes.includes(cptCode)) {
      const newCodes = [...selectedCptCodes, cptCode];
      setSelectedCptCodes(newCodes);
      form.setValue("cptCodes", newCodes);
      
      // Automatically set treatment type based on first CPT code
      if (newCodes.length === 1) {
        const treatmentType = getTreatmentTypeFromCPT(cptCode);
        if (treatmentType) {
          form.setValue("treatmentType", treatmentType);
        }
      }
    }
  };

  const handleCptCodeRemove = (cptCode: string) => {
    const newCodes = selectedCptCodes.filter(code => code !== cptCode);
    setSelectedCptCodes(newCodes);
    form.setValue("cptCodes", newCodes);
  };

  const handleIcd10CodeAdd = (icd10Code: string) => {
    if (!selectedIcd10Codes.includes(icd10Code)) {
      const newCodes = [...selectedIcd10Codes, icd10Code];
      setSelectedIcd10Codes(newCodes);
      form.setValue("icd10Codes", newCodes);
    }
  };

  const handleIcd10CodeRemove = (icd10Code: string) => {
    const newCodes = selectedIcd10Codes.filter(code => code !== icd10Code);
    setSelectedIcd10Codes(newCodes);
    form.setValue("icd10Codes", newCodes);
  };

  const onSubmit = (data: AuthorizationFormData) => {
    createMutation.mutate(data);
  };

  const treatmentTypes = [
    { value: "MRI", label: "MRI Brain w/ Contrast" },
    { value: "CT", label: "CT Scan" },
    { value: "Physical Therapy", label: "Physical Therapy" },
    { value: "Specialty Medication", label: "Specialty Medication" },
    { value: "Surgery", label: "Surgery" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Prior Authorization Request' : 'New Prior Authorization Request'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => {
                      const selectedPatient = patients?.find((p: any) => p.id === field.value);
                      const filteredPatients = patients?.filter((patient: any) =>
                        `${patient.firstName} ${patient.lastName}`
                          .toLowerCase()
                          .includes(patientSearch.toLowerCase())
                      ) || [];

                      return (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={patientSearchOpen}
                                  className="w-full justify-between h-10"
                                >
                                  {selectedPatient
                                    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                                    : "Search and select patient..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Search patients..."
                                  value={patientSearch}
                                  onValueChange={setPatientSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>No patients found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredPatients.slice(0, 50).map((patient: any) => (
                                      <CommandItem
                                        key={patient.id}
                                        value={`${patient.firstName} ${patient.lastName}`}
                                        onSelect={() => {
                                          field.onChange(patient.id);
                                          setPatientSearchOpen(false);
                                          setPatientSearch("");
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            field.value === patient.id ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {patient.firstName} {patient.lastName}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  
                  <FormField
                    control={form.control}
                    name="insuranceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Provider</FormLabel>
                        {patientInsurance && patientInsurance.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">Patient's Insurance Options:</p>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select patient's insurance" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {patientInsurance.map((insurance: any) => (
                                  <SelectItem key={insurance.id} value={insurance.id.toString()}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{insurance.provider?.name || 'Unknown Provider'}</span>
                                      <span className="text-xs text-gray-500">
                                        Member ID: {insurance.memberId} 
                                        {insurance.isPrimary && ' (Primary)'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : selectedPatientId ? (
                          <div className="space-y-2">
                            <p className="text-sm text-amber-600">No insurance found for this patient.</p>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select any insurance provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {insuranceProviders?.map((provider: any) => (
                                  <SelectItem key={provider.id} value={provider.id.toString()}>
                                    {provider.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select patient first" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {insuranceProviders?.map((provider: any) => (
                                <SelectItem key={provider.id} value={provider.id.toString()}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Treatment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Treatment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Treatment Type and Requested Date in one row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="treatmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treatment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select treatment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {treatmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                    name="requestedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* CPT Codes - Full width */}
                <FormField
                  control={form.control}
                  name="cptCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPT Procedure Codes</FormLabel>
                      <div className="space-y-3">
                        {selectedCptCodes.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedCptCodes.map((code) => (
                              <div
                                key={code}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm flex items-center gap-2"
                              >
                                <span className="font-medium">{code}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCptCodeRemove(code)}
                                  className="text-blue-600 hover:text-blue-800 text-lg leading-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-10"
                              >
                                Add CPT code...
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search CPT codes..." />
                              <CommandEmpty>No CPT code found.</CommandEmpty>
                              <CommandGroup>
                                <CommandList className="max-h-48 overflow-auto">
                                  {procedureCodes?.map((code: any) => (
                                    <CommandItem
                                      key={code.id}
                                      onSelect={() => handleCptCodeAdd(code.cptCode)}
                                    >
                                      <div className="flex flex-col w-full">
                                        <span className="font-medium">{code.cptCode}</span>
                                        <span className="text-sm text-gray-500">{code.description}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ICD-10 Codes - Full width with free text option */}
                <FormField
                  control={form.control}
                  name="icd10Codes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ICD-10 Diagnosis Codes</FormLabel>
                      <div className="space-y-3">
                        {selectedIcd10Codes.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedIcd10Codes.map((code) => {
                              const icd10 = icd10Codes?.find((c: any) => c.icd10Code === code);
                              return (
                                <div
                                  key={code}
                                  className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm flex items-center gap-2"
                                >
                                  <span className="font-medium">{code}</span>
                                  {icd10 && (
                                    <span className="text-xs opacity-75">
                                      - {icd10.description.substring(0, 25)}...
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleIcd10CodeRemove(code)}
                                    className="text-green-600 hover:text-green-800 text-lg leading-none"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-10"
                              >
                                Select from database...
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search ICD-10 codes..." />
                                <CommandEmpty>No ICD-10 code found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandList className="max-h-48 overflow-auto">
                                    {icd10Codes?.map((code: any) => (
                                      <CommandItem
                                        key={code.id}
                                        onSelect={() => handleIcd10CodeAdd(code.icd10Code)}
                                      >
                                        <div className="flex flex-col w-full">
                                          <span className="font-medium">{code.icd10Code}</span>
                                          <span className="text-sm text-gray-500">{code.description}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Or enter ICD-10 code manually..." 
                              className="flex-1"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const input = e.target as HTMLInputElement;
                                  const code = input.value.trim().toUpperCase();
                                  if (code && !selectedIcd10Codes.includes(code)) {
                                    handleIcd10CodeAdd(code);
                                    input.value = '';
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                                const code = input.value.trim().toUpperCase();
                                if (code && !selectedIcd10Codes.includes(code)) {
                                  handleIcd10CodeAdd(code);
                                  input.value = '';
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Clinical Justification - Full width */}
                <FormField
                  control={form.control}
                  name="clinicalJustification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Justification</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter clinical justification for the treatment..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supporting Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drag and drop files here or click to browse</p>
                  <p className="text-sm text-gray-500 mb-4">Supported formats: PDF, DOC, DOCX, JPG, PNG</p>
                  <Button type="button" variant="outline">
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="secondary">
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="healthcare-button-primary"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Authorization"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

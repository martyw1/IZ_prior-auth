import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Building, Phone, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for insurance providers
const insuranceProviderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be less than 10 characters"),
  priorAuthPhone: z.string().optional(),
  priorAuthFax: z.string().optional(),
  priorAuthEmail: z.string().email().optional().or(z.literal("")),
  priorAuthWebsite: z.string().url().optional().or(z.literal("")),
  averageProcessingDays: z.number().min(1).max(30).default(5),
  urgentProcessingDays: z.number().min(1).max(10).default(2),
  notes: z.string().optional(),
  priorAuthSteps: z.array(z.object({
    stepNumber: z.number(),
    stepName: z.string(),
    description: z.string().optional(),
    required: z.boolean().default(true),
  })).optional(),
});

type InsuranceProviderFormData = z.infer<typeof insuranceProviderSchema>;

interface InsuranceProvider {
  id: number;
  name: string;
  code: string;
  priorAuthPhone?: string;
  priorAuthFax?: string;
  priorAuthEmail?: string;
  priorAuthWebsite?: string;
  averageProcessingDays?: number;
  urgentProcessingDays?: number;
  notes?: string;
  priorAuthSteps?: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Insurance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (data: InsuranceProviderFormData) => {
      const response = await apiRequest("POST", "/api/insurance/providers", data, {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/providers"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Insurance provider created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create insurance provider",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsuranceProviderFormData> }) => {
      const response = await apiRequest("PUT", `/api/insurance/providers/${id}`, data, {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/providers"] });
      setIsDialogOpen(false);
      setEditingProvider(null);
      toast({
        title: "Success",
        description: "Insurance provider updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update insurance provider",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/insurance/providers/${id}`, undefined, {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/providers"] });
      toast({
        title: "Success",
        description: "Insurance provider deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete insurance provider",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsuranceProviderFormData>({
    resolver: zodResolver(insuranceProviderSchema),
    defaultValues: {
      name: "",
      code: "",
      priorAuthPhone: "",
      priorAuthFax: "",
      priorAuthEmail: "",
      priorAuthWebsite: "",
      averageProcessingDays: 5,
      urgentProcessingDays: 2,
      notes: "",
      priorAuthSteps: [
        { stepNumber: 1, stepName: "Initial Review", description: "Review request for completeness", required: true },
        { stepNumber: 2, stepName: "Clinical Review", description: "Medical necessity review", required: true },
        { stepNumber: 3, stepName: "Decision", description: "Approve or deny request", required: true },
      ],
    },
  });

  const onSubmit = (data: InsuranceProviderFormData) => {
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (provider: InsuranceProvider) => {
    setEditingProvider(provider);
    form.reset({
      name: provider.name,
      code: provider.code,
      priorAuthPhone: provider.priorAuthPhone || "",
      priorAuthFax: provider.priorAuthFax || "",
      priorAuthEmail: provider.priorAuthEmail || "",
      priorAuthWebsite: provider.priorAuthWebsite || "",
      averageProcessingDays: provider.averageProcessingDays || 5,
      urgentProcessingDays: provider.urgentProcessingDays || 2,
      notes: provider.notes || "",
      priorAuthSteps: provider.priorAuthSteps || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const filteredProviders = providers?.filter((provider: InsuranceProvider) =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProvider(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Insurance Providers</h2>
          <p className="text-gray-600">Manage insurance provider profiles and prior authorization workflows</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="healthcare-button-primary"
              onClick={() => {
                setEditingProvider(null);
                form.reset();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Insurance Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Edit Insurance Provider" : "New Insurance Provider"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Blue Cross Blue Shield" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., BCBS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priorAuthPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prior Auth Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="1-800-XXX-XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priorAuthFax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prior Auth Fax</FormLabel>
                        <FormControl>
                          <Input placeholder="1-800-XXX-XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priorAuthEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prior Auth Email</FormLabel>
                        <FormControl>
                          <Input placeholder="priorauth@insurance.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priorAuthWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prior Auth Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://provider.com/priorauth" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="averageProcessingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Processing Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="30" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="urgentProcessingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgent Processing Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Special requirements, processing notes, etc." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="healthcare-button-primary"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Provider"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="healthcare-card">
        <CardContent className="p-4">
          <Input
            placeholder="Search insurance providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="healthcare-card">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredProviders.map((provider: InsuranceProvider) => (
            <Card key={provider.id} className="healthcare-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-600" />
                      {provider.name}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {provider.code}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(provider)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Insurance Provider</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {provider.name}? This will deactivate the provider but preserve historical data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(provider.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {provider.priorAuthPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{provider.priorAuthPhone}</span>
                    </div>
                  )}
                  {provider.priorAuthEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{provider.priorAuthEmail}</span>
                    </div>
                  )}
                  {provider.priorAuthWebsite && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <a 
                        href={provider.priorAuthWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Prior Auth Portal
                      </a>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Avg Processing:</span>
                      <span className="ml-1 font-medium">{provider.averageProcessingDays || 5} days</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Urgent:</span>
                      <span className="ml-1 font-medium">{provider.urgentProcessingDays || 2} days</span>
                    </div>
                  </div>
                  {provider.notes && (
                    <div className="text-sm text-gray-600 border-t pt-2">
                      {provider.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredProviders.length === 0 && !isLoading && (
        <Card className="healthcare-card">
          <CardContent className="p-8 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "No providers found" : "No insurance providers"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? "Try adjusting your search terms."
                : "Get started by adding your first insurance provider."
              }
            </p>
            {!searchQuery && (
              <Button 
                className="healthcare-button-primary"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Insurance Provider
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
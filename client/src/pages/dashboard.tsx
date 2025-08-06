import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, XCircle, Timer } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import QuickActions from "@/components/dashboard/quick-actions";
import AuthorizationTable from "@/components/authorization/authorization-table";
import AuthorizationModal from "@/components/authorization/authorization-modal";
import PatientForm from "@/components/patients/patient-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
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

  const handleNewAuthorization = () => {
    setShowAuthModal(true);
  };

  const handleNewPatient = () => {
    setShowPatientModal(true);
  };

  const handleGenerateAuthorization = () => {
    // Navigate to the Generate PA Package page
    window.location.href = '/prior-auth-generator';
  };

  const handleViewAuthorization = (authorization: any) => {
    toast({
      title: "Authorization Details",
      description: `Viewing authorization ${authorization.authorizationId}`,
    });
  };

  const handleEditAuthorization = (authorization: any) => {
    toast({
      title: "Edit Authorization",
      description: `Editing authorization ${authorization.authorizationId}`,
    });
  };

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          <p className="text-gray-600">Manage prior authorizations and patient data efficiently</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="healthcare-card animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Manage prior authorizations and patient data efficiently</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Pending Authorizations"
          value={stats?.pending || 0}
          icon={Clock}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-100"
        />
        <StatsCard
          title="Approved Today"
          value={stats?.approved || 0}
          icon={CheckCircle}
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          title="Denied/Rejected"
          value={stats?.denied || 0}
          icon={XCircle}
          iconColor="text-red-500"
          iconBgColor="bg-red-100"
        />
        <StatsCard
          title="Average Processing Time"
          value="2.4"
          subtitle="days"
          icon={Timer}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions
        onNewAuthorization={handleNewAuthorization}
        onNewPatient={handleNewPatient}
        onGenerateAuthorization={handleGenerateAuthorization}
      />

      {/* Recent Authorizations Table */}
      <AuthorizationTable
        onView={handleViewAuthorization}
        onEdit={handleEditAuthorization}
      />

      {/* Modals */}
      <AuthorizationModal
        trigger={<div />}
        isOpen={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => setShowAuthModal(false)}
      />
      
      <PatientForm
        trigger={<div />}
        isOpen={showPatientModal}
        onOpenChange={setShowPatientModal}
        onSuccess={() => setShowPatientModal(false)}
      />
    </div>
  );
}

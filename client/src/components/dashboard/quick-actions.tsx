import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Plus, FileText } from "lucide-react";

interface QuickActionsProps {
  onNewAuthorization: () => void;
  onNewPatient: () => void;
  onGenerateAuthorization: () => void;
}

export default function QuickActions({
  onNewAuthorization,
  onNewPatient,
  onGenerateAuthorization,
}: QuickActionsProps) {
  return (
    <Card className="healthcare-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={onNewPatient}
            className="healthcare-button-primary flex items-center justify-center p-4"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add New Patient
          </Button>
          <Button
            onClick={onNewAuthorization}
            className="healthcare-button-secondary flex items-center justify-center p-4"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Authorization Request
          </Button>
          <Button
            onClick={onGenerateAuthorization}
            className="healthcare-button-accent flex items-center justify-center p-4"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate Authorization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

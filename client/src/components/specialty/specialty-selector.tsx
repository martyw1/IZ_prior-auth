import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Settings } from "lucide-react";
import type { MedicalSpecialty } from "@shared/schema";

interface SpecialtySelectorProps {
  onSpecialtyChange?: (specialty: MedicalSpecialty | null) => void;
}

export default function SpecialtySelector({ onSpecialtyChange }: SpecialtySelectorProps) {
  const [selectedSpecialty, setSelectedSpecialty] = useState<MedicalSpecialty | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: specialties, isLoading } = useQuery<MedicalSpecialty[]>({
    queryKey: ["/api/medical-specialties"],
    queryFn: async () => {
      const response = await fetch("/api/medical-specialties", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch specialties");
      return response.json();
    },
  });

  // Load specialty from localStorage on component mount
  useEffect(() => {
    const savedSpecialty = localStorage.getItem("selectedSpecialty");
    if (savedSpecialty && specialties) {
      try {
        const parsedSpecialty = JSON.parse(savedSpecialty);
        const foundSpecialty = specialties.find(s => s.id === parsedSpecialty.id);
        if (foundSpecialty) {
          setSelectedSpecialty(foundSpecialty);
        }
      } catch (error) {
        console.error("Error parsing saved specialty:", error);
      }
    }
  }, [specialties]);

  const handleSpecialtySelect = (specialtyId: string) => {
    const specialty = specialties?.find(s => s.id === parseInt(specialtyId));
    if (specialty) {
      setSelectedSpecialty(specialty);
      localStorage.setItem("selectedSpecialty", JSON.stringify(specialty));
      onSpecialtyChange?.(specialty);
      setIsOpen(false);
    }
  };

  const clearSpecialty = () => {
    setSelectedSpecialty(null);
    localStorage.removeItem("selectedSpecialty");
    onSpecialtyChange?.(null);
    setIsOpen(false);
  };

  // Group specialties by main specialty
  const groupedSpecialties = specialties?.reduce((acc, specialty) => {
    if (!acc[specialty.specialty]) {
      acc[specialty.specialty] = [];
    }
    acc[specialty.specialty].push(specialty);
    return acc;
  }, {} as Record<string, MedicalSpecialty[]>);

  const getSpecialtyDisplay = (specialty: MedicalSpecialty) => {
    if (specialty.subspecialty) {
      return `${specialty.specialty} - ${specialty.subspecialty}`;
    }
    return specialty.specialty;
  };

  return (
    <div className="flex items-center space-x-2">
      {selectedSpecialty && (
        <Badge variant="outline" className="max-w-xs truncate">
          <Stethoscope className="h-3 w-3 mr-1" />
          {getSpecialtyDisplay(selectedSpecialty)}
        </Badge>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
            <Settings className="h-4 w-4 mr-1" />
            {selectedSpecialty ? "Change" : "Select"} Specialty
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Medical Specialty</DialogTitle>
            <DialogDescription>
              Choose your medical specialty to customize forms and workflows for your practice.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select onValueChange={handleSpecialtySelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a medical specialty..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedSpecialties || {}).map(([mainSpecialty, subspecialties]) => (
                  <div key={mainSpecialty}>
                    {subspecialties.length === 1 && !subspecialties[0].subspecialty ? (
                      <SelectItem value={subspecialties[0].id.toString()}>
                        {mainSpecialty}
                      </SelectItem>
                    ) : (
                      <>
                        <div className="px-2 py-1 text-sm font-medium text-gray-500 border-b pointer-events-none">
                          {mainSpecialty}
                        </div>
                        {subspecialties.map(specialty => (
                          <SelectItem key={specialty.id} value={specialty.id.toString()}>
                            <div className="pl-4">
                              {specialty.subspecialty || "General"}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={clearSpecialty}>
              Clear Selection
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ImportTabContentProps {
  children: React.ReactNode;
  uploadResults: any;
  isUploading: boolean;
  uploadProgress: number;
  clearImportState: () => void;
  UploadProgressCard: React.FC;
  UploadResultsCard: React.FC;
}

export default function ImportTabContent({
  children,
  uploadResults,
  isUploading,
  uploadProgress,
  clearImportState,
  UploadProgressCard,
  UploadResultsCard,
}: ImportTabContentProps) {
  return (
    <div className="space-y-6">
      {children}
      <UploadProgressCard />
      <UploadResultsCard />
      {(uploadResults || isUploading || uploadProgress > 0) && (
        <Card className="healthcare-card border-orange-200">
          <CardContent className="pt-6">
            <Button
              variant="outline"
              onClick={clearImportState}
              className="w-full"
            >
              Clear Import State & Start Fresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

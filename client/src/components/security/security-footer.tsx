import { Shield, Eye } from "lucide-react";

export default function SecurityFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600 mr-1" />
              <span>End-to-End Encrypted</span>
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-blue-600 mr-1" />
              <span>Audit Logged</span>
            </div>
            <div className="text-sm text-gray-500">
              MedAuth Pro is Copyright by IndustryZoom.ai
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-2 md:mt-0">
            App Version: <span className="font-medium">v2.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

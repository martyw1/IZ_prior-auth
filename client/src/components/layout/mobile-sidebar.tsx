import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  BarChart3,
  Users,
  ClipboardCheck,
  Shield,
  FileText,
  History,
  LayoutDashboard,
  Bug,
  Upload,
  Workflow,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patient Management", href: "/patients", icon: Users },
  { name: "Prior Authorizations", href: "/authorizations", icon: ClipboardCheck },
  { name: "PA Workflow", href: "/prior-auth-workflow", icon: Workflow },
  { name: "Generate PA Package", href: "/prior-auth-generator", icon: FileText },
  { name: "Insurance Verification", href: "/insurance", icon: Shield },
  { name: "Document Management", href: "/documents", icon: FileText },
  { name: "Data Import", href: "/import", icon: Upload },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { name: "Audit Trail", href: "/audit", icon: History },
  { name: "App Event Logs", href: "/app-logs", icon: Bug },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <nav className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <div className="p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    onClick={onClose}
                    className={cn(
                      "flex items-center p-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
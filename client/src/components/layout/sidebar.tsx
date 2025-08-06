import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
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
  Building,
  Globe,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patient Management", href: "/patients", icon: Users },
  { name: "Prior Authorizations", href: "/authorizations", icon: ClipboardCheck },
  { name: "Insurance Providers", href: "/insurance", icon: Building },
  { name: "External Connections", href: "/external-connections", icon: Globe },
  { name: "Generate PA Package", href: "/prior-auth-generator", icon: FileText },
  { name: "Document Management", href: "/documents", icon: FileText },
  { name: "Data Import", href: "/import", icon: Upload },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { name: "Audit Trail", href: "/audit", icon: History },
  { name: "App Event Logs", href: "/app-logs", icon: Bug },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <nav className="bg-white dark:bg-gray-800 w-64 shadow-lg flex-shrink-0 border-r border-gray-200 dark:border-gray-700 hidden md:block">
      <div className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href} className={cn(
                  "flex items-center p-3 rounded-lg transition-colors text-sm md:text-base",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                )}>
                  <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

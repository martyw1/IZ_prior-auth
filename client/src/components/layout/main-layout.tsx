import { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import MobileSidebar from "./mobile-sidebar.tsx";
import SecurityFooter from "../security/security-footer";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar />}
        
        {/* Mobile Sidebar */}
        {isMobile && (
          <MobileSidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      
      <SecurityFooter />
    </div>
  );
}
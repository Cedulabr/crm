import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop or mobile when open */}
      {(!isMobile || mobileSidebarOpen) && (
        <div
          className={`${
            isMobile ? "fixed inset-0 z-50 bg-black bg-opacity-50" : ""
          }`}
          onClick={isMobile ? () => setMobileSidebarOpen(false) : undefined}
        >
          <div 
            className={`${isMobile ? "max-w-[256px]" : ""}`}
            onClick={e => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

type HeaderProps = {
  onMobileMenuToggle: () => void;
};

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="flex justify-between items-center px-6 py-3">
        {isMobile && (
          <div className="flex items-center lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuToggle}
              className="text-neutral-500 hover:text-neutral-700"
            >
              <span className="material-icons">menu</span>
            </Button>
          </div>
        )}
        
        <div className="flex-1 flex justify-center lg:justify-start lg:ml-4">
          <div className="relative w-full max-w-md">
            <Input
              type="text"
              className="pl-10 pr-4 py-2"
              placeholder="Pesquisar clientes, propostas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-neutral-400">
              search
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition"
          >
            <span className="material-icons">settings</span>
          </Button>
          <Avatar className="w-10 h-10 bg-primary-light text-white">
            <span className="text-sm font-medium">JP</span>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

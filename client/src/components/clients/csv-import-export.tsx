import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FaFileImport, FaFileExport, FaDownload } from "react-icons/fa";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { UserRole } from "@shared/schema";

export function CSVImportExport() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Carregar o papel do usuário do localStorage
  useEffect(() => {
    try {
      const userDataStr = localStorage.getItem("user");
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserRole(userData.role);
      }
    } catch (error) {
      console.error("Erro ao obter papel do usuário:", error);
    }
  }, []);
  
  // Verificar se o usuário é administrador ou gerente
  const isAllowed = userRole === UserRole.SUPERADMIN || userRole === UserRole.MANAGER;
  
  if (!isAllowed) {
    return null;
  }

  // Modelo CSV para download
  const handleDownloadTemplate = () => {
    const csvContent = [
      ["nome", "email", "telefone", "cpf", "observacoes", "convenioId"],
      ["João da Silva", "joao@exemplo.com", "(71)98765-4321", "123.456.789-00", "Cliente exemplo", "5"],
      ["Maria Santos", "maria@exemplo.com", "(11)91234-5678", "987.654.321-00", "Cliente VIP", "6"]
    ];
    
    const csv = Papa.unparse(csvContent);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_clientes.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Importar clientes do CSV
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo CSV para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      Papa.parse(importFile, {
        header: true,
        complete: async (results) => {
          const { data, errors } = results;
          
          if (errors.length > 0) {
            toast({
              title: "Erro ao processar o arquivo",
              description: `${errors.length} erros encontrados no arquivo CSV`,
              variant: "destructive",
            });
            setIsImporting(false);
            return;
          }
          
          try {
            const response = await fetch("/api/clients/import", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ clients: data }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
              toast({
                title: "Importação concluída",
                description: `${result.imported} clientes importados com sucesso`,
              });
              setIsOpen(false);
            } else {
              toast({
                title: "Erro na importação",
                description: result.message || "Ocorreu um erro ao importar os clientes",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Erro na requisição",
              description: "Não foi possível enviar os dados para o servidor",
              variant: "destructive",
            });
          }
          
          setIsImporting(false);
        },
        error: (error) => {
          toast({
            title: "Erro ao ler o arquivo",
            description: error.message,
            variant: "destructive",
          });
          setIsImporting(false);
        }
      });
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao processar o arquivo",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  // Exportar clientes para CSV
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch("/api/clients/export");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao exportar clientes");
      }
      
      const data = await response.json();
      
      const csv = Papa.unparse(data.clients);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `clientes_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: `${data.clients.length} clientes exportados com sucesso`,
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao exportar os clientes",
        variant: "destructive",
      });
    }
    
    setIsExporting(false);
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <FaFileImport className="mr-2" /> Importar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar clientes</DialogTitle>
            <DialogDescription>
              Selecione um arquivo CSV para importar clientes. 
              O arquivo deve conter as colunas: nome, email, telefone, cpf, observacoes, convenioId.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-2">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
              />
              <Button variant="outline" onClick={handleDownloadTemplate} size="sm">
                <FaDownload className="mr-2" /> Baixar modelo
              </Button>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleImport} 
                disabled={!importFile || isImporting}
              >
                {isImporting ? "Importando..." : "Importar clientes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Button variant="outline" onClick={handleExport} disabled={isExporting}>
        <FaFileExport className="mr-2" /> {isExporting ? "Exportando..." : "Exportar"}
      </Button>
    </div>
  );
}
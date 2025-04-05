import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, CopyCheck } from "lucide-react";

// Tipagem para a resposta do endpoint de verificação
interface TableStatusResponse {
  message: string;
  status: "OK" | "INCOMPLETE";
  tables?: string[];
  missingTables?: string[];
  setup?: {
    instructions: string;
    sqlStatements: Record<string, string>;
  };
  error?: string;
}

export function SupabaseTablesStatus() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [tableStatus, setTableStatus] = useState<TableStatusResponse | null>(null);
  const [copiedTable, setCopiedTable] = useState<string | null>(null);

  // Verificar status das tabelas no Supabase
  const checkTablesStatus = async () => {
    setIsChecking(true);
    try {
      const response = await apiRequest("GET", "/api/check-supabase-tables");
      const data = await response.json();
      setTableStatus(data);
    } catch (error) {
      console.error("Erro ao verificar tabelas do Supabase:", error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status das tabelas. Verifique se você está autenticado como administrador.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Copiar SQL para clipboard
  const copyToClipboard = (tableName: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedTable(tableName);
    
    toast({
      title: "SQL copiado!",
      description: `Comando para criar a tabela ${tableName} copiado para a área de transferência.`,
    });
    
    // Resetar o ícone de cópia após 3 segundos
    setTimeout(() => {
      setCopiedTable(null);
    }, 3000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Status das Tabelas no Supabase
        </CardTitle>
        <CardDescription>
          Verifique se todas as tabelas necessárias estão configuradas no Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!tableStatus ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4 text-center">
              Clique no botão abaixo para verificar o status das tabelas no Supabase.
            </p>
            <Button 
              onClick={checkTablesStatus} 
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar Tabelas"
              )}
            </Button>
          </div>
        ) : tableStatus.status === "OK" ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Tudo configurado!</AlertTitle>
            <AlertDescription className="text-green-700">
              Todas as {tableStatus.tables?.length} tabelas necessárias estão presentes no Supabase.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-800">Configuração incompleta</AlertTitle>
              <AlertDescription className="text-amber-700">
                {tableStatus.message}
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Tabelas faltantes ({tableStatus.missingTables?.length}):</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {tableStatus.missingTables?.map((table) => (
                  <Badge key={table} variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">
                    {table}
                  </Badge>
                ))}
              </div>
              
              <h3 className="font-medium mb-2">Instruções:</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {tableStatus.setup?.instructions}
              </p>
              
              <Tabs defaultValue={tableStatus.missingTables?.[0] || ""}>
                <TabsList className="mb-2 flex flex-wrap h-auto">
                  {tableStatus.missingTables?.map((table) => (
                    <TabsTrigger key={table} value={table} className="text-xs">
                      {table}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {tableStatus.missingTables?.map((table) => (
                  <TabsContent key={table} value={table}>
                    <div className="relative">
                      <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs">{tableStatus.setup?.sqlStatements[table]}</pre>
                      </ScrollArea>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                        onClick={() => copyToClipboard(table, tableStatus.setup?.sqlStatements[table] || "")}
                      >
                        {copiedTable === table ? (
                          <CopyCheck className="h-4 w-4" />
                        ) : (
                          <Clipboard className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={checkTablesStatus} disabled={isChecking}>
          {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verificar novamente
        </Button>
        
        {tableStatus && tableStatus.status === "INCOMPLETE" && (
          <Button variant="default" onClick={() => window.open("https://supabase.com/dashboard", "_blank")}>
            Abrir Console do Supabase
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
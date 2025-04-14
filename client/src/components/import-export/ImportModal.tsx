import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FilePlus, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { importClientsFromExcel, importProposalsFromExcel } from '@/lib/import-export';
import { syncAuthToken } from '@/lib/auth-utils';

interface ImportModalProps {
  type: 'clients' | 'proposals';
  onImportComplete?: (data: any[]) => void;
  trigger?: React.ReactNode;
}

export function ImportModal({ type, onImportComplete, trigger }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    errors?: any[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Verificar se é um arquivo Excel
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast({
          title: 'Formato inválido',
          description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para importar',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Garantir que o token está sincronizado antes de importar
      await syncAuthToken();
      
      let importedData: any[] = [];
      
      if (type === 'clients') {
        importedData = await importClientsFromExcel(file);
      } else if (type === 'proposals') {
        importedData = await importProposalsFromExcel(file);
      }

      setImportResult({
        success: true,
        message: `Importação concluída com sucesso. ${importedData.length} ${type === 'clients' ? 'clientes' : 'propostas'} importados.`,
        count: importedData.length
      });

      toast({
        title: 'Importação concluída',
        description: `${importedData.length} ${type === 'clients' ? 'clientes' : 'propostas'} foram importados com sucesso.`,
        variant: 'default',
      });

      // Notificar o componente pai que a importação foi concluída
      if (onImportComplete) {
        onImportComplete(importedData);
      }
      
      // Após 3 segundos, fechar o modal
      setTimeout(() => {
        setOpen(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro na importação:', error);
      
      setImportResult({
        success: false,
        message: `Erro na importação: ${error.message || 'Erro desconhecido'}`,
        errors: error.errors
      });
      
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro durante a importação dos dados.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setImportResult(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar {type === 'clients' ? 'Clientes' : 'Propostas'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Importar {type === 'clients' ? 'Clientes' : 'Propostas'}</DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx ou .xls) para importar {type === 'clients' ? 'clientes' : 'propostas'}.
            {type === 'clients' ? ' Todos os campos do cliente são opcionais exceto nome.' : ' É necessário informar o clientId e productId.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {!importResult ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="file-upload" className="font-medium">
                  Arquivo Excel
                </Label>
                <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg py-8 px-4 bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-10 w-10 text-green-500" />
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FilePlus className="h-10 w-10 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">Clique para selecionar um arquivo</span>
                        <span className="text-xs text-gray-500">ou arraste e solte aqui</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              {file && (
                <div className="text-xs text-blue-600">
                  <p>✓ Arquivo selecionado: {file.name}</p>
                </div>
              )}
            </>
          ) : (
            <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={`text-sm font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {importResult.success ? 'Importação bem-sucedida' : 'Erro na importação'}
                  </h3>
                  <p className="text-sm mt-1">
                    {importResult.message}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-800 cursor-pointer">
                        Ver detalhes dos erros ({importResult.errors.length})
                      </summary>
                      <ul className="mt-1 text-xs text-red-800 ml-2">
                        {importResult.errors.map((err, index) => (
                          <li key={index} className="mt-1">• {typeof err === 'string' ? err : JSON.stringify(err)}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || isImporting}
                className={isImporting ? 'opacity-80' : ''}
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setOpen(false)} 
              variant={importResult.success ? 'default' : 'outline'}
            >
              {importResult.success ? 'Fechar' : 'Tentar novamente'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
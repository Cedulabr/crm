import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { exportToExcel } from '@/lib/import-export';
import { syncAuthToken } from '@/lib/auth-utils';

interface ExportButtonProps {
  data: any[];
  fileName: string;
  sheetName?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onExport?: () => void;
}

export function ExportButton({
  data,
  fileName,
  sheetName = 'Dados',
  variant = 'outline',
  size = 'default',
  className = '',
  onExport
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (data.length === 0) {
      toast({
        title: 'Sem dados para exportar',
        description: 'Não há dados disponíveis para exportação.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Garantir que o token está sincronizado
      await syncAuthToken();
      
      // Exportar dados para Excel
      const success = exportToExcel(data, fileName, sheetName);
      
      if (success) {
        toast({
          title: 'Exportação concluída',
          description: `Os dados foram exportados com sucesso para ${fileName}.xlsx`,
          variant: 'default',
        });
        
        if (onExport) {
          onExport();
        }
      } else {
        throw new Error('Falha na exportação.');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      
      toast({
        title: 'Erro na exportação',
        description: error instanceof Error ? error.message : 'Ocorreu um erro durante a exportação dos dados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting || data.length === 0}
      className={className}
    >
      {isExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Exportando...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </>
      )}
    </Button>
  );
}
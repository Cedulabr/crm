import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Database, 
  HelpCircle, 
  RefreshCw, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';

type TableStatus = {
  name: string;
  status: string;
  columns: string[];
};

type DataStatus = {
  organizations: { count: number; exists: boolean };
  products: { count: number; exists: boolean };
  convenios: { count: number; exists: boolean };
  banks: { count: number; exists: boolean };
};

type SetupSQL = {
  tables: string;
  organization: string;
  products: string;
  convenios: string;
  banks: string;
};

type SupabaseStatusResponse = {
  status: string;
  missing_tables: string[];
  tables_status: TableStatus[];
  tables_with_issues: TableStatus[];
  data_status: DataStatus;
  setup_sql: SetupSQL;
  error?: string;
};

export function SupabaseTablesStatus() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('status');
  
  const { data, isLoading, isError, error, refetch } = useQuery<SupabaseStatusResponse>({
    queryKey: ['/api/check-supabase-tables'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/check-supabase-tables');
      return response.json();
    }
  });
  
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({ 
      title: 'Copiado!', 
      description: message,
      variant: 'default' 
    });
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Verificando Status do Supabase
          </CardTitle>
          <CardDescription>
            Verificando as tabelas e dados no banco de dados Supabase...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Consultando o banco de dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro ao Verificar Supabase
          </CardTitle>
          <CardDescription>
            Não foi possível verificar o status do banco de dados Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Erro de conexão</h3>
                <div className="mt-2 text-sm text-destructive/90">
                  <p>{error instanceof Error ? error.message : 'Erro ao conectar com o Supabase'}</p>
                </div>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-2 w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Se há um erro na resposta
  if (data?.error) {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro na Resposta
          </CardTitle>
          <CardDescription>
            O servidor retornou um erro ao verificar o banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Mensagem de erro</h3>
                <div className="mt-2 text-sm text-destructive/90">
                  <p>{data.error}</p>
                </div>
              </div>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sql" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SQL para Criar Tabelas</CardTitle>
                  <CardDescription>
                    Execute este SQL no console do Supabase ou usando a API SQL do Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-md bg-secondary p-4">
                    <Button 
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(data.setup_sql?.tables || '', 'SQL copiado para a área de transferência')}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copiar</span>
                    </Button>
                    <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                      {data.setup_sql?.tables || 'SQL não disponível'}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="status" className="mt-4">
              <div className="text-center p-4">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium">Configuração do Supabase Incompleta</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  O banco de dados Supabase não está configurado corretamente. 
                  Mude para a aba "SQL" para obter o código necessário para criar as tabelas.
                </p>
                <Button 
                  onClick={() => setActiveTab('sql')} 
                  variant="default" 
                  className="mt-4"
                >
                  Ver SQL
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
  
  // Status normal - visualização completa
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status das Tabelas Supabase
            </CardTitle>
            <CardDescription>
              Verificação das tabelas e dados no banco de dados Supabase
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto" 
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex items-center">
          <div className="mr-4">
            {data?.status === 'ok' ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : data?.status === 'missing_data' ? (
              <HelpCircle className="h-8 w-8 text-amber-500" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {data?.status === 'ok' 
                ? 'Configuração completa'
                : data?.status === 'missing_data'
                  ? 'Tabelas existem, mas dados iniciais estão faltando'
                  : 'Configuração incompleta'
              }
            </h3>
            <p className="text-sm text-muted-foreground">
              {data?.status === 'ok' 
                ? 'Todas as tabelas e dados básicos estão configurados corretamente.'
                : data?.status === 'missing_data'
                  ? 'As tabelas existem, mas alguns dados iniciais precisam ser criados.'
                  : data?.missing_tables 
                    ? `${data.missing_tables.length} tabelas estão faltando.`
                    : 'Erro ao verificar tabelas. Por favor, verifique a conexão com o Supabase.'
              }
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Status das Tabelas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data?.tables_status.map((table) => (
                    <div 
                      key={table.name} 
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center">
                        {table.status === 'ok' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mr-2" />
                        )}
                        <span className="text-sm">{table.name}</span>
                      </div>
                      <Badge variant={table.status === 'ok' ? 'outline' : 'destructive'}>
                        {table.status === 'ok' ? 'OK' : 'Ausente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {data?.status === 'missing_data' && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Status dos Dados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        {data.data_status.organizations.exists ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500 mr-2" />
                        )}
                        <span className="text-sm">Organizações</span>
                      </div>
                      <Badge variant={data.data_status.organizations.exists ? 'outline' : 'secondary'}>
                        {data.data_status.organizations.count} registros
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        {data.data_status.products.exists ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500 mr-2" />
                        )}
                        <span className="text-sm">Produtos</span>
                      </div>
                      <Badge variant={data.data_status.products.exists ? 'outline' : 'secondary'}>
                        {data.data_status.products.count} registros
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        {data.data_status.convenios.exists ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500 mr-2" />
                        )}
                        <span className="text-sm">Convênios</span>
                      </div>
                      <Badge variant={data.data_status.convenios.exists ? 'outline' : 'secondary'}>
                        {data.data_status.convenios.count} registros
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        {data.data_status.banks.exists ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500 mr-2" />
                        )}
                        <span className="text-sm">Bancos</span>
                      </div>
                      <Badge variant={data.data_status.banks.exists ? 'outline' : 'secondary'}>
                        {data.data_status.banks.count} registros
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="sql" className="mt-4">
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="tables">
                  <AccordionTrigger>
                    SQL para Criar Tabelas
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="relative rounded-md bg-secondary p-4">
                      <Button 
                        className="absolute top-2 right-2 h-8 w-8 p-0"
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(data?.setup_sql?.tables || '', 'SQL de tabelas copiado para a área de transferência')}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copiar</span>
                      </Button>
                      <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {data?.setup_sql?.tables || 'SQL não disponível'}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {!data?.data_status?.organizations?.exists && (
                  <AccordionItem value="organizations">
                    <AccordionTrigger>
                      SQL para Criar Organização Padrão
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="relative rounded-md bg-secondary p-4">
                        <Button 
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(data?.setup_sql?.organization || '', 'SQL de organização copiado para a área de transferência')}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copiar</span>
                        </Button>
                        <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {data?.setup_sql?.organization || 'SQL não disponível'}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {!data?.data_status?.products?.exists && (
                  <AccordionItem value="products">
                    <AccordionTrigger>
                      SQL para Criar Produtos Padrão
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="relative rounded-md bg-secondary p-4">
                        <Button 
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(data?.setup_sql?.products || '', 'SQL de produtos copiado para a área de transferência')}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copiar</span>
                        </Button>
                        <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {data?.setup_sql?.products || 'SQL não disponível'}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {!data?.data_status?.convenios?.exists && (
                  <AccordionItem value="convenios">
                    <AccordionTrigger>
                      SQL para Criar Convênios Padrão
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="relative rounded-md bg-secondary p-4">
                        <Button 
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(data?.setup_sql?.convenios || '', 'SQL de convênios copiado para a área de transferência')}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copiar</span>
                        </Button>
                        <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {data?.setup_sql?.convenios || 'SQL não disponível'}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                
                {!data?.data_status?.banks?.exists && (
                  <AccordionItem value="banks">
                    <AccordionTrigger>
                      SQL para Criar Bancos Padrão
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="relative rounded-md bg-secondary p-4">
                        <Button 
                          className="absolute top-2 right-2 h-8 w-8 p-0"
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(data?.setup_sql?.banks || '', 'SQL de bancos copiado para a área de transferência')}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copiar</span>
                        </Button>
                        <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {data?.setup_sql?.banks || 'SQL não disponível'}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
              
              <div className="mt-4 p-4 rounded-md bg-amber-50 border border-amber-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Como usar este SQL</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>Para executar este SQL, acesse o console do Supabase e use a ferramenta SQL Editor.</p>
                      <p className="mt-1">Siga estas etapas:</p>
                      <ol className="mt-1 ml-4 list-decimal">
                        <li>Acesse o console do Supabase</li>
                        <li>Vá para a seção "SQL Editor" no menu lateral</li>
                        <li>Crie uma nova consulta</li>
                        <li>Cole o SQL copiado</li>
                        <li>Execute a consulta</li>
                      </ol>
                      <p className="mt-1">Execute os scripts na ordem: tabelas, organização, produtos, convênios, bancos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
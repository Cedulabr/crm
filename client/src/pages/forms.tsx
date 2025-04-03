import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, FileCheck, EyeIcon, Copy, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { FormTemplateEditor } from "@/components/forms/form-template-editor";

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState("meus-formularios");
  const [location, setLocation] = useLocation();

  // Carregar formulários
  const { data: formTemplates, isLoading } = useQuery({
    queryKey: ["/api/form-templates"],
    queryFn: async () => {
      const response = await fetch("/api/form-templates");
      if (!response.ok) {
        throw new Error("Erro ao carregar formulários");
      }
      return response.json();
    },
  });

  // Carregar submissões de formulários
  const { data: formSubmissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ["/api/form-submissions"],
    queryFn: async () => {
      const response = await fetch("/api/form-submissions");
      if (!response.ok) {
        throw new Error("Erro ao carregar submissões de formulários");
      }
      return response.json();
    },
  });

  // Mutation para excluir formulário
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({
        title: "Formulário excluído",
        description: "O formulário foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir formulário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para processar submissão
  const processSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/form-submissions/${id}/process`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-submissions"] });
      toast({
        title: "Submissão processada",
        description: "A submissão foi processada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar submissão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Estado para formuário selecionado
  const [selectedForm, setSelectedForm] = useState<any>(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Formulários</h1>
      
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Crie formulários personalizados para capturar leads e integrar ao Kanban
        </p>
        <Button onClick={() => setLocation("/forms/new")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Formulário
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="meus-formularios">Meus Formulários</TabsTrigger>
          <TabsTrigger value="submissoes">Submissões</TabsTrigger>
        </TabsList>

        <TabsContent value="meus-formularios">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : formTemplates?.length === 0 ? (
            <div className="text-center p-10 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Nenhum formulário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro formulário para capturar leads
              </p>
              <Button onClick={() => setLocation("/forms/new")}>
                <Plus className="mr-2 h-4 w-4" /> Criar formulário
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {formTemplates?.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>
                      {template.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <Badge variant={template.active ? "default" : "outline"}>
                          {template.active ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className="ml-2">
                          {template.fields?.length || 0} campos
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Novos leads serão inseridos na coluna:{" "}
                        <span className="font-medium">
                          {template.kanbanColumn === "lead" ? "Nova Proposta" :
                           template.kanbanColumn === "qualification" ? "Qualificação" :
                           template.kanbanColumn === "negotiation" ? "Negociação" :
                           template.kanbanColumn === "closing" ? "Fechamento" :
                           template.kanbanColumn}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" onClick={() => setLocation(`/forms/edit/${template.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O formulário será excluído permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/form/${template.id}`
                        );
                        toast({
                          title: "Link copiado",
                          description: "O link do formulário foi copiado para sua área de transferência",
                        });
                      }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="default" size="icon" onClick={() => window.open(`/form/${template.id}`, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissoes">
          {isLoadingSubmissions ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <Card key={index}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : formSubmissions?.length === 0 ? (
            <div className="text-center p-10 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Nenhuma submissão encontrada</h3>
              <p className="text-muted-foreground">
                As submissões de formulários aparecerão aqui quando alguém preencher seus formulários.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formSubmissions?.map((submission: any) => {
                // Encontrar o template correspondente
                const template = formTemplates?.find(
                  (t: any) => t.id === submission.formTemplateId
                );
                
                return (
                  <Card key={submission.id} className={submission.status === "novo" ? "border-blue-400" : ""}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>
                            Submissão #{submission.id}
                            {submission.clientId && (
                              <Badge variant="outline" className="ml-2">
                                Cliente criado
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            Formulário: {template?.name || `ID: ${submission.formTemplateId}`}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={
                            submission.status === "novo" ? "default" : 
                            submission.status === "processado" ? "success" : 
                            "destructive"
                          }
                        >
                          {submission.status === "novo" ? "Novo" : 
                           submission.status === "processado" ? "Processado" : 
                           "Rejeitado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Data de submissão: {new Date(submission.createdAt).toLocaleString()}
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <EyeIcon className="h-4 w-4 mr-2" /> Ver dados
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Dados da submissão #{submission.id}</DialogTitle>
                              <DialogDescription>
                                Formulário: {template?.name || `ID: ${submission.formTemplateId}`}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] border rounded-md p-4">
                              <div className="space-y-4">
                                {Object.entries(submission.data).map(([key, value]: [string, any]) => {
                                  // Encontrar o campo correspondente no template
                                  const field = template?.fields?.find(
                                    (f: any) => f.name === key
                                  );
                                  
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="font-medium">
                                        {field?.label || key}
                                      </Label>
                                      <div className="text-sm p-2 bg-muted rounded">
                                        {typeof value === "object" 
                                          ? JSON.stringify(value, null, 2) 
                                          : String(value)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                    {submission.status === "novo" && (
                      <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={() => processSubmissionMutation.mutate(submission.id)}
                        >
                          <FileCheck className="h-4 w-4 mr-2" /> Processar Submissão
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
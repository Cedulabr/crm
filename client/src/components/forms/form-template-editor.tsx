import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, Form, FormDescription, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, ArrowLeft, Copy, Grip, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Tipos de campos disponíveis
const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "textarea", label: "Área de Texto" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "currency", label: "Moeda" },
];

// Kanban columns
const kanbanColumns = [
  { value: "lead", label: "Nova Proposta" },
  { value: "qualification", label: "Qualificação" },
  { value: "negotiation", label: "Negociação" },
  { value: "closing", label: "Fechamento" },
];

// Componente SortableField - Para permitir arrastar e soltar os campos
function SortableField({ field, onEdit, onRemove }: { field: any, onEdit: (field: any) => void, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center">
          <div {...attributes} {...listeners} className="cursor-grab mr-2">
            <Grip className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </CardTitle>
            <CardDescription className="text-xs">
              {fieldTypes.find(t => t.value === field.type)?.label || field.type}
            </CardDescription>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => onEdit(field)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 text-destructive" 
              onClick={() => onRemove(field.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// Componente Editor de Campo (FieldEditor)
function FieldEditor({ field, onChange, onClose }: { field: any, onChange: (field: any) => void, onClose: () => void }) {
  const form = useForm({
    defaultValues: field || {
      id: crypto.randomUUID(),
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      helpText: "",
      options: [{ label: "", value: "" }],
      defaultValue: "",
    },
  });

  const fieldType = form.watch("type");
  
  const handleSubmit = (data: any) => {
    onChange(data);
    onClose();
  };

  const addOption = () => {
    const options = form.getValues("options") || [];
    form.setValue("options", [...options, { label: "", value: "" }]);
  };

  const removeOption = (index: number) => {
    const options = form.getValues("options");
    if (!options) return;
    form.setValue(
      "options",
      options.filter((_, i) => i !== index)
    );
  };

  useEffect(() => {
    if (field.name === "") {
      // Gerar um nome a partir do label
      const label = form.watch("label");
      if (label) {
        const name = label
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        form.setValue("name", name);
      }
    }
  }, [form.watch("label")]);

  return (
    <Card className="max-w-3xl">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <div>
          <CardTitle>Editor de Campo</CardTitle>
          <CardDescription>
            Configure as propriedades do campo
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rótulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente" {...field} />
                  </FormControl>
                  <FormDescription>
                    Texto exibido para o usuário
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome de identificação</FormLabel>
                  <FormControl>
                    <Input placeholder="nome_cliente" {...field} />
                  </FormControl>
                  <FormDescription>
                    ID do campo (sem espaços)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de campo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Campo obrigatório</FormLabel>
                    <FormDescription>
                      Este campo deve ser preenchido para enviar o formulário
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(fieldType === "text" || 
              fieldType === "email" || 
              fieldType === "phone" || 
              fieldType === "number") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Texto de exemplo que aparece quando o campo está vazio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor padrão</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Valor inicial do campo (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {fieldType === "textarea" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Texto de exemplo que aparece quando o campo está vazio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor padrão</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Valor inicial do campo (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(fieldType === "select" || fieldType === "radio" || fieldType === "checkbox") && (
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-row justify-between items-center">
                  <FormLabel className="h-4">Opções</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar opção
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {form.watch("options")?.map((_, index) => (
                    <div key={index} className="flex flex-row gap-2 items-center">
                      <Input
                        placeholder="Rótulo"
                        value={form.watch(`options.${index}.label`)}
                        onChange={(e) => {
                          const options = [...form.getValues("options")];
                          options[index].label = e.target.value;
                          form.setValue("options", options);
                        }}
                      />
                      <Input
                        placeholder="Valor"
                        value={form.watch(`options.${index}.value`)}
                        onChange={(e) => {
                          const options = [...form.getValues("options")];
                          options[index].value = e.target.value;
                          form.setValue("options", options);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeOption(index)}
                        disabled={form.watch("options").length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <FormField
                  control={form.control}
                  name="defaultValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor padrão</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um valor padrão" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {form.watch("options")?.map((option, index) => (
                            <SelectItem key={index} value={option.value}>
                              {option.label || option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Opção pré-selecionada (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="helpText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto de ajuda</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    Informação adicional exibida abaixo do campo (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar Campo</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// Componente principal
export function FormTemplateEditor() {
  const [location, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const formSchema = z.object({
    name: z.string().min(3, "O nome é obrigatório e deve ter pelo menos 3 caracteres"),
    description: z.string().optional(),
    kanbanColumn: z.string().default("lead"),
    active: z.boolean().default(true),
    fields: z.array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "O nome é obrigatório"),
        label: z.string().min(1, "O rótulo é obrigatório"),
        type: z.string(),
        required: z.boolean().default(false),
        options: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
            })
          )
          .optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
      })
    ).min(1, "Adicione pelo menos um campo ao formulário"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      kanbanColumn: "lead",
      active: true,
      fields: [],
    },
  });

  // Carregar formulário para edição
  const { data: formTemplate, isLoading } = useQuery({
    queryKey: ["/api/form-templates", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/form-templates/${id}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar formulário");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Preencher formulário com dados carregados
  useEffect(() => {
    if (formTemplate) {
      form.reset({
        name: formTemplate.name,
        description: formTemplate.description || "",
        kanbanColumn: formTemplate.kanbanColumn || "lead",
        active: formTemplate.active ?? true,
        fields: formTemplate.fields || [],
      });
    }
  }, [formTemplate]);

  // Estado para o campo atualmente em edição
  const [editingField, setEditingField] = useState<any | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  // Manipuladores para arrastar e soltar
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const fields = form.getValues("fields");
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);
      
      form.setValue("fields", arrayMove(fields, oldIndex, newIndex));
    }
  };

  // Adicionar um novo campo
  const addField = () => {
    setEditingField({
      id: crypto.randomUUID(),
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      helpText: "",
      options: [{ label: "", value: "" }],
      defaultValue: "",
    });
    setShowFieldEditor(true);
  };

  // Editar campo existente
  const editField = (field: any) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  // Clonar campo existente
  const cloneField = (field: any) => {
    const clonedField = {
      ...field,
      id: crypto.randomUUID(),
      name: `${field.name}_copy`,
      label: `${field.label} (cópia)`,
    };
    const fields = form.getValues("fields");
    form.setValue("fields", [...fields, clonedField]);
  };

  // Atualizar campo
  const updateField = (updatedField: any) => {
    const fields = form.getValues("fields");
    const index = fields.findIndex((field) => field.id === updatedField.id);
    
    if (index >= 0) {
      // Atualizar campo existente
      fields[index] = updatedField;
    } else {
      // Adicionar novo campo
      fields.push(updatedField);
    }
    
    form.setValue("fields", [...fields]);
    setShowFieldEditor(false);
  };

  // Remover campo
  const removeField = (id: string) => {
    const fields = form.getValues("fields");
    form.setValue(
      "fields",
      fields.filter((field) => field.id !== id)
    );
  };

  // Mutation para salvar o formulário
  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/form-templates", data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({
        title: isEditing ? "Formulário atualizado" : "Formulário criado",
        description: isEditing
          ? "O formulário foi atualizado com sucesso"
          : "O formulário foi criado com sucesso",
      });
      setLocation("/forms");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar formulário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-10 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pb-20">
      <Button
        variant="outline"
        size="sm"
        className="mb-6"
        onClick={() => setLocation("/forms")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Formulários
      </Button>

      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? "Editar Formulário" : "Novo Formulário"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Configure as informações gerais do formulário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Formulário</FormLabel>
                      <FormControl>
                        <Input placeholder="Formulário de Captação de Leads" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kanbanColumn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coluna do Kanban</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {kanbanColumns.map((column) => (
                            <SelectItem key={column.value} value={column.value}>
                              {column.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Novos leads serão inseridos nesta coluna do Kanban
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o propósito do formulário"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma breve descrição para ajudar a identificar o formulário
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Formulário Ativo</FormLabel>
                      <FormDescription>
                        Desative temporariamente para impedir novas submissões
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Campos do Formulário</h2>
              <p className="text-sm text-muted-foreground">
                Configure os campos que serão exibidos no formulário
              </p>
            </div>
            <Button type="button" onClick={addField}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
            </Button>
          </div>

          {showFieldEditor && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <FieldEditor
                field={editingField}
                onChange={updateField}
                onClose={() => setShowFieldEditor(false)}
              />
            </div>
          )}

          {form.formState.errors.fields && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                {form.formState.errors.fields.message}
              </AlertDescription>
            </Alert>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.watch("fields").map(field => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {form.watch("fields").length === 0 ? (
                  <div className="text-center p-12 border border-dashed rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Nenhum campo adicionado</h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione campos ao seu formulário clicando no botão acima
                    </p>
                    <Button type="button" onClick={addField}>
                      <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
                    </Button>
                  </div>
                ) : (
                  form.watch("fields").map((field) => (
                    <SortableField
                      key={field.id}
                      field={field}
                      onEdit={editField}
                      onRemove={removeField}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="sticky bottom-0 bg-background pt-2 pb-6 border-t mt-8">
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/forms")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar Formulário"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
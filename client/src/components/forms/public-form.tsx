import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, Form, FormDescription, FormMessage } from "@/components/ui/form";

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [validationSchema, setValidationSchema] = useState<z.ZodType<any>>(z.object({}));
  const [dynamicForm, setDynamicForm] = useState<any>(null);

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // Função para formatar CNPJ
  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  // Função para formatar moeda
  const formatCurrency = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d)(\d{2})$/, "$1,$2")
      .replace(/(?=(\d{3})+(\D))\B/g, ".");
  };

  // Carregar o formulário
  useEffect(() => {
    const fetchFormTemplate = async () => {
      try {
        const response = await fetch(`/api/form-templates/${id}`);
        if (!response.ok) {
          throw new Error("Formulário não encontrado");
        }
        const data = await response.json();
        
        // Verificar se o formulário está ativo
        if (!data.active) {
          throw new Error("Este formulário não está disponível no momento");
        }
        
        setFormTemplate(data);
        setFormFields(data.fields || []);
        
        // Criar schema de validação dinâmico
        let schemaObject: Record<string, z.ZodType<any>> = {};
        
        (data.fields || []).forEach((field: any) => {
          let fieldSchema: z.ZodType<any> = z.string();
          
          // Adicionar validação específica para cada tipo de campo
          switch (field.type) {
            case "email":
              fieldSchema = z.string().email("Email inválido");
              break;
            case "number":
              fieldSchema = z.string().refine(
                (val) => !isNaN(Number(val.replace(/\D/g, ""))),
                "Deve ser um número válido"
              );
              break;
            case "cpf":
              fieldSchema = z.string().min(14, "CPF inválido");
              break;
            case "cnpj":
              fieldSchema = z.string().min(18, "CNPJ inválido");
              break;
            case "phone":
              fieldSchema = z.string().min(14, "Telefone inválido");
              break;
            default:
              fieldSchema = z.string();
          }
          
          // Se o campo for obrigatório, adicionar validação
          if (field.required) {
            fieldSchema = fieldSchema.min(1, "Este campo é obrigatório");
          } else {
            fieldSchema = fieldSchema.optional();
          }
          
          schemaObject[field.name] = fieldSchema;
        });
        
        setValidationSchema(z.object(schemaObject));
        setIsLoading(false);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };
    
    fetchFormTemplate();
  }, [id]);

  // Criar formulário dinâmico quando o esquema de validação estiver pronto
  useEffect(() => {
    if (formTemplate && formFields.length > 0) {
      // Criar valores padrão
      const defaultValues: Record<string, any> = {};
      formFields.forEach((field) => {
        defaultValues[field.name] = field.defaultValue || "";
      });
      
      // Criar formulário
      const dynamicFormHook = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues,
      });
      
      setDynamicForm(dynamicFormHook);
    }
  }, [formTemplate, formFields, validationSchema]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/form-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formTemplateId: Number(id),
          data,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao enviar formulário");
      }
      
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se o formulário ainda está carregando
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando formulário...</span>
      </div>
    );
  }

  // Se o formulário não foi encontrado
  if (!formTemplate) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Formulário não encontrado</h1>
        <p className="text-muted-foreground">
          Este formulário não existe ou não está disponível.
        </p>
      </div>
    );
  }

  // Se o formulário foi enviado com sucesso
  if (isSubmitted) {
    return (
      <div className="container mx-auto p-6 max-w-lg">
        <Card className="text-center p-6">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Formulário enviado com sucesso!</h1>
            <p className="text-muted-foreground mb-6">
              Obrigado por preencher o formulário. Em breve entraremos em contato.
            </p>
            <Button onClick={() => window.location.reload()}>
              Enviar novo formulário
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderização do formulário
  if (!dynamicForm) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Preparando formulário...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{formTemplate.name}</CardTitle>
          {formTemplate.description && (
            <CardDescription>{formTemplate.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...dynamicForm}>
            <form onSubmit={dynamicForm.handleSubmit(handleSubmit)} className="space-y-6">
              {formFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  {field.type === "text" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={field.placeholder || ""} 
                              {...formField} 
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "email" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder={field.placeholder || ""} 
                              {...formField} 
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "number" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder={field.placeholder || ""} 
                              {...formField} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                formField.onChange(value);
                              }}
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "phone" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder={field.placeholder || "(00) 00000-0000"} 
                              value={formatPhone(formField.value || "")}
                              onChange={(e) => {
                                formField.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "cpf" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder={field.placeholder || "000.000.000-00"} 
                              value={formatCPF(formField.value || "")}
                              onChange={(e) => {
                                formField.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "cnpj" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder={field.placeholder || "00.000.000/0000-00"} 
                              value={formatCNPJ(formField.value || "")}
                              onChange={(e) => {
                                formField.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "currency" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500">R$</span>
                              </div>
                              <Input 
                                type="text" 
                                className="pl-10" 
                                placeholder={field.placeholder || "0,00"} 
                                value={formatCurrency(formField.value || "")}
                                onChange={(e) => {
                                  formField.onChange(e.target.value);
                                }}
                              />
                            </div>
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "select" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={formField.onChange}
                              value={formField.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || "Selecione uma opção"} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option: any, index: number) => (
                                  <SelectItem key={index} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "textarea" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={field.placeholder || ""} 
                              {...formField} 
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "checkbox" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={formField.value === 'true' || formField.value === true}
                              onCheckedChange={(checked) => {
                                formField.onChange(checked);
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </FormLabel>
                            {field.helpText && (
                              <FormDescription>{field.helpText}</FormDescription>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "radio" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={formField.onChange}
                              value={formField.value}
                              className="flex flex-col space-y-1"
                            >
                              {field.options?.map((option: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option.value} id={`${field.name}-${index}`} />
                                  <Label htmlFor={`${field.name}-${index}`}>{option.label}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {field.type === "date" && (
                    <FormField
                      control={dynamicForm.control}
                      name={field.name}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...formField} 
                            />
                          </FormControl>
                          {field.helpText && (
                            <FormDescription>{field.helpText}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ))}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { insertProposalSchema, type ProposalWithDetails } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Extended schema with numeric value validation and client info
const proposalFormSchema = insertProposalSchema
  .omit({ createdAt: true, clientId: true })
  .extend({
    clientName: z.string().min(3, { message: "Nome do cliente é obrigatório" }),
    clientCpf: z.string().min(11, { message: "CPF do cliente é obrigatório" }),
    clientPhone: z.string().optional(),
    productId: z.string().min(1, { message: "Produto é obrigatório" }),
    convenioId: z.string().min(1, { message: "Convênio é obrigatório" }),
    bankId: z.string().min(1, { message: "Banco é obrigatório" }),
    value: z.string().min(1, { message: "Valor é obrigatório" }),
    comments: z.string().optional(),
    status: z.string(),
  });

type ProposalFormData = z.infer<typeof proposalFormSchema>;

interface ProposalFormProps {
  proposal?: ProposalWithDetails | null;
  onClose: () => void;
}

export default function ProposalForm({ proposal, onClose }: ProposalFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients for selection
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch products for selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch convenios for selection
  const { data: convenios } = useQuery({
    queryKey: ['/api/convenios'],
  });

  // Fetch banks for selection
  const { data: banks } = useQuery({
    queryKey: ['/api/banks'],
  });

  // Define default values based on whether we're editing or creating
  const defaultValues: Partial<ProposalFormData> = {
    clientName: proposal?.client?.name || "",
    clientCpf: proposal?.client?.cpf || "",
    clientPhone: proposal?.client?.phone || "",
    productId: proposal?.productId?.toString() || "",
    convenioId: proposal?.convenioId?.toString() || "",
    bankId: proposal?.bankId?.toString() || "",
    value: proposal?.value ? 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(proposal.value)) 
      : "",
    comments: proposal?.comments || "",
    status: proposal?.status || "em_negociacao",
  };

  // Initialize form
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues,
  });

  // Create proposal mutation
  const createProposalMutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      // Processar o valor removendo formatação de moeda
      const rawValue = data.value.replace(/[^\d,]/g, '').replace(',', '.');
      
      // Convert string IDs to numbers
      const formattedData = {
        clientName: data.clientName,
        clientCpf: data.clientCpf,
        clientPhone: data.clientPhone,
        productId: data.productId ? parseInt(data.productId) : undefined,
        convenioId: data.convenioId ? parseInt(data.convenioId) : undefined,
        bankId: data.bankId ? parseInt(data.bankId) : undefined,
        value: rawValue,
        comments: data.comments,
        status: data.status
      };
      return apiRequest('POST', '/api/proposals', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals-with-details'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-activity'] });
      toast({
        title: "Proposta adicionada",
        description: "A proposta foi adicionada com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao adicionar proposta: ${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Update proposal mutation
  const updateProposalMutation = useMutation({
    mutationFn: async (data: { id: number; formData: ProposalFormData }) => {
      // Processar o valor removendo formatação de moeda
      const rawValue = data.formData.value.replace(/[^\d,]/g, '').replace(',', '.');
      
      // Convert string IDs to numbers
      const formattedData = {
        clientName: data.formData.clientName,
        clientCpf: data.formData.clientCpf,
        clientPhone: data.formData.clientPhone,
        productId: data.formData.productId ? parseInt(data.formData.productId) : undefined,
        convenioId: data.formData.convenioId ? parseInt(data.formData.convenioId) : undefined,
        bankId: data.formData.bankId ? parseInt(data.formData.bankId) : undefined,
        value: rawValue,
        comments: data.formData.comments,
        status: data.formData.status
      };
      return apiRequest('PUT', `/api/proposals/${data.id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proposals-with-details'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-activity'] });
      toast({
        title: "Proposta atualizada",
        description: "A proposta foi atualizada com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar proposta: ${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Submit handler
  async function onSubmit(data: ProposalFormData) {
    setIsSubmitting(true);
    
    if (proposal) {
      // Update existing proposal
      updateProposalMutation.mutate({
        id: proposal.id,
        formData: data,
      });
    } else {
      // Create new proposal
      createProposalMutation.mutate(data);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente *</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientCpf"
          render={({ field }) => {
            // Função para formatar o CPF no padrão 031.458.655-52
            const formatCpf = (value: string) => {
              // Remove todos os caracteres não numéricos
              const numbers = value.replace(/\D/g, '');
              
              if (numbers.length === 0) return '';
              
              // Aplica a formatação
              if (numbers.length <= 3) {
                return numbers;
              } else if (numbers.length <= 6) {
                return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
              } else if (numbers.length <= 9) {
                return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
              } else {
                return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
              }
            };
            
            return (
              <FormItem>
                <FormLabel>CPF do Cliente *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="000.000.000-00" 
                    value={field.value || ''}
                    onChange={(e) => {
                      const formatted = formatCpf(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <FormField
          control={form.control}
          name="clientPhone"
          render={({ field }) => {
            // Função para formatar o telefone no padrão (71)98600-7832
            const formatPhone = (value: string) => {
              // Remove todos os caracteres não numéricos
              const numbers = value.replace(/\D/g, '');
              
              if (numbers.length === 0) return '';
              
              // Aplica a formatação
              if (numbers.length <= 2) {
                return `(${numbers}`;
              } else if (numbers.length <= 7) {
                return `(${numbers.slice(0, 2)})${numbers.slice(2)}`;
              } else {
                return `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
              }
            };
            
            return (
              <FormItem>
                <FormLabel>Telefone do Cliente</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(00)00000-0000" 
                    value={field.value || ''}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(products) && products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
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
          name="convenioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Convênio *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(convenios) && convenios.map((convenio: any) => (
                    <SelectItem key={convenio.id} value={convenio.id.toString()}>
                      {convenio.name}
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
          name="bankId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banco *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(banks) && banks.map((bank: any) => (
                    <SelectItem key={bank.id} value={bank.id.toString()}>
                      {bank.name}
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
          name="value"
          render={({ field }) => {
            const formatCurrency = (value: string) => {
              // Remove todos os caracteres não numéricos
              const onlyNums = value.replace(/[^\d]/g, '');
              
              if (onlyNums === '') return '';
              
              // Converte para número e divide por 100 para considerar centavos
              const amount = parseInt(onlyNums, 10) / 100;
              
              // Formata como moeda brasileira
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(amount);
            };
            
            return (
              <FormItem>
                <FormLabel>Valor *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="R$ 0,00"
                    value={field.value}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      // Só formata se tiver algum valor
                      if (rawValue) {
                        const formatted = formatCurrency(rawValue);
                        field.onChange(formatted);
                      } else {
                        field.onChange('');
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentários</FormLabel>
              <FormControl>
                <textarea 
                  placeholder="Adicione comentários ou observações sobre a proposta"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                  <SelectItem value="aceita">Aceita</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end pt-4 space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-primary-dark hover:bg-primary"
          >
            {isSubmitting ? "Salvando..." : "Salvar Proposta"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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

// Extended schema with numeric value validation
const proposalFormSchema = insertProposalSchema
  .omit({ createdAt: true })
  .extend({
    value: z.string().refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      { message: "Valor deve ser um número maior que zero" }
    ),
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
    clientId: proposal?.clientId?.toString() || "",
    productId: proposal?.productId?.toString() || "",
    convenioId: proposal?.convenioId?.toString() || "",
    bankId: proposal?.bankId?.toString() || "",
    value: proposal?.value?.toString() || "",
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
      // Convert string IDs to numbers
      const formattedData = {
        ...data,
        clientId: data.clientId ? parseInt(data.clientId) : undefined,
        productId: data.productId ? parseInt(data.productId) : undefined,
        convenioId: data.convenioId ? parseInt(data.convenioId) : undefined,
        bankId: data.bankId ? parseInt(data.bankId) : undefined,
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
      // Convert string IDs to numbers
      const formattedData = {
        ...data.formData,
        clientId: data.formData.clientId ? parseInt(data.formData.clientId) : undefined,
        productId: data.formData.productId ? parseInt(data.formData.productId) : undefined,
        convenioId: data.formData.convenioId ? parseInt(data.formData.convenioId) : undefined,
        bankId: data.formData.bankId ? parseInt(data.formData.bankId) : undefined,
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
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} - {client.company}
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
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto</FormLabel>
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
                  {products?.map(product => (
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
              <FormLabel>Convênio</FormLabel>
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
                  {convenios?.map(convenio => (
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
              <FormLabel>Banco</FormLabel>
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
                  {banks?.map(bank => (
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <Input placeholder="R$ 0,00" {...field} />
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

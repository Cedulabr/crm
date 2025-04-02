import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertClientSchema, type Client, type ClientWithKanban, type Convenio } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Extended schema with validations
const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(3, "Nome precisa ter pelo menos 3 caracteres").nonempty("Nome é obrigatório"),
  phone: z.string().nonempty("Telefone é obrigatório"),
  cpf: z.string().nonempty("CPF é obrigatório"),
  convenioId: z.coerce.number().int("Convênio é obrigatório"),
  birthDate: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  client?: Client | ClientWithKanban | null;
  onClose: () => void;
}

export default function ClientForm({ client, onClose }: ClientFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch convenios for selection
  const { data: convenios } = useQuery({
    queryKey: ['/api/convenios'],
  });

  // Define default values based on whether we're editing or creating
  const defaultValues: Partial<ClientFormData> = {
    name: client?.name || "",
    phone: client?.phone || "",
    cpf: client?.cpf || "",
    birthDate: client?.birthDate || "",
    convenioId: client?.convenioId || 0,
    contact: client?.contact || "",
  };

  // Initialize form
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      return apiRequest('POST', '/api/clients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients-with-kanban'] });
      toast({
        title: "Cliente adicionado",
        description: "O cliente foi adicionado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao adicionar cliente: ${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: { id: number; formData: ClientFormData }) => {
      return apiRequest('PUT', `/api/clients/${data.id}`, data.formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients-with-kanban'] });
      toast({
        title: "Cliente atualizado",
        description: "O cliente foi atualizado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar cliente: ${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Submit handler
  async function onSubmit(data: ClientFormData) {
    setIsSubmitting(true);
    
    if (client) {
      // Update existing client
      updateClientMutation.mutate({
        id: client.id,
        formData: data,
      });
    } else {
      // Create new client
      createClientMutation.mutate(data);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="cpf"
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
                <FormLabel>CPF *</FormLabel>
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
          name="phone"
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
                <FormLabel>Telefone *</FormLabel>
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
          name="convenioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Convênio *</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(Number(value))} 
                defaultValue={field.value !== null && field.value !== undefined ? String(field.value) : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(convenios) && convenios.map((convenio: any) => (
                    <SelectItem key={convenio.id} value={String(convenio.id)}>
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
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Nascimento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        

        
        {!client && (
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estágio Inicial</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue="lead"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estágio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualificacao">Qualificação</SelectItem>
                    <SelectItem value="negociacao">Negociação</SelectItem>
                    <SelectItem value="fechamento">Fechamento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
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
            {isSubmitting ? "Salvando..." : "Salvar Cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

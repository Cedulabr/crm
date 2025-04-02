import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Organization, insertOrganizationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface OrganizationFormProps {
  organization?: Organization | null;
  onClose: () => void;
}

export default function OrganizationForm({ organization, onClose }: OrganizationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Definir o formulário com validação do Zod
  const form = useForm({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      name: organization?.name || "",
      address: organization?.address || "",
      phone: organization?.phone || "",
      cnpj: organization?.cnpj || "",
      email: organization?.email || "",
      website: organization?.website || "",
      description: organization?.description || "",
      logo: organization?.logo || "",
    },
  });

  // Mutação para criar ou atualizar organizações
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = organization ? `/api/organizations/${organization.id}` : "/api/organizations";
      const method = organization ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: organization ? "Empresa atualizada" : "Empresa criada",
        description: organization
          ? "A empresa foi atualizada com sucesso."
          : "A empresa foi criada com sucesso.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${organization ? "atualizar" : "criar"} empresa: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Submit handler
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa*</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome da empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="XX.XXX.XXX/0001-XX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(XX) XXXXX-XXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://www.empresa.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Endereço completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Logo</FormLabel>
              <FormControl>
                <Input placeholder="https://exemplo.com/logo.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva a empresa..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-800 hover:bg-blue-700"
          >
            {isSubmitting ? "Salvando..." : organization ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
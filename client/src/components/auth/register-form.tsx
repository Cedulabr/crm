import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "../../hooks/use-supabase-auth";
import { useSupabaseProfile } from "../../hooks/use-supabase-profile";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole, UserSector } from "@shared/schema";

// Esquema de validação do formulário de registro
const registerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  role: z.enum([UserRole.AGENT, UserRole.MANAGER, UserRole.SUPERADMIN]),
  sector: z.enum([UserSector.COMMERCIAL, UserSector.FINANCIAL, UserSector.OPERATIONAL]),
  organizationId: z.number().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { register } = useSupabaseAuth();
  const { updateProfile } = useSupabaseProfile();
  const [isRegistering, setIsRegistering] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: UserRole.AGENT,
      sector: UserSector.COMMERCIAL,
      organizationId: 1, // Organização padrão, pode ser alterado
    }
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsRegistering(true);
    try {
      // 1. Usar Supabase para registro de usuário
      const authResult = await register(values.email, values.password, { 
        name: values.name,
      });
      
      if (!authResult?.user?.id) {
        throw new Error("Falha ao registrar usuário. Nenhum ID de usuário retornado.");
      }
      
      // 2. Inserir dados do perfil usando o hook de perfil
      const profileData = await updateProfile({
        name: values.name,
        role: values.role,
        sector: values.sector,
        organization_id: values.organizationId,
      });
      
      if (!profileData) {
        console.error("Erro ao criar perfil");
        toast({
          title: "Erro ao criar perfil",
          description: "Seu usuário foi criado, mas houve um problema ao configurar o perfil.",
          variant: "destructive"
        });
      }
      
      toast({
        title: "Registro realizado com sucesso",
        description: "Sua conta foi criada. Você já pode fazer login.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erro ao registrar",
        description: error.message || "Não foi possível criar sua conta",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome completo" {...field} />
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
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserRole.AGENT}>Agente</SelectItem>
                    <SelectItem value={UserRole.MANAGER}>Gestor</SelectItem>
                    <SelectItem value={UserRole.SUPERADMIN}>Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setor</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserSector.COMMERCIAL}>Comercial</SelectItem>
                    <SelectItem value={UserSector.FINANCIAL}>Financeiro</SelectItem>
                    <SelectItem value={UserSector.OPERATIONAL}>Operacional</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isRegistering}>
          {isRegistering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </Form>
  );
}
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "../../hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";

// Esquema de validação do formulário de registro
const registerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const { register } = useSupabaseAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: ""
    }
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsRegistering(true);
    try {
      // Usar Supabase para registro
      await register(values.email, values.password, { 
        name: values.name,
      });
      
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
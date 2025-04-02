import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Esquema de validação do formulário de login
const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoggingIn(true);
    try {
      // Simulação de login (em um sistema real, isso seria uma chamada para a API)
      // Verificamos o e-mail e senha para determinar o tipo de usuário
      let userData = null;
      
      if (values.email === "admin@empresa.com" && values.password === "senha123") {
        userData = {
          id: 1,
          name: "Administrador",
          email: values.email,
          role: "superadmin",
          token: "admin-token-123"
        };
      } else if (values.email === "gestor@empresa.com" && values.password === "senha123") {
        userData = {
          id: 2,
          name: "Gestor da Empresa",
          email: values.email,
          role: "manager",
          token: "manager-token-123"
        };
      } else if (values.email === "agente@empresa.com" && values.password === "senha123") {
        userData = {
          id: 3,
          name: "Agente de Vendas",
          email: values.email,
          role: "agent",
          token: "agent-token-123"
        };
      }
      
      if (userData) {
        // Salvar token e dados do usuário no localStorage
        localStorage.setItem("token", userData.token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Invalidar queries existentes para recarregar dados com o novo token
        await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo, ${userData.name}!`,
        });
        
        // Redirecionar para a dashboard
        setLocation("/dashboard");
      } else {
        toast({
          title: "Erro de autenticação",
          description: "E-mail ou senha incorretos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro ao fazer login",
        description: "Verifique suas credenciais e tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Sistema de Gestão de Vendas
            </span>
          </CardTitle>
          <CardDescription className="text-center">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={isLoggingIn}>
                {isLoggingIn ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-xs text-center text-gray-500">
            Credenciais de exemplo:
            <div className="grid grid-cols-3 gap-2 mt-2 text-gray-600">
              <div>
                <div className="font-semibold">Administrador</div>
                <div>admin@empresa.com</div>
                <div>senha123</div>
              </div>
              <div>
                <div className="font-semibold">Gestor</div>
                <div>gestor@empresa.com</div>
                <div>senha123</div>
              </div>
              <div>
                <div className="font-semibold">Agente</div>
                <div>agente@empresa.com</div>
                <div>senha123</div>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
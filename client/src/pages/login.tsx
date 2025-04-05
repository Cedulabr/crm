import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "../hooks/use-supabase-auth";
import { useSupabaseProfile } from "../hooks/use-supabase-profile";
import RegisterForm from "@/components/auth/register-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const { login, user } = useSupabaseAuth();
  const { fetchProfile, profile } = useSupabaseProfile();
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
  }>({ tested: false, success: false });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  async function onSubmit(values: LoginFormValues) {
    setIsLoggingIn(true);
    try {
      // Usar Supabase para login
      const authData = await login(values.email, values.password);
      
      // Buscar perfil do usuário
      if (authData?.user) {
        await fetchProfile();
      }
      
      // Invalidar queries existentes para recarregar dados com o novo token
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      
      toast({
        title: "Login realizado com sucesso",
        description: profile?.name 
          ? `Bem-vindo de volta, ${profile.name}!` 
          : "Bem-vindo ao sistema!",
      });
      
      // Redirecionar acontecerá automaticamente pelo useEffect acima
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  // Função para testar a conexão com o Supabase
  const testConnection = async () => {
    try {
      setIsTestingConnection(true);
      // Importando dinamicamente para evitar problemas de carregamento
      const { testSupabaseConnection } = await import('../lib/test-supabase');
      const result = await testSupabaseConnection();
      
      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: "A conexão com o Supabase está funcionando corretamente.",
        });
      } else {
        toast({
          title: "Erro de conexão",
          description: result.message || "Não foi possível conectar ao Supabase.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido"
      });
      
      toast({
        title: "Erro ao testar conexão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

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
            Acesse ou crie sua conta para continuar
          </CardDescription>
          <Button 
            onClick={testConnection} 
            variant="outline" 
            size="sm" 
            className="mx-auto mt-2"
            disabled={isTestingConnection}>
            {isTestingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando conexão...
              </>
            ) : (
              "Testar Conexão Supabase"
            )}
          </Button>
          
          {connectionStatus.tested && (
            <Alert variant={connectionStatus.success ? "default" : "destructive"} className="mt-2">
              <AlertTitle>{connectionStatus.success ? "Conexão OK" : "Problema de conexão"}</AlertTitle>
              <AlertDescription>
                {connectionStatus.message || (connectionStatus.success 
                  ? "Supabase está configurado corretamente." 
                  : "Não foi possível conectar ao Supabase.")}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registro</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
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
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm onSuccess={() => {
                toast({
                  title: "Conta criada com sucesso",
                  description: "Agora você pode fazer login com suas credenciais",
                });
              }} />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-xs text-center text-gray-500">
            <p className="font-semibold mb-2">
              Registre um novo usuário usando o formulário acima para acessar o sistema.
            </p>
            <p>
              Credenciais são armazenadas no Supabase. Você pode configurar suas próprias políticas de segurança e autenticação no painel do Supabase.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

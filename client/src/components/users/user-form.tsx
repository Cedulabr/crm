import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Organization } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Form schema with validation
const userFormSchema = z.object({
  name: z.string().min(3, {
    message: "O nome deve ter pelo menos 3 caracteres",
  }),
  email: z.string().email({
    message: "Email inválido",
  }),
  role: z.string(),
  sector: z.string().optional(),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres",
  }).optional(),
  organizationId: z.number().optional(),
});

// Props type
interface UserFormProps {
  user?: User | null;
  onClose: () => void;
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!user;

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = currentUser?.role === "superadmin";
  
  // Fetch organizations
  const { data: organizations, isLoading: isLoadingOrgs } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    enabled: isSuperAdmin, // Only load organizations for superadmin
  });

  // Set up form with default values
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(
      // Se estiver editando, não exige senha
      isEditing 
        ? userFormSchema.omit({ password: true }) 
        : userFormSchema
    ),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "agent", // Default to agent
      sector: user?.sector || "",
      organizationId: user?.organizationId || (currentUser?.organizationId ? Number(currentUser.organizationId) : 1),
    },
  });

  // Create/update user mutation
  const userMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userFormSchema>) => {
      if (isEditing && user) {
        return apiRequest(`/api/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: isEditing ? "Usuário atualizado" : "Usuário criado",
        description: isEditing
          ? "As informações do usuário foram atualizadas com sucesso."
          : "O novo usuário foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível ${isEditing ? "atualizar" : "criar"} o usuário: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof userFormSchema>) => {
    // Adiciona organizationId se não estiver presente
    if (!data.organizationId) {
      data.organizationId = currentUser?.organizationId ? Number(currentUser.organizationId) : 1; // Fallback para organizationId=1 se não tiver
    }
    
    // Garante que organizationId seja um número
    data.organizationId = Number(data.organizationId);
    
    // Para debugging
    console.log("Enviando dados de usuário:", data);
    
    userMutation.mutate(data);
  };

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
                <Input placeholder="Nome completo" {...field} />
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
                <Input placeholder="exemplo@email.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!isSuperAdmin && field.value === "superadmin"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Apenas superadmin pode criar outros superadmins */}
                  {isSuperAdmin && (
                    <SelectItem value="superadmin">Administrador</SelectItem>
                  )}
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
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
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="organizationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                  disabled={isLoadingOrgs}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!isEditing && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input placeholder="******" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={userMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={userMutation.isPending}
          >
            {userMutation.isPending ? (
              "Salvando..."
            ) : (
              isEditing ? "Atualizar" : "Criar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
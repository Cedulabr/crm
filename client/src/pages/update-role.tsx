import { UpdateUserRole } from "@/components/admin/update-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdateRolePage() {
  return (
    <section className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-medium text-neutral-500 mb-6">Atualizar Papel do Usuário</h1>
      
      <Card className="shadow-sm mb-8">
        <CardHeader>
          <CardTitle>Alterar Papel para SuperAdmin</CardTitle>
          <CardDescription>
            Use esta ferramenta para atualizar o papel do seu usuário no frontend.
            Esta operação é necessária quando seus privilégios no banco de dados não 
            estão sendo refletidos corretamente na interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateUserRole />
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Informações sobre Papéis</CardTitle>
        </CardHeader>
        <CardContent className="prose">
          <h3>SuperAdmin</h3>
          <p>O papel de SuperAdmin tem acesso total ao sistema, incluindo:</p>
          <ul>
            <li>Gerenciamento de empresas</li>
            <li>Configuração do Supabase</li>
            <li>Criação e gerenciamento de usuários</li>
            <li>Acesso a todas as funcionalidades do sistema</li>
          </ul>
          
          <h3>Manager</h3>
          <p>O papel de Manager tem acesso a:</p>
          <ul>
            <li>Gerenciamento de usuários da sua organização</li>
            <li>Visualização de todos os clientes e propostas da sua organização</li>
            <li>Criação de formulários</li>
          </ul>
          
          <h3>Agent</h3>
          <p>O papel de Agent tem acesso a:</p>
          <ul>
            <li>Gerenciamento de seus próprios clientes</li>
            <li>Criação e acompanhamento de propostas</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
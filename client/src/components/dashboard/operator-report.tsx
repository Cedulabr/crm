import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserSector, UserRole } from "@shared/schema";

// Tipo para a atividade do operador
type OperatorActivity = {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  sector: string;
  organizationId: number;
  organizationName: string;
  clientsCount: number;
  proposalsCount: number;
  lastActivity: string | null;
};

export default function OperatorReport() {
  const [filterText, setFilterText] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterOrg, setFilterOrg] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery<OperatorActivity[]>({
    queryKey: ["/api/dashboard/operator-activity"],
  });

  // Extrair organizações únicas para o filtro
  const organizationNames = data.map((op) => op.organizationName);
  const organizations = Array.from(new Set(organizationNames));

  // Filtrar os dados com base nos filtros selecionados
  const filteredData = data.filter((operator) => {
    // Filtro de texto (nome ou email)
    const textMatch =
      !filterText ||
      operator.userName.toLowerCase().includes(filterText.toLowerCase()) ||
      operator.userEmail.toLowerCase().includes(filterText.toLowerCase());

    // Filtro por papel
    const roleMatch = !filterRole || filterRole === "todos_papeis" || operator.userRole === filterRole;

    // Filtro por setor
    const sectorMatch = !filterSector || filterSector === "todos_setores" || operator.sector === filterSector;

    // Filtro por organização
    const orgMatch =
      !filterOrg || filterOrg === "todas_organizacoes" || operator.organizationName === filterOrg;

    return textMatch && roleMatch && sectorMatch && orgMatch;
  });

  // Função para formatar a data da última atividade
  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return "Sem atividade";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Função para renderizar o badge do papel do usuário
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case UserRole.SUPERADMIN:
        return <Badge className="bg-purple-600">Administrador</Badge>;
      case UserRole.MANAGER:
        return <Badge className="bg-blue-600">Gestor</Badge>;
      case UserRole.AGENT:
        return <Badge className="bg-green-600">Agente</Badge>;
      default:
        return <Badge className="bg-gray-400">{role}</Badge>;
    }
  };

  // Função para renderizar o badge do setor
  const renderSectorBadge = (sector: string) => {
    switch (sector) {
      case UserSector.COMMERCIAL:
        return <Badge variant="outline" className="border-green-600 text-green-600">Comercial</Badge>;
      case UserSector.OPERATIONAL:
        return <Badge variant="outline" className="border-blue-600 text-blue-600">Operacional</Badge>;
      case UserSector.FINANCIAL:
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Financeiro</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-400 text-gray-400">{sector || "N/A"}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Relatório de Operadores</CardTitle>
        <CardDescription>
          Visão detalhada da atividade de cada operador no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por nome ou email"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-auto">
            <Select
              value={filterRole || ""}
              onValueChange={(value) => setFilterRole(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos_papeis">Todos os papéis</SelectItem>
                <SelectItem value={UserRole.AGENT}>Agente</SelectItem>
                <SelectItem value={UserRole.MANAGER}>Gestor</SelectItem>
                <SelectItem value={UserRole.SUPERADMIN}>Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-auto">
            <Select
              value={filterSector || ""}
              onValueChange={(value) => setFilterSector(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos_setores">Todos os setores</SelectItem>
                <SelectItem value={UserSector.COMMERCIAL}>Comercial</SelectItem>
                <SelectItem value={UserSector.OPERATIONAL}>Operacional</SelectItem>
                <SelectItem value={UserSector.FINANCIAL}>Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-auto">
            <Select
              value={filterOrg || ""}
              onValueChange={(value) => setFilterOrg(value || null)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas_organizacoes">Todas as organizações</SelectItem>
                {Array.from(organizations).map((org) => (
                  <SelectItem key={org} value={org}>
                    {org}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Propostas</TableHead>
                <TableHead className="text-right">Última Atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Esqueleto de carregamento
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[150px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    Nenhum operador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((operator) => (
                  <TableRow key={operator.userId}>
                    <TableCell>
                      <div className="font-medium">{operator.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {operator.userEmail}
                      </div>
                    </TableCell>
                    <TableCell>{renderRoleBadge(operator.userRole)}</TableCell>
                    <TableCell>{renderSectorBadge(operator.sector)}</TableCell>
                    <TableCell>{operator.organizationName}</TableCell>
                    <TableCell className="text-right">{operator.clientsCount}</TableCell>
                    <TableCell className="text-right">{operator.proposalsCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatLastActivity(operator.lastActivity)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
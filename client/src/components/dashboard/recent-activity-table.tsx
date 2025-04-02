import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type ProposalWithDetails } from "@shared/schema";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface RecentActivityTableProps {
  activities: ProposalWithDetails[];
}

export default function RecentActivityTable({ activities }: RecentActivityTableProps) {
  // Helper to get badge color based on status
  const getStatusBadgeProps = (status: string | undefined) => {
    switch(status) {
      case 'em_negociacao':
        return { variant: 'primary' as const, label: 'Em Negociação' };
      case 'aceita':
        return { variant: 'success' as const, label: 'Aceita' };
      case 'em_analise':
        return { variant: 'secondary' as const, label: 'Em Análise' };
      case 'recusada':
        return { variant: 'destructive' as const, label: 'Recusada' };
      default:
        return { variant: 'outline' as const, label: 'Desconhecido' };
    }
  };

  // Helper to get formatted date
  const getFormattedDate = (dateString: Date | undefined | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoje, ${format(date, 'HH:mm')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  // Helper to get initials from name
  const getInitials = (name: string = '') => {
    return name.split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper to get avatar color class based on client name
  const getAvatarColorClass = (index: number) => {
    const colors = [
      'bg-primary-light',
      'bg-secondary-light',
      'bg-error-light',
      'bg-success-light'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="text-left text-sm font-medium text-neutral-400 pb-3">Cliente</th>
            <th className="text-left text-sm font-medium text-neutral-400 pb-3">Atividade</th>
            <th className="text-left text-sm font-medium text-neutral-400 pb-3">Valor</th>
            <th className="text-left text-sm font-medium text-neutral-400 pb-3">Status</th>
            <th className="text-left text-sm font-medium text-neutral-400 pb-3">Data</th>
          </tr>
        </thead>
        <tbody>
          {activities.length > 0 ? (
            activities.map((activity, index) => {
              const { variant, label } = getStatusBadgeProps(activity.status);
              return (
                <tr key={activity.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                  <td className="py-4">
                    <div className="flex items-center">
                      <Avatar className={`w-8 h-8 mr-3 ${getAvatarColorClass(index)} text-white`}>
                        <span className="text-xs font-medium">
                          {getInitials(activity.client?.name)}
                        </span>
                      </Avatar>
                      <div>
                        <p className="font-medium text-neutral-500">{activity.client?.company}</p>
                        <p className="text-xs text-neutral-400">{activity.client?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-neutral-500">
                      Nova proposta criada
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm font-medium text-neutral-500">
                      {Number(activity.value).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </td>
                  <td className="py-4">
                    <Badge variant={variant} className="px-2 py-1 text-xs rounded-full">
                      {label}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-neutral-400">
                      {getFormattedDate(activity.createdAt)}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-500">
                Não há atividades recentes para exibir.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import { format } from "date-fns";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ProposalWithDetails } from "@shared/schema";

interface ProposalCardProps {
  proposal: ProposalWithDetails;
  onEdit: () => void;
  onDelete: () => void;
}

// Helper to get status badge properties
function getStatusBadgeProps(status: string | undefined) {
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
}

export default function ProposalCard({ proposal, onEdit, onDelete }: ProposalCardProps) {
  const { variant, label } = getStatusBadgeProps(proposal.status);
  
  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Badge variant={variant} className="px-2 py-1 text-xs rounded-full">
              {label}
            </Badge>
            <h3 className="text-lg font-medium mt-2 text-neutral-500">
              {proposal.client?.company || 'Empresa não especificada'}
            </h3>
            <p className="text-sm text-neutral-400">{proposal.client?.name}</p>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-neutral-400 hover:text-primary-dark"
              onClick={onEdit}
            >
              <span className="material-icons">edit</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-neutral-400 hover:text-primary-dark"
              onClick={onDelete}
            >
              <span className="material-icons">more_vert</span>
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 mt-6">
          <div className="flex justify-between">
            <span className="text-sm text-neutral-400">Produto:</span>
            <span className="text-sm font-medium text-neutral-500">
              {proposal.product?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-400">Convênio:</span>
            <span className="text-sm font-medium text-neutral-500">
              {proposal.convenio?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-400">Banco:</span>
            <span className="text-sm font-medium text-neutral-500">
              {proposal.bank?.name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-neutral-400">Valor:</span>
            <span className="text-sm font-medium text-neutral-500">
              {Number(proposal.value).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex justify-between items-center">
        <div className="flex items-center text-sm text-neutral-400">
          <span className="material-icons text-sm mr-1">event</span>
          <span>
            Criada em {proposal.createdAt 
              ? format(new Date(proposal.createdAt), 'dd/MM/yyyy')
              : '-'
            }
          </span>
        </div>
        <Button variant="link" className="text-primary-dark hover:underline text-sm font-medium">
          Ver detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}

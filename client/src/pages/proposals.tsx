import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import ProposalForm from "@/components/proposals/proposal-form";
import ProposalCard from "@/components/proposals/proposal-card";
import { type ProposalWithDetails } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Proposals() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<ProposalWithDetails | null>(null);
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid layout
  const { toast } = useToast();
  const [location] = useLocation();

  // On mount, check URL for filters
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const filter = params.get("filter");
    
    if (filter === "highest") {
      setValueFilter("above100k");
    } else if (filter === "recent") {
      // We'll handle recent filter in the data filtering
    }
  }, [location]);

  // Fetch proposals with details
  const { data: proposals, isLoading } = useQuery<ProposalWithDetails[]>({
    queryKey: ['/api/proposals-with-details'],
  });

  // Fetch products for filter
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // Delete proposal mutation
  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals-with-details'] });
      toast({
        title: "Proposta removida",
        description: "A proposta foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Não foi possível remover a proposta: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Filter proposals based on selected filters
  const filteredProposals = proposals?.filter(proposal => {
    let matchesProductFilter = true;
    let matchesStatusFilter = true;
    let matchesValueFilter = true;

    if (productFilter !== "all" && proposal.productId) {
      matchesProductFilter = proposal.productId.toString() === productFilter;
    }

    if (statusFilter !== "all" && proposal.status) {
      matchesStatusFilter = proposal.status === statusFilter;
    }

    if (valueFilter !== "all" && proposal.value) {
      const value = Number(proposal.value);
      if (valueFilter === "below50k") {
        matchesValueFilter = value < 50000;
      } else if (valueFilter === "50kTo100k") {
        matchesValueFilter = value >= 50000 && value <= 100000;
      } else if (valueFilter === "above100k") {
        matchesValueFilter = value > 100000;
      }
    }

    return matchesProductFilter && matchesStatusFilter && matchesValueFilter;
  });

  // Handle proposal editing
  const handleEditProposal = (proposal: ProposalWithDetails) => {
    setEditingProposal(proposal);
    setIsFormOpen(true);
  };

  // Handle proposal deletion
  const handleDeleteProposal = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta proposta?")) {
      deleteProposalMutation.mutate(id);
    }
  };

  // Close form and reset editing proposal
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProposal(null);
  };

  // Check if URL has 'recent' filter
  const isRecentFilter = location.includes("filter=recent");
  
  // If 'recent' filter is active, sort by creation date
  const sortedProposalsAll = isRecentFilter && filteredProposals 
    ? [...filteredProposals].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
    : filteredProposals;
    
  // Calcular o número total de páginas
  const totalPages = sortedProposalsAll ? Math.ceil(sortedProposalsAll.length / itemsPerPage) : 0;
  
  // Separar as propostas para a página atual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const sortedProposals = sortedProposalsAll ? sortedProposalsAll.slice(indexOfFirstItem, indexOfLastItem) : [];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-neutral-500">Propostas</h1>
        
        <div className="flex space-x-3">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Todos os Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {products?.map(product => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="em_negociacao">Em Negociação</SelectItem>
              <SelectItem value="aceita">Aceita</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={valueFilter} onValueChange={setValueFilter}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Valor: Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Valor: Todos</SelectItem>
              <SelectItem value="below50k">Até R$ 50.000</SelectItem>
              <SelectItem value="50kTo100k">R$ 50.000 - R$ 100.000</SelectItem>
              <SelectItem value="above100k">Acima de R$ 100.000</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="bg-blue-800 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setIsFormOpen(true)}
          >
            <span className="material-icons mr-1">add</span>
            Nova Proposta
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProposals?.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onEdit={() => handleEditProposal(proposal)}
              onDelete={() => handleDeleteProposal(proposal.id)}
            />
          ))}
          
          {sortedProposals?.length === 0 && (
            <div className="col-span-3 text-center py-10">
              <p className="text-neutral-500">Nenhuma proposta encontrada com os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {sortedProposals && sortedProposals.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => {
                    // Implementar a lógica de paginação correta
                    const prevPage = Math.max(1, currentPage - 1);
                    setCurrentPage(prevPage);
                  }}
                  className={currentPage === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => {
                    // Implementar a lógica de paginação correta
                    const nextPage = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(nextPage);
                  }}
                  className={currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* New/Edit Proposal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>
            {editingProposal ? "Editar Proposta" : "Nova Proposta"}
          </DialogTitle>
          <ProposalForm 
            proposal={editingProposal} 
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}

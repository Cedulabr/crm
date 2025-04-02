import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import StatsCard from "@/components/dashboard/stats-card";
import RecentActivityTable from "@/components/dashboard/recent-activity-table";
import { SalesByProductChart, ProposalsByStatusChart } from "@/components/dashboard/charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type ProposalWithDetails } from "@shared/schema";

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch proposals by status data for pie chart
  const { data: proposalsByStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/dashboard/proposals-by-status'],
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery<ProposalWithDetails[]>({
    queryKey: ['/api/dashboard/recent-activity'],
  });

  return (
    <section id="dashboard" className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-neutral-500">Dashboard</h1>
        <div className="flex space-x-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="thisQuarter">Este trimestre</SelectItem>
              <SelectItem value="thisYear">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <span className="material-icons">file_download</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total de Clientes"
              value={statsData?.totalClients || 0}
              change={12}
              icon="people"
              iconBgColor="bg-primary-light"
              iconColor="text-primary-dark"
            />
            <StatsCard
              title="Propostas Ativas"
              value={statsData?.activeProposals || 0}
              change={8}
              icon="description"
              iconBgColor="bg-secondary-light"
              iconColor="text-secondary-dark"
            />
            <StatsCard
              title="Taxa de Conversão"
              value={`${statsData?.conversionRate || 0}%`}
              change={-3}
              icon="percent"
              iconBgColor="bg-success-light"
              iconColor="text-success-dark"
            />
            <StatsCard
              title="Valor Total (R$)"
              value={statsData?.totalValue?.toLocaleString('pt-BR') || 0}
              change={16}
              icon="monetization_on"
              iconBgColor="bg-primary-light"
              iconColor="text-primary-dark"
            />
          </>
        )}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-neutral-500">Vendas por Produto</CardTitle>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-sm text-neutral-400 hover:text-primary-dark">Diário</Button>
              <Button variant="ghost" size="sm" className="text-sm text-primary-dark font-medium">Semanal</Button>
              <Button variant="ghost" size="sm" className="text-sm text-neutral-400 hover:text-primary-dark">Mensal</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80">
              <SalesByProductChart />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-neutral-500">Propostas por Status</CardTitle>
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-primary-dark">
              <span className="material-icons">more_vert</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {statusLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ProposalsByStatusChart data={proposalsByStatus} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-primary-light mr-2"></div>
                  <span className="text-sm text-neutral-500">Em Negociação</span>
                </div>
                <p className="text-lg font-medium mt-1">
                  {statusLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    `${proposalsByStatus?.emNegociacao || 0} (${
                      calculatePercentage(proposalsByStatus?.emNegociacao, proposalsByStatus)
                    }%)`
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-success-light mr-2"></div>
                  <span className="text-sm text-neutral-500">Aceitas</span>
                </div>
                <p className="text-lg font-medium mt-1">
                  {statusLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    `${proposalsByStatus?.aceitas || 0} (${
                      calculatePercentage(proposalsByStatus?.aceitas, proposalsByStatus)
                    }%)`
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-secondary-light mr-2"></div>
                  <span className="text-sm text-neutral-500">Em Análise</span>
                </div>
                <p className="text-lg font-medium mt-1">
                  {statusLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    `${proposalsByStatus?.emAnalise || 0} (${
                      calculatePercentage(proposalsByStatus?.emAnalise, proposalsByStatus)
                    }%)`
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-error-light mr-2"></div>
                  <span className="text-sm text-neutral-500">Recusadas</span>
                </div>
                <p className="text-lg font-medium mt-1">
                  {statusLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    `${proposalsByStatus?.recusadas || 0} (${
                      calculatePercentage(proposalsByStatus?.recusadas, proposalsByStatus)
                    }%)`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-neutral-500">Atividades Recentes</CardTitle>
          <Button variant="link" className="text-sm text-primary-dark">Ver todas</Button>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <RecentActivityTable activities={recentActivity || []} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// Helper function to calculate percentage
function calculatePercentage(value: number = 0, data: any): number {
  if (!data) return 0;
  
  const total = (data.emNegociacao || 0) + 
                (data.aceitas || 0) + 
                (data.emAnalise || 0) + 
                (data.recusadas || 0);
                
  if (total === 0) return 0;
  
  return Math.round((value / total) * 100);
}

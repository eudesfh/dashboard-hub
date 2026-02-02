import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Loader2, LayoutGrid, FolderKanban } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  dashboardCount: number;
}

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  embed_url: string;
  workspaces: { id: string; name: string }[];
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch workspaces
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          description,
          dashboard_workspaces(count)
        `);

      if (workspacesError) throw workspacesError;

      const formattedWorkspaces = workspacesData?.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        dashboardCount: (w.dashboard_workspaces as any)?.[0]?.count || 0,
      })) || [];

      setWorkspaces(formattedWorkspaces);

      // Fetch dashboards
      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from('dashboards')
        .select(`
          id,
          name,
          description,
          embed_url,
          dashboard_workspaces(
            workspace:workspaces(id, name)
          )
        `);

      if (dashboardsError) throw dashboardsError;

      const formattedDashboards = dashboardsData?.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        embed_url: d.embed_url,
        workspaces: d.dashboard_workspaces
          ?.map((dw: any) => dw.workspace)
          .filter(Boolean) || [],
      })) || [];

      setDashboards(formattedDashboards);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDashboards = selectedWorkspace
    ? dashboards.filter(d => d.workspaces.some(w => w.id === selectedWorkspace))
    : dashboards;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Meus Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize seus painéis de Business Intelligence
          </p>
        </div>

        <Tabs defaultValue="workspaces" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="workspaces" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Todos os Painéis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-6">
            {workspaces.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Nenhum workspace disponível"
                description={isAdmin 
                  ? "Crie um workspace para organizar seus dashboards." 
                  : "Você ainda não foi adicionado a nenhum workspace."}
                actionLabel={isAdmin ? "Criar Workspace" : undefined}
                actionHref={isAdmin ? "/admin/workspaces" : undefined}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace, index) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => setSelectedWorkspace(
                      selectedWorkspace === workspace.id ? null : workspace.id
                    )}
                    isSelected={selectedWorkspace === workspace.id}
                    style={{ animationDelay: `${index * 100}ms` }}
                  />
                ))}
              </div>
            )}

            {selectedWorkspace && (
              <div className="space-y-4 animate-slide-up">
                <h2 className="text-xl font-semibold">
                  Painéis em {workspaces.find(w => w.id === selectedWorkspace)?.name}
                </h2>
                {filteredDashboards.length === 0 ? (
                  <EmptyState
                    icon={LayoutGrid}
                    title="Nenhum painel neste workspace"
                    description="Este workspace ainda não possui painéis configurados."
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDashboards.map((dashboard, index) => (
                      <DashboardCard
                        key={dashboard.id}
                        dashboard={dashboard}
                        style={{ animationDelay: `${index * 100}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {dashboards.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title="Nenhum painel disponível"
                description={isAdmin
                  ? "Adicione seu primeiro painel Power BI."
                  : "Você ainda não tem acesso a nenhum painel."}
                actionLabel={isAdmin ? "Adicionar Painel" : undefined}
                actionHref={isAdmin ? "/admin/dashboards" : undefined}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dashboards.map((dashboard, index) => (
                  <DashboardCard
                    key={dashboard.id}
                    dashboard={dashboard}
                    style={{ animationDelay: `${index * 100}ms` }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3, Plus, Pencil, Trash2, Link2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  embed_url: string;
  created_at: string;
  workspaces: { id: string; name: string }[];
}

interface Workspace {
  id: string;
  name: string;
}

export default function AdminDashboards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    embed_url: '',
    filter_table: '',
    workspaceIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch dashboards
      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from('dashboards')
        .select(`
          id,
          name,
          description,
          embed_url,
          created_at,
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
        created_at: d.created_at,
        workspaces: d.dashboard_workspaces
          ?.map((dw: any) => dw.workspace)
          .filter(Boolean) || [],
      })) || [];

      setDashboards(formattedDashboards);

      // Fetch workspaces
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('id, name');

      if (workspacesError) throw workspacesError;
      setWorkspaces(workspacesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.embed_url.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o nome e a URL do painel.',
      });
      return;
    }

    // Validate URL
    try {
      new URL(formData.embed_url.trim());
    } catch {
      toast({
        variant: 'destructive',
        title: 'URL inválida',
        description: 'Por favor, insira uma URL válida.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedDashboard) {
        // Update dashboard
        const { error: updateError } = await supabase
          .from('dashboards')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            embed_url: formData.embed_url.trim(),
            filter_table: formData.filter_table.trim() || null,
          })
          .eq('id', selectedDashboard.id);

        if (updateError) throw updateError;

        // Update workspace associations
        // First, remove all existing associations
        await supabase
          .from('dashboard_workspaces')
          .delete()
          .eq('dashboard_id', selectedDashboard.id);

        // Then, add new associations
        if (formData.workspaceIds.length > 0) {
          const { error: wsError } = await supabase
            .from('dashboard_workspaces')
            .insert(
              formData.workspaceIds.map(wsId => ({
                dashboard_id: selectedDashboard.id,
                workspace_id: wsId,
              }))
            );

          if (wsError) throw wsError;
        }

        // Update local state
        const updatedWorkspaces = workspaces.filter(ws => 
          formData.workspaceIds.includes(ws.id)
        );

        setDashboards(dashboards.map(d => 
          d.id === selectedDashboard.id 
            ? { 
                ...d, 
                name: formData.name.trim(), 
                description: formData.description.trim() || null,
                embed_url: formData.embed_url.trim(),
                workspaces: updatedWorkspaces,
              }
            : d
        ));

        toast({
          title: 'Painel atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        // Create dashboard
        const { data, error: createError } = await supabase
          .from('dashboards')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            embed_url: formData.embed_url.trim(),
            filter_table: formData.filter_table.trim() || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add workspace associations
        if (formData.workspaceIds.length > 0) {
          const { error: wsError } = await supabase
            .from('dashboard_workspaces')
            .insert(
              formData.workspaceIds.map(wsId => ({
                dashboard_id: data.id,
                workspace_id: wsId,
              }))
            );

          if (wsError) throw wsError;
        }

        const newWorkspaces = workspaces.filter(ws => 
          formData.workspaceIds.includes(ws.id)
        );

        setDashboards([...dashboards, {
          ...data,
          workspaces: newWorkspaces,
        }]);

        toast({
          title: 'Painel criado',
          description: 'O novo painel foi criado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar painel',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDashboard) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', selectedDashboard.id);

      if (error) throw error;

      setDashboards(dashboards.filter(d => d.id !== selectedDashboard.id));

      toast({
        title: 'Painel excluído',
        description: 'O painel foi excluído com sucesso.',
      });

      setIsDeleteDialogOpen(false);
      setSelectedDashboard(null);
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir painel',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setFormData({
      name: dashboard.name,
      description: dashboard.description || '',
      embed_url: dashboard.embed_url,
      filter_table: (dashboard as any).filter_table || '',
      workspaceIds: dashboard.workspaces.map(ws => ws.id),
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedDashboard(null);
    setFormData({ name: '', description: '', embed_url: '', filter_table: '', workspaceIds: [] });
  };

  const toggleWorkspace = (workspaceId: string) => {
    setFormData(prev => ({
      ...prev,
      workspaceIds: prev.workspaceIds.includes(workspaceId)
        ? prev.workspaceIds.filter(id => id !== workspaceId)
        : [...prev.workspaceIds, workspaceId],
    }));
  };

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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Gerenciar Painéis
            </h1>
            <p className="text-muted-foreground mt-1">
              Adicione e gerencie os painéis Power BI
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Painel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {selectedDashboard ? 'Editar Painel' : 'Novo Painel'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedDashboard 
                      ? 'Atualize as informações do painel.' 
                      : 'Adicione um novo painel Power BI.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Painel *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Dashboard de Vendas"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="embed_url">URL de Embed do Power BI *</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="embed_url"
                        value={formData.embed_url}
                        onChange={(e) => setFormData({ ...formData, embed_url: e.target.value })}
                        placeholder="https://app.powerbi.com/view?r=..."
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cole aqui o link público do seu relatório Power BI
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter_table">Tabela de Filtro (Power BI)</Label>
                    <Input
                      id="filter_table"
                      value={formData.filter_table}
                      onChange={(e) => setFormData({ ...formData, filter_table: e.target.value })}
                      placeholder="Ex: fMedicao, Obras"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da tabela do Power BI usada nos filtros de URL (ex: fMedicao/Estado eq 'Ceará')
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o conteúdo deste painel..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Workspaces</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Selecione os workspaces onde este painel ficará disponível
                    </p>
                    {workspaces.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhum workspace disponível. Crie um primeiro.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                        {workspaces.map((ws) => (
                          <label
                            key={ws.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={formData.workspaceIds.includes(ws.id)}
                              onCheckedChange={() => toggleWorkspace(ws.id)}
                            />
                            <span className="text-sm">{ws.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="gradient-primary text-primary-foreground"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {selectedDashboard ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboards Grid */}
        {dashboards.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum painel cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione seu primeiro painel Power BI para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard, index) => (
              <Card 
                key={dashboard.id} 
                className="animate-slide-up transition-all duration-300 hover:shadow-card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg gradient-primary">
                      <BarChart3 className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg line-clamp-1">{dashboard.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(dashboard)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(dashboard)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dashboard.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {dashboard.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.workspaces.length === 0 ? (
                      <Badge variant="outline" className="text-warning border-warning/50">
                        Sem workspace
                      </Badge>
                    ) : (
                      dashboard.workspaces.map((ws) => (
                        <Badge key={ws.id} variant="secondary" className="text-xs">
                          {ws.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir painel?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O painel "{selectedDashboard?.name}" 
                será excluído permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

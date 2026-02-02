import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  dashboardCount: number;
  userCount: number;
}

export default function AdminWorkspaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          description,
          created_at,
          dashboard_workspaces(count),
          user_workspaces(count)
        `);

      if (error) throw error;

      const formattedWorkspaces = data?.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        created_at: w.created_at,
        dashboardCount: (w.dashboard_workspaces as any)?.[0]?.count || 0,
        userCount: (w.user_workspaces as any)?.[0]?.count || 0,
      })) || [];

      setWorkspaces(formattedWorkspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar workspaces',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do workspace.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedWorkspace) {
        // Update
        const { error } = await supabase
          .from('workspaces')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })
          .eq('id', selectedWorkspace.id);

        if (error) throw error;

        setWorkspaces(workspaces.map(w => 
          w.id === selectedWorkspace.id 
            ? { ...w, name: formData.name.trim(), description: formData.description.trim() || null }
            : w
        ));

        toast({
          title: 'Workspace atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        // Create
        const { data, error } = await supabase
          .from('workspaces')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        setWorkspaces([...workspaces, {
          ...data,
          dashboardCount: 0,
          userCount: 0,
        }]);

        toast({
          title: 'Workspace criado',
          description: 'O novo workspace foi criado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar workspace',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkspace) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', selectedWorkspace.id);

      if (error) throw error;

      setWorkspaces(workspaces.filter(w => w.id !== selectedWorkspace.id));

      toast({
        title: 'Workspace excluído',
        description: 'O workspace foi excluído com sucesso.',
      });

      setIsDeleteDialogOpen(false);
      setSelectedWorkspace(null);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir workspace',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedWorkspace(null);
    setFormData({ name: '', description: '' });
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
              Gerenciar Workspaces
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e organize grupos para seus dashboards
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {selectedWorkspace ? 'Editar Workspace' : 'Novo Workspace'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedWorkspace 
                      ? 'Atualize as informações do workspace.' 
                      : 'Crie um novo grupo para organizar seus dashboards.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Financeiro, RH, Vendas..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o propósito deste workspace..."
                      rows={3}
                    />
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
                    {selectedWorkspace ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum workspace criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro workspace para organizar seus dashboards.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace, index) => (
              <Card 
                key={workspace.id} 
                className="animate-slide-up transition-all duration-300 hover:shadow-card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(workspace)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(workspace)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {workspace.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{workspace.dashboardCount} painéis</span>
                    <span>•</span>
                    <span>{workspace.userCount} usuários</span>
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
              <AlertDialogTitle>Excluir workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O workspace "{selectedWorkspace?.name}" 
                será excluído permanentemente, junto com todas as associações de usuários e dashboards.
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

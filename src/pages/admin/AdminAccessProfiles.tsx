import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';

interface AccessProfile {
  id: string;
  name: string;
  description: string | null;
  filter_level: string;
  created_at: string | null;
}

const FILTER_LEVEL_LABELS: Record<string, string> = {
  none: 'Sem filtro (vê tudo)',
  estado: 'Filtra por estado',
  cidade: 'Filtra por estado e cidade',
  obra: 'Filtra por estado, cidade e obra',
};

export default function AdminAccessProfiles() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFilterLevel, setFormFilterLevel] = useState('obra');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_profiles')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching access profiles:', error);
      toast({ variant: 'destructive', title: 'Erro ao carregar perfis de acesso' });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingProfile(null);
    setFormName('');
    setFormDescription('');
    setFormFilterLevel('obra');
    setIsDialogOpen(true);
  };

  const openEdit = (profile: AccessProfile) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormDescription(profile.description || '');
    setFormFilterLevel(profile.filter_level);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsUpdating(true);

    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('access_profiles')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            filter_level: formFilterLevel,
          })
          .eq('id', editingProfile.id);

        if (error) throw error;
        toast({ title: 'Perfil de acesso atualizado' });
      } else {
        const { error } = await supabase
          .from('access_profiles')
          .insert({
            name: formName.trim(),
            description: formDescription.trim() || null,
            filter_level: formFilterLevel,
          });

        if (error) throw error;
        toast({ title: 'Perfil de acesso criado' });
      }

      setIsDialogOpen(false);
      fetchProfiles();
    } catch (error: any) {
      console.error('Error saving access profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar perfil',
        description: error.code === '23505' ? 'Já existe um perfil com esse nome.' : 'Tente novamente.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (profile: AccessProfile) => {
    if (!confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('access_profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;
      toast({ title: 'Perfil de acesso excluído' });
      fetchProfiles();
    } catch (error) {
      console.error('Error deleting access profile:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir perfil' });
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Perfis de Acesso
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os perfis que definem o nível de filtragem dos dashboards
            </p>
          </div>
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Nível de Filtro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {profile.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FILTER_LEVEL_LABELS[profile.filter_level] || profile.filter_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(profile)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(profile)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum perfil de acesso criado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
              <DialogDescription>
                Defina o nome e o nível de filtragem dos dashboards para este perfil.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Diretoria, Engenheiro, Gerente"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição do perfil de acesso"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Nível de Filtro</Label>
                <Select value={formFilterLevel} onValueChange={setFormFilterLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem filtro (vê tudo)</SelectItem>
                    <SelectItem value="estado">Filtra por estado</SelectItem>
                    <SelectItem value="cidade">Filtra por estado e cidade</SelectItem>
                    <SelectItem value="obra">Filtra por estado, cidade e obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={!formName.trim() || isUpdating}
                className="gradient-primary text-primary-foreground"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingProfile ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

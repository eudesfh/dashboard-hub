import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield, UserCheck, UserX, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'user';
  workspaces: { id: string; name: string }[];
}

interface Workspace {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles with their roles and workspaces
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          is_active
        `);

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch user workspaces
      const { data: userWorkspaces, error: uwError } = await supabase
        .from('user_workspaces')
        .select(`
          user_id,
          workspace:workspaces(id, name)
        `);

      if (uwError) throw uwError;

      // Fetch all workspaces
      const { data: allWorkspaces, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name');

      if (wsError) throw wsError;

      setWorkspaces(allWorkspaces || []);

      // Combine data
      const combinedUsers = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userWs = userWorkspaces?.filter(uw => uw.user_id === profile.user_id) || [];
        
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'user') || 'user',
          workspaces: userWs.map((uw: any) => uw.workspace).filter(Boolean),
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.user_id === currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode desativar sua própria conta.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('user_id', user.user_id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === user.user_id 
          ? { ...u, is_active: !u.is_active }
          : u
      ));

      toast({
        title: user.is_active ? 'Usuário desativado' : 'Usuário ativado',
        description: `${user.full_name} foi ${user.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar usuário',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    if (user.user_id === currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode alterar seu próprio papel.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', user.user_id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === user.user_id 
          ? { ...u, role: newRole }
          : u
      ));

      toast({
        title: 'Papel atualizado',
        description: `${user.full_name} agora é ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar papel',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddToWorkspace = async () => {
    if (!selectedUser || !selectedWorkspaceId) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_workspaces')
        .insert({
          user_id: selectedUser.user_id,
          workspace_id: selectedWorkspaceId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Usuário já pertence a este workspace',
          });
          return;
        }
        throw error;
      }

      const workspace = workspaces.find(w => w.id === selectedWorkspaceId);
      
      setUsers(users.map(u => 
        u.user_id === selectedUser.user_id 
          ? { ...u, workspaces: [...u.workspaces, workspace!] }
          : u
      ));

      toast({
        title: 'Usuário adicionado ao workspace',
        description: `${selectedUser.full_name} foi adicionado a ${workspace?.name}.`,
      });

      setIsWorkspaceDialogOpen(false);
      setSelectedWorkspaceId('');
    } catch (error) {
      console.error('Error adding to workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar ao workspace',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveFromWorkspace = async (user: User, workspaceId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_workspaces')
        .delete()
        .eq('user_id', user.user_id)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === user.user_id 
          ? { ...u, workspaces: u.workspaces.filter(w => w.id !== workspaceId) }
          : u
      ));

      toast({
        title: 'Usuário removido do workspace',
      });
    } catch (error) {
      console.error('Error removing from workspace:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover do workspace',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Gerenciar Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o acesso e permissões dos usuários
            </p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{users.length} usuários</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-primary' : ''}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.workspaces.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhum</span>
                        ) : (
                          user.workspaces.map((ws) => (
                            <Badge 
                              key={ws.id} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-destructive/10 hover:border-destructive"
                              onClick={() => handleRemoveFromWorkspace(user, ws.id)}
                              title="Clique para remover"
                            >
                              {ws.name} ×
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_active ? (
                          <UserCheck className="h-4 w-4 text-success" />
                        ) : (
                          <UserX className="h-4 w-4 text-destructive" />
                        )}
                        <span className={user.is_active ? 'text-success' : 'text-destructive'}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsWorkspaceDialogOpen(true);
                          }}
                          disabled={isUpdating}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Workspace
                        </Button>
                        <Button
                          variant={user.role === 'admin' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isUpdating || user.user_id === currentUser?.id}
                        >
                          {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                        </Button>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleActive(user)}
                          disabled={isUpdating || user.user_id === currentUser?.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add to Workspace Dialog */}
        <Dialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar ao Workspace</DialogTitle>
              <DialogDescription>
                Selecione o workspace para adicionar {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workspace</Label>
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces
                      .filter(ws => !selectedUser?.workspaces.some(uw => uw.id === ws.id))
                      .map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWorkspaceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddToWorkspace} 
                disabled={!selectedWorkspaceId || isUpdating}
                className="gradient-primary text-primary-foreground"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

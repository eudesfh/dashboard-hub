import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Loader2, Users, Shield, UserCheck, UserX, Plus, Search, ShieldCheck,
  Pencil, Trash2, KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { LocationFields } from '@/components/register/LocationFields';

interface AccessProfile {
  id: string;
  name: string;
  filter_level: string;
}

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  estado: string | null;
  cidade: string | null;
  obras: string[];
  access_profile_id: string | null;
  access_profile_name: string | null;
  role: 'admin' | 'user';
  workspaces: { id: string; name: string }[];
}

interface Workspace { id: string; name: string }

type EditorState = {
  open: boolean;
  mode: 'create' | 'edit';
  user_id?: string;
  full_name: string;
  email: string;
  password: string;
  estado: string;
  cidade: string;
  obras: string[];
  role: 'admin' | 'user';
  is_active: boolean;
};

const emptyEditor: EditorState = {
  open: false, mode: 'create',
  full_name: '', email: '', password: '',
  estado: '', cidade: '', obras: [], role: 'user', is_active: true,
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [isAccessProfileDialogOpen, setIsAccessProfileDialogOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedAccessProfileId, setSelectedAccessProfileId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user?: User; password: string }>({ open: false, password: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user?: User }>({ open: false });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, is_active, estado, cidade, obra, obras, access_profile_id');
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('user_id, role');
      if (rolesError) throw rolesError;

      const { data: userWorkspaces, error: uwError } = await supabase
        .from('user_workspaces')
        .select(`user_id, workspace:workspaces(id, name)`);
      if (uwError) throw uwError;

      const { data: allWorkspaces, error: wsError } = await supabase.from('workspaces').select('id, name');
      if (wsError) throw wsError;

      const { data: apData, error: apError } = await supabase.from('access_profiles').select('id, name, filter_level');
      if (apError) throw apError;

      setWorkspaces(allWorkspaces || []);
      setAccessProfiles(apData || []);

      const combinedUsers: User[] = (profiles || []).map((profile: any) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        const userWs = userWorkspaces?.filter((uw: any) => uw.user_id === profile.user_id) || [];
        const ap = apData?.find((a) => a.id === profile.access_profile_id);
        const obrasArr: string[] = Array.isArray(profile.obras) && profile.obras.length
          ? profile.obras
          : (profile.obra ? [profile.obra] : []);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          is_active: profile.is_active ?? true,
          estado: profile.estado,
          cidade: profile.cidade,
          obras: obrasArr,
          access_profile_id: profile.access_profile_id,
          access_profile_name: ap?.name || null,
          role: (userRole?.role as 'admin' | 'user') || 'user',
          workspaces: userWs.map((uw: any) => uw.workspace).filter(Boolean),
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ variant: 'destructive', title: 'Erro ao carregar usuários' });
    } finally {
      setIsLoading(false);
    }
  };

  const callAdmin = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleToggleActive = async (user: User) => {
    if (user.user_id === currentUser?.id) {
      toast({ variant: 'destructive', title: 'Você não pode desativar sua própria conta.' });
      return;
    }
    setIsUpdating(true);
    try {
      await callAdmin({ action: 'update', user_id: user.user_id, is_active: !user.is_active });
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, is_active: !u.is_active } : u));
      toast({ title: user.is_active ? 'Usuário desativado' : 'Usuário ativado' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const handleAddToWorkspace = async () => {
    if (!selectedUser || !selectedWorkspaceId) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('user_workspaces').insert({
        user_id: selectedUser.user_id, workspace_id: selectedWorkspaceId,
      });
      if (error) {
        if (error.code === '23505') { toast({ variant: 'destructive', title: 'Usuário já pertence a este workspace' }); return; }
        throw error;
      }
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId);
      setUsers(users.map(u => u.user_id === selectedUser.user_id ? { ...u, workspaces: [...u.workspaces, workspace!] } : u));
      toast({ title: 'Usuário adicionado ao workspace' });
      setIsWorkspaceDialogOpen(false);
      setSelectedWorkspaceId('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const handleRemoveFromWorkspace = async (user: User, workspaceId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('user_workspaces').delete()
        .eq('user_id', user.user_id).eq('workspace_id', workspaceId);
      if (error) throw error;
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, workspaces: u.workspaces.filter(w => w.id !== workspaceId) } : u));
      toast({ title: 'Removido do workspace' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const handleUpdateAccessProfile = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ access_profile_id: selectedAccessProfileId || null })
        .eq('user_id', selectedUser.user_id);
      if (error) throw error;
      const ap = accessProfiles.find(a => a.id === selectedAccessProfileId);
      setUsers(users.map(u => u.user_id === selectedUser.user_id
        ? { ...u, access_profile_id: selectedAccessProfileId || null, access_profile_name: ap?.name || null } : u));
      toast({ title: 'Perfil de acesso atualizado' });
      setIsAccessProfileDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const openCreate = () => setEditor({ ...emptyEditor, open: true, mode: 'create' });
  const openEdit = (u: User) => setEditor({
    open: true, mode: 'edit', user_id: u.user_id,
    full_name: u.full_name, email: u.email, password: '',
    estado: u.estado || '', cidade: u.cidade || '', obras: u.obras,
    role: u.role, is_active: u.is_active,
  });

  const submitEditor = async () => {
    if (!editor.full_name || !editor.email) {
      toast({ variant: 'destructive', title: 'Nome e email são obrigatórios' }); return;
    }
    if (editor.mode === 'create' && editor.password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha deve ter pelo menos 6 caracteres' }); return;
    }
    setIsUpdating(true);
    try {
      if (editor.mode === 'create') {
        await callAdmin({
          action: 'create', email: editor.email, password: editor.password,
          full_name: editor.full_name, estado: editor.estado || null,
          cidade: editor.cidade || null, obras: editor.obras, role: editor.role,
          is_active: editor.is_active,
        });
        toast({ title: 'Usuário criado' });
      } else {
        await callAdmin({
          action: 'update', user_id: editor.user_id,
          full_name: editor.full_name, email: editor.email,
          estado: editor.estado || null, cidade: editor.cidade || null,
          obras: editor.obras, role: editor.role, is_active: editor.is_active,
        });
        toast({ title: 'Usuário atualizado' });
      }
      setEditor(emptyEditor);
      await fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const submitPassword = async () => {
    if (!passwordDialog.user || passwordDialog.password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha deve ter pelo menos 6 caracteres' }); return;
    }
    setIsUpdating(true);
    try {
      await callAdmin({ action: 'set_password', user_id: passwordDialog.user.user_id, password: passwordDialog.password });
      toast({ title: 'Senha alterada com sucesso' });
      setPasswordDialog({ open: false, password: '' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const submitDelete = async () => {
    if (!deleteDialog.user) return;
    setIsUpdating(true);
    try {
      await callAdmin({ action: 'delete', user_id: deleteDialog.user.user_id });
      toast({ title: 'Usuário excluído' });
      setDeleteDialog({ open: false });
      await fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally { setIsUpdating(false); }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gerenciar Usuários</h1>
            <p className="text-muted-foreground mt-1">Crie, edite e gerencie todas as contas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{users.length}</span>
            </div>
            <Button onClick={openCreate} className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Novo usuário
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Perfil de Acesso</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {(user.estado || user.cidade || user.obras.length > 0) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[user.estado, user.cidade].filter(Boolean).join(' / ')}
                          {user.obras.length > 0 && ` • ${user.obras.length} obra${user.obras.length === 1 ? '' : 's'}`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-primary' : ''}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedAccessProfileId(user.access_profile_id || '');
                          setIsAccessProfileDialogOpen(true);
                        }}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {user.access_profile_name || 'Definir'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.workspaces.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhum</span>
                        ) : user.workspaces.map((ws) => (
                          <Badge key={ws.id} variant="outline"
                            className="text-xs cursor-pointer hover:bg-destructive/10 hover:border-destructive"
                            onClick={() => handleRemoveFromWorkspace(user, ws.id)}
                            title="Clique para remover">{ws.name} ×</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_active
                          ? <UserCheck className="h-4 w-4 text-success" />
                          : <UserX className="h-4 w-4 text-destructive" />}
                        <Switch checked={user.is_active}
                          onCheckedChange={() => handleToggleActive(user)}
                          disabled={isUpdating || user.user_id === currentUser?.id} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setIsWorkspaceDialogOpen(true); }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPasswordDialog({ open: true, user, password: '' })} title="Alterar senha">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, user })}
                          disabled={user.user_id === currentUser?.id}
                          className="text-destructive hover:text-destructive" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add to workspace dialog */}
      <Dialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ao Workspace</DialogTitle>
            <DialogDescription>{selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger><SelectValue placeholder="Selecione o workspace" /></SelectTrigger>
            <SelectContent>
              {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkspaceDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddToWorkspace} disabled={isUpdating || !selectedWorkspaceId}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access profile dialog */}
      <Dialog open={isAccessProfileDialogOpen} onOpenChange={setIsAccessProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perfil de Acesso</DialogTitle>
            <DialogDescription>{selectedUser?.full_name}</DialogDescription>
          </DialogHeader>
          <Select value={selectedAccessProfileId} onValueChange={setSelectedAccessProfileId}>
            <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
            <SelectContent>
              {accessProfiles.map(ap => <SelectItem key={ap.id} value={ap.id}>{ap.name} ({ap.filter_level})</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccessProfileDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateAccessProfile} disabled={isUpdating}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor (create/edit) */}
      <Dialog open={editor.open} onOpenChange={(o) => !o && setEditor(emptyEditor)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor.mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editor.full_name} onChange={(e) => setEditor({ ...editor, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editor.email} onChange={(e) => setEditor({ ...editor, email: e.target.value })} />
            </div>
            {editor.mode === 'create' && (
              <div className="space-y-2">
                <Label>Senha (mín. 6 caracteres)</Label>
                <Input type="password" value={editor.password}
                  onChange={(e) => setEditor({ ...editor, password: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={editor.role} onValueChange={(v: 'admin' | 'user') => setEditor({ ...editor, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Conta ativa</Label>
              <Switch checked={editor.is_active}
                onCheckedChange={(c) => setEditor({ ...editor, is_active: c })} />
            </div>
            <LocationFields
              estado={editor.estado}
              cidade={editor.cidade}
              obras={editor.obras}
              onEstadoChange={(v) => setEditor({ ...editor, estado: v })}
              onCidadeChange={(v) => setEditor({ ...editor, cidade: v })}
              onObrasChange={(v) => setEditor({ ...editor, obras: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(emptyEditor)}>Cancelar</Button>
            <Button onClick={submitEditor} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editor.mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(o) => !o && setPasswordDialog({ open: false, password: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>{passwordDialog.user?.full_name} ({passwordDialog.user?.email})</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nova senha (mín. 6 caracteres)</Label>
            <Input type="password" value={passwordDialog.password}
              onChange={(e) => setPasswordDialog({ ...passwordDialog, password: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, password: '' })}>Cancelar</Button>
            <Button onClick={submitPassword} disabled={isUpdating}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. {deleteDialog.user?.full_name} ({deleteDialog.user?.email}) perderá o acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={isUpdating}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

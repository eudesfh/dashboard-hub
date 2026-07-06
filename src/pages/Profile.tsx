import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, MapPin } from 'lucide-react';

export default function Profile() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'A senha deve ter ao menos 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'As senhas não coincidem' });
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Senha alterada com sucesso!' });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({ variant: 'destructive', title: 'Erro ao alterar senha', description: (error as Error).message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Suas informações e segurança da conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            <CardDescription>
              {profile?.full_name} • {profile?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <p className="text-sm font-medium mt-1">{profile?.estado || '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cidade</Label>
                <p className="text-sm font-medium mt-1">{profile?.cidade || '—'}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Obras liberadas ({profile?.obras?.length ?? 0})
              </Label>
              {profile?.obras && profile.obras.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-muted/40 rounded-lg border border-dashed">
                  {profile.obras.map((o) => (
                    <Badge key={o} variant="secondary" className="text-xs">
                      {o}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Nenhuma obra atribuída.</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Apenas o administrador pode alterar suas obras. Entre em contato caso precise de ajustes.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Alterar Senha
            </CardTitle>
            <CardDescription>Escolha uma nova senha de acesso à sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isSavingPassword || !newPassword || !confirmPassword}
              className="w-full gradient-primary text-primary-foreground"
            >
              {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

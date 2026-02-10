import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationFields } from '@/components/register/LocationFields';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [estado, setEstado] = useState(profile?.estado || '');
  const [cidade, setCidade] = useState(profile?.cidade || '');
  const [obra, setObra] = useState(profile?.obra || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          estado: estado || null,
          cidade: cidade || null,
          obra: obra || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar perfil' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Atualize sua localização e obra</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            <CardDescription>
              {profile?.full_name} • {profile?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationFields
              estado={estado}
              cidade={cidade}
              obra={obra}
              onEstadoChange={setEstado}
              onCidadeChange={setCidade}
              onObraChange={setObra}
            />

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gradient-primary text-primary-foreground"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

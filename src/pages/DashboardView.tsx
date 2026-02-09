import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Maximize2 } from 'lucide-react';

interface DashboardData {
  id: string;
  name: string;
  description: string | null;
  embed_url: string;
}

function buildFilteredUrl(baseUrl: string, profile: any): string {
  if (!profile?.access_profile) return baseUrl;

  const { filter_level } = profile.access_profile;
  if (filter_level === 'none') return baseUrl;

  const filters: string[] = [];

  if (profile.estado && ['estado', 'cidade', 'obra'].includes(filter_level)) {
    filters.push(`Obras/Estado eq '${profile.estado}'`);
  }
  if (profile.cidade && ['cidade', 'obra'].includes(filter_level)) {
    filters.push(`Obras/Cidade eq '${profile.cidade}'`);
  }
  if (profile.obra && filter_level === 'obra') {
    filters.push(`Obras/NomeDaObra eq '${profile.obra}'`);
  }

  if (filters.length === 0) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}filter=${filters.join(' and ')}`;
}

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDashboard();
    }
  }, [id]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('id, name, description, embed_url')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        navigate('/dashboard');
        return;
      }

      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUrl = useMemo(() => {
    if (!dashboard) return '';
    return buildFilteredUrl(dashboard.embed_url, profile);
  }, [dashboard, profile]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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

  if (!dashboard) {
    return null;
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            onClick={toggleFullscreen}
            className="shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair da tela cheia
          </Button>
        </div>
        <iframe
          src={filteredUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title={dashboard.name}
        />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {dashboard.name}
              </h1>
              {dashboard.description && (
                <p className="text-muted-foreground mt-1">
                  {dashboard.description}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={toggleFullscreen}
            className="flex items-center gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Tela cheia
          </Button>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-border shadow-card bg-card">
          <div className="aspect-video w-full">
            <iframe
              src={filteredUrl}
              className="w-full h-full border-0"
              allowFullScreen
              title={dashboard.name}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

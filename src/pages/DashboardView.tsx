import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Maximize2, Filter, X, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  id: string;
  name: string;
  description: string | null;
  embed_url: string;
  filter_table: string | null;
  filter_mode: 'native' | 'page';
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const ANOS = Array.from({ length: 2026 - 2022 + 1 }, (_, i) => 2022 + i);

function escapeOData(v: string) {
  return v.replace(/'/g, "''");
}

function buildNativeFilteredUrl(baseUrl: string, profile: any, filterTable: string | null): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  let url = `${baseUrl}${separator}filterPaneEnabled=false`;

  if (!profile?.access_profile || !filterTable) return url;

  const { filter_level } = profile.access_profile;
  if (filter_level === 'none') return url;

  const filters: string[] = [];

  if (filter_level === 'obra') {
    const obras: string[] = (profile.obras && profile.obras.length ? profile.obras : (profile.obra ? [profile.obra] : []));
    if (obras.length === 1) {
      filters.push(`${filterTable}/Nome_x0020_Obra eq '${escapeOData(obras[0])}'`);
    } else if (obras.length > 1) {
      const list = obras.map((o) => `'${escapeOData(o)}'`).join(', ');
      filters.push(`${filterTable}/Nome_x0020_Obra in (${list})`);
    }
  }

  if (filters.length === 0) return url;
  return `${url}&filter=${encodeURIComponent(filters.join(' and ')).replace(/%2F/g, '/')}`;
}

function buildPageFilteredUrl(
  baseUrl: string,
  obras: string[],
  meses: string[],
  anos: number[],
): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  let url = `${baseUrl}${separator}filterPaneEnabled=false`;

  const filters: string[] = [];
  if (obras.length === 1) {
    filters.push(`dObrasCadastradas/Nome_x0020_Obra eq '${escapeOData(obras[0])}'`);
  } else if (obras.length > 1) {
    const list = obras.map((o) => `'${escapeOData(o)}'`).join(', ');
    filters.push(`dObrasCadastradas/Nome_x0020_Obra in (${list})`);
  }
  if (meses.length === 1) {
    filters.push(`dCalendario/MesAbrev eq '${escapeOData(meses[0].toLowerCase())}'`);
  } else if (meses.length > 1) {
    const list = meses.map((m) => `'${escapeOData(m.toLowerCase())}'`).join(', ');
    filters.push(`dCalendario/MesAbrev in (${list})`);
  }
  if (anos.length === 1) {
    filters.push(`dCalendario/Ano eq ${anos[0]}`);
  } else if (anos.length > 1) {
    filters.push(`dCalendario/Ano in (${anos.join(', ')})`);
  }

  if (filters.length === 0) return url;
  return `${url}&filter=${encodeURIComponent(filters.join(' and ')).replace(/%2F/g, '/')}`;
}

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Page filter state
  const [selectedObras, setSelectedObras] = useState<string[]>([]);
  const [selectedMeses, setSelectedMeses] = useState<string[]>([]);
  const [selectedAnos, setSelectedAnos] = useState<number[]>([]);
  const [obraSearch, setObraSearch] = useState('');

  const userObras: string[] = useMemo(
    () => (profile?.obras && profile.obras.length ? profile.obras : (profile?.obra ? [profile.obra] : [])),
    [profile],
  );

  const filteredUserObras = useMemo(() => {
    return userObras.filter((o) => o.toLowerCase().includes(obraSearch.toLowerCase()));
  }, [userObras, obraSearch]);

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
        .select('id, name, description, embed_url, filter_table, filter_mode')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        navigate('/dashboard');
        return;
      }

      setDashboard(data as DashboardData);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUrl = useMemo(() => {
    if (!dashboard) return '';
    if (dashboard.filter_mode === 'page') {
      return buildPageFilteredUrl(dashboard.embed_url, selectedObras, selectedMeses, selectedAnos);
    }
    return buildNativeFilteredUrl(dashboard.embed_url, profile, dashboard.filter_table);
  }, [dashboard, profile, selectedObras, selectedMeses, selectedAnos]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const selectSingleObra = (o: string) => {
    setSelectedObras(selectedObras.includes(o) ? [] : [o]);
  };

  const selectSingleMês = (m: string) => {
    setSelectedMeses(selectedMeses.includes(m) ? [] : [m]);
  };

  const selectSingleAno = (a: number) => {
    setSelectedAnos(selectedAnos.includes(a) ? [] : [a]);
  };

  const clearAll = () => {
    setSelectedObras([]);
    setSelectedMeses([]);
    setSelectedAnos([]);
    setObraSearch('');
  };

  const totalFilters = selectedObras.length + selectedMeses.length + selectedAnos.length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboard) return null;

  const PageFilters = dashboard.filter_mode === 'page' ? (
    <div className="flex flex-wrap items-center gap-2">
      {/* Obras */}
      <Popover onOpenChange={(open) => !open && setObraSearch('')}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 max-w-[240px] truncate shadow-sm">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {selectedObras.length > 0 ? `Obra: ${selectedObras[0]}` : 'Obra'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-68 p-3 flex flex-col gap-2 max-h-80">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar obra..."
              value={obraSearch}
              onChange={(e) => setObraSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1 mt-1 pr-1 max-h-48">
            {filteredUserObras.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma obra encontrada.</p>
            ) : (
              filteredUserObras.map((o) => (
                <label 
                  key={o} 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                >
                  <Checkbox
                    checked={selectedObras.includes(o)}
                    onCheckedChange={() => selectSingleObra(o)}
                  />
                  <span className="text-xs text-foreground font-medium line-clamp-2">{o}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Mês */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 max-w-[160px] truncate shadow-sm">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {selectedMeses.length > 0 ? `Mês: ${selectedMeses[0]}` : 'Mês'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-3 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {MESES.map((m) => (
              <label 
                key={m} 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
              >
                <Checkbox
                  checked={selectedMeses.includes(m)}
                  onCheckedChange={() => selectSingleMês(m)}
                />
                <span className="text-xs font-medium text-foreground">{m}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Ano */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 max-w-[120px] truncate shadow-sm">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {selectedAnos.length > 0 ? `Ano: ${selectedAnos[0]}` : 'Ano'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-40 p-3 max-h-72 overflow-y-auto">
          <div className="space-y-1.5">
            {ANOS.map((a) => (
              <label 
                key={a} 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
              >
                <Checkbox
                  checked={selectedAnos.includes(a)}
                  onCheckedChange={() => selectSingleAno(a)}
                />
                <span className="text-xs font-medium text-foreground">{a}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {totalFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  ) : null;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center gap-3 p-3 border-b bg-card">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair da tela cheia
          </Button>
          {PageFilters}
        </div>
        <iframe
          src={filteredUrl}
          className="flex-1 w-full border-0"
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-muted-foreground mt-1">{dashboard.description}</p>
              )}
            </div>
          </div>

          <Button variant="outline" onClick={toggleFullscreen} className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4" />
            Tela cheia
          </Button>
        </div>

        {PageFilters && (
          <div className="rounded-lg border bg-card p-3">{PageFilters}</div>
        )}

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

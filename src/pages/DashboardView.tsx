import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Maximize2, Filter, X, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PowerBIEmbed } from 'powerbi-client-react';
import { models } from 'powerbi-client';

interface DashboardData {
  id: string;
  name: string;
  description: string | null;
  embed_url: string;
  filter_table: string | null;
  filter_mode: 'native' | 'page';
  workspace_id: string | null;
  report_id: string | null;
}

interface EmbedInfo {
  embedUrl: string;
  embedToken: string;
  reportId: string;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const ANOS = Array.from({ length: 2026 - 2022 + 1 }, (_, i) => 2022 + i);

function escapeOData(v: string) {
  return v.replace(/'/g, "''");
}

// Legacy: build URL for old public embed (kept for backward compat)
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
    filters.push(`dCalendario/MesNome eq '${escapeOData(meses[0].toLowerCase())}'`);
  } else if (meses.length > 1) {
    const list = meses.map((m) => `'${escapeOData(m.toLowerCase())}'`).join(', ');
    filters.push(`dCalendario/MesNome in (${list})`);
  }
  if (anos.length === 1) {
    filters.push(`dCalendario/Ano eq ${anos[0]}`);
  } else if (anos.length > 1) {
    filters.push(`dCalendario/Ano in (${anos.join(', ')})`);
  }
  if (filters.length === 0) return url;
  return `${url}&filter=${encodeURIComponent(filters.join(' and ')).replace(/%2F/g, '/')}`;
}

// Build powerbi-client filter objects for SDK embed
function buildBasicFilter(
  table: string,
  column: string,
  values: (string | number)[],
): models.IBasicFilter {
  return {
    $schema: 'http://powerbi.com/product/schema#basic',
    target: { table, column },
    operator: 'In',
    values,
    filterType: models.FilterType.Basic,
    requireSingleSelection: false,
  };
}

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedInfo, setEmbedInfo] = useState<EmbedInfo | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const reportRef = useRef<any>(null);

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

  const useServicePrincipal = !!(dashboard?.workspace_id && dashboard?.report_id);

  useEffect(() => {
    if (id) fetchDashboard();
  }, [id]);

  useEffect(() => {
    if (dashboard && useServicePrincipal) {
      fetchEmbedToken(dashboard.id);
    }
  }, [dashboard, useServicePrincipal]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('id, name, description, embed_url, filter_table, filter_mode, workspace_id, report_id')
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

  const fetchEmbedToken = async (dashboardId: string) => {
    setEmbedError(null);
    try {
      const { data, error } = await supabase.functions.invoke('powerbi-embed-token', {
        body: { dashboardId },
      });
      if (error) {
        const details = (error as any)?.context
          ? await (error as any).context.text().catch(() => (error as Error).message)
          : (error as Error).message;
        console.error('embed-token failed:', details);
        setEmbedError(String(details));
        return;
      }
      setEmbedInfo(data as EmbedInfo);
    } catch (e) {
      console.error(e);
      setEmbedError((e as Error).message);
    }
  };

  // Legacy iframe URL (only used when no Service Principal)
  const legacyFilteredUrl = useMemo(() => {
    if (!dashboard) return '';
    if (dashboard.filter_mode === 'page') {
      return buildPageFilteredUrl(dashboard.embed_url, selectedObras, selectedMeses, selectedAnos);
    }
    return buildNativeFilteredUrl(dashboard.embed_url, profile, dashboard.filter_table);
  }, [dashboard, profile, selectedObras, selectedMeses, selectedAnos]);

  // Filters for SDK embed (Service Principal path)
  const sdkFilters = useMemo<models.IBasicFilter[]>(() => {
    if (!dashboard) return [];
    const filters: models.IBasicFilter[] = [];

    if (dashboard.filter_mode === 'page') {
      if (selectedObras.length > 0) {
        filters.push(buildBasicFilter('dObrasCadastradas', 'Nome Obra', selectedObras));
      }
      if (selectedMeses.length > 0) {
        filters.push(buildBasicFilter('dCalendario', 'MesNome', selectedMeses.map((m) => m.toLowerCase())));
      }
      if (selectedAnos.length > 0) {
        filters.push(buildBasicFilter('dCalendario', 'Ano', selectedAnos));
      }
    } else if (dashboard.filter_table && profile?.access_profile?.filter_level === 'obra') {
      const obras = profile?.obras?.length ? profile.obras : (profile?.obra ? [profile.obra] : []);
      if (obras.length > 0) {
        filters.push(buildBasicFilter(dashboard.filter_table, 'Nome Obra', obras));
      }
    }

    return filters;
  }, [dashboard, profile, selectedObras, selectedMeses, selectedAnos]);

  // Apply filters to embedded report when they change
  useEffect(() => {
    const report = reportRef.current;
    if (report && useServicePrincipal) {
      report.setFilters(sdkFilters).catch((err: any) => console.error('setFilters error:', err));
    }
  }, [sdkFilters, useServicePrincipal]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const selectSingleObra = (o: string) => setSelectedObras(selectedObras.includes(o) ? [] : [o]);
  const selectSingleMes = (m: string) => setSelectedMeses(selectedMeses.includes(m) ? [] : [m]);
  const selectSingleAno = (a: number) => setSelectedAnos(selectedAnos.includes(a) ? [] : [a]);

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
                <label key={o} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors">
                  <Checkbox checked={selectedObras.includes(o)} onCheckedChange={() => selectSingleObra(o)} />
                  <span className="text-xs text-foreground font-medium line-clamp-2">{o}</span>
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

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
              <label key={m} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors">
                <Checkbox checked={selectedMeses.includes(m)} onCheckedChange={() => selectSingleMes(m)} />
                <span className="text-xs font-medium text-foreground">{m}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

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
              <label key={a} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors">
                <Checkbox checked={selectedAnos.includes(a)} onCheckedChange={() => selectSingleAno(a)} />
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

  const needsObraSelection = dashboard.filter_mode === 'page' && selectedObras.length === 0;

  const renderEmbed = () => {
    if (needsObraSelection) {
      return (
        <div className="flex items-center justify-center h-full p-8 text-center bg-muted/30">
          <div className="max-w-md space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Filter className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Escolha uma obra no filtro</h3>
            <p className="text-sm text-muted-foreground">
              Selecione ao menos uma obra acima para carregar o painel com seus dados.
            </p>
          </div>
        </div>
      );
    }
    if (useServicePrincipal) {
      if (embedError) {
        return (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-lg space-y-2">
              <p className="text-sm font-medium text-destructive">Erro ao carregar o relatório</p>
              <p className="text-xs text-muted-foreground break-all">{embedError}</p>
            </div>
          </div>
        );
      }
      if (!embedInfo) {
        return (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        );
      }
      return (
        <PowerBIEmbed
          embedConfig={{
            type: 'report',
            id: embedInfo.reportId,
            embedUrl: embedInfo.embedUrl,
            accessToken: embedInfo.embedToken,
            tokenType: models.TokenType.Embed,
            filters: sdkFilters,
            settings: {
              panes: {
                filters: { visible: false, expanded: false },
                pageNavigation: { visible: true },
              },
              background: models.BackgroundType.Default,
            },
          }}
          eventHandlers={new Map([
            ['loaded', () => console.log('Power BI report loaded')],
            ['rendered', () => console.log('Power BI report rendered')],
            ['error', (event: any) => console.error('Power BI error:', event?.detail)],
          ])}
          cssClassName="w-full h-full"
          getEmbeddedComponent={(embedded) => {
            reportRef.current = embedded;
          }}
        />
      );
    }
    return (
      <iframe
        src={legacyFilteredUrl}
        className="w-full h-full border-0"
        allowFullScreen
        title={dashboard.name}
      />
    );
  };

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
        <div className="flex-1">
          {renderEmbed()}
        </div>
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
            {renderEmbed()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

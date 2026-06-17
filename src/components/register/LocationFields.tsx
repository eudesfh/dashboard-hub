import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import locationsData from '@/data/locations.json';

interface LocationFieldsProps {
  estado: string;
  cidade: string;
  obras: string[];
  onEstadoChange: (value: string) => void;
  onCidadeChange: (value: string) => void;
  onObrasChange: (value: string[]) => void;
}

export function LocationFields({
  estado,
  cidade,
  obras,
  onEstadoChange,
  onCidadeChange,
  onObrasChange,
}: LocationFieldsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Get all unique states
  const estados = useMemo(() => {
    return locationsData.estados.map((e) => e.nome);
  }, []);

  // Get cities based on selected state
  const cidades = useMemo(() => {
    if (!estado) return [];
    const found = locationsData.estados.find((e) => e.nome === estado);
    return found ? found.cidades.map((c) => c.nome) : [];
  }, [estado]);

  // Flatten all works with their state and city info
  const allObras = useMemo(() => {
    const list: { name: string; estado: string; cidade: string }[] = [];
    locationsData.estados.forEach((e) => {
      e.cidades.forEach((c) => {
        c.obras.forEach((o) => {
          list.push({ name: o, estado: e.nome, cidade: c.nome });
        });
      });
    });
    // Remove duplicates and sort alphabetically
    return list.filter((item, index, self) =>
      self.findIndex((t) => t.name === item.name) === index
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter works based on state, city and search query
  const filteredObras = useMemo(() => {
    return allObras.filter((obra) => {
      const matchEstado = !estado || obra.estado === estado;
      const matchCidade = !cidade || obra.cidade === cidade;
      const matchSearch = !searchQuery || obra.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEstado && matchCidade && matchSearch;
    });
  }, [allObras, estado, cidade, searchQuery]);

  const handleEstadoChange = (value: string) => {
    const nextEstado = value === 'all' ? '' : value;
    onEstadoChange(nextEstado);
    onCidadeChange(''); // Reset city when state changes
  };

  const handleCidadeChange = (value: string) => {
    const nextCidade = value === 'all' ? '' : value;
    onCidadeChange(nextCidade);
  };

  const toggleObra = (obraName: string, checked: boolean) => {
    if (checked) {
      if (!obras.includes(obraName)) {
        onObrasChange([...obras, obraName]);
      }
    } else {
      onObrasChange(obras.filter((o) => o !== obraName));
    }
  };

  const removeObra = (obraName: string) => {
    onObrasChange(obras.filter((o) => o !== obraName));
  };

  const clearFilters = () => {
    onEstadoChange('');
    onCidadeChange('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* State Filter */}
      <div className="space-y-2">
        <Label htmlFor="estado">Estado (Filtro opcional)</Label>
        <Select value={estado || 'all'} onValueChange={handleEstadoChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {estados.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Filter */}
      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade (Filtro opcional)</Label>
        <Select 
          value={cidade || 'all'} 
          onValueChange={handleCidadeChange} 
          disabled={!estado}
        >
          <SelectTrigger>
            <SelectValue placeholder={estado ? 'Todas as cidades' : 'Selecione o estado primeiro'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cidades.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Works Badges */}
      {obras.length > 0 && (
        <div className="space-y-2">
          <Label>Obras selecionadas ({obras.length})</Label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded-lg border border-dashed">
            {obras.map((o) => (
              <Badge key={o} variant="secondary" className="gap-1 pr-1 py-1 text-xs">
                <span className="line-clamp-1 max-w-[200px]">{o}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-3.5 w-3.5 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  onClick={() => removeObra(o)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Works Selection Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Selecione as Obras</Label>
          {(estado || cidade || searchQuery) && (
            <Button
              type="button"
              variant="link"
              onClick={clearFilters}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar obra por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Scrollable Checkbox List */}
        <div className="rounded-md border border-border bg-background p-3 space-y-2 max-h-48 overflow-y-auto">
          {filteredObras.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">
              Nenhuma obra encontrada para os filtros atuais.
            </p>
          ) : (
            filteredObras.map((obra) => (
              <label 
                key={obra.name} 
                className="flex items-start gap-2.5 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm transition-colors"
              >
                <Checkbox
                  checked={obras.includes(obra.name)}
                  onCheckedChange={(checked) => toggleObra(obra.name, Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{obra.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {obra.estado} • {obra.cidade}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

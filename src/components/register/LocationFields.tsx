import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  const estados = locationsData.estados.map((e) => e.nome);

  const cidades = useMemo(() => {
    if (!estado) return [];
    const found = locationsData.estados.find((e) => e.nome === estado);
    return found ? found.cidades.map((c) => c.nome) : [];
  }, [estado]);

  const obrasDisponiveis = useMemo(() => {
    if (!estado || !cidade) return [];
    const foundEstado = locationsData.estados.find((e) => e.nome === estado);
    if (!foundEstado) return [];
    const foundCidade = foundEstado.cidades.find((c) => c.nome === cidade);
    return foundCidade ? foundCidade.obras : [];
  }, [estado, cidade]);

  const handleEstadoChange = (value: string) => {
    onEstadoChange(value);
    onCidadeChange('');
    onObrasChange([]);
  };

  const handleCidadeChange = (value: string) => {
    onCidadeChange(value);
    onObrasChange([]);
  };

  const toggleObra = (obra: string, checked: boolean) => {
    if (checked) onObrasChange([...obras, obra]);
    else onObrasChange(obras.filter((o) => o !== obra));
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="estado">Estado</Label>
        <Select value={estado} onValueChange={handleEstadoChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {estados.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Select value={cidade} onValueChange={handleCidadeChange} disabled={!estado}>
          <SelectTrigger>
            <SelectValue placeholder={estado ? 'Selecione a cidade' : 'Selecione o estado primeiro'} />
          </SelectTrigger>
          <SelectContent>
            {cidades.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Obras ({obras.length} selecionada{obras.length === 1 ? '' : 's'})</Label>
        <div className="rounded-md border border-border bg-background p-3 space-y-2 max-h-48 overflow-y-auto">
          {!cidade && (
            <p className="text-sm text-muted-foreground">Selecione a cidade primeiro</p>
          )}
          {cidade && obrasDisponiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma obra disponível</p>
          )}
          {obrasDisponiveis.map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={obras.includes(o)}
                onCheckedChange={(c) => toggleObra(o, Boolean(c))}
              />
              {o}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

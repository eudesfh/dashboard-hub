import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
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
  obra: string;
  onEstadoChange: (value: string) => void;
  onCidadeChange: (value: string) => void;
  onObraChange: (value: string) => void;
}

export function LocationFields({
  estado,
  cidade,
  obra,
  onEstadoChange,
  onCidadeChange,
  onObraChange,
}: LocationFieldsProps) {
  const estados = locationsData.estados.map((e) => e.nome);

  const cidades = useMemo(() => {
    if (!estado) return [];
    const found = locationsData.estados.find((e) => e.nome === estado);
    return found ? found.cidades.map((c) => c.nome) : [];
  }, [estado]);

  const obras = useMemo(() => {
    if (!estado || !cidade) return [];
    const foundEstado = locationsData.estados.find((e) => e.nome === estado);
    if (!foundEstado) return [];
    const foundCidade = foundEstado.cidades.find((c) => c.nome === cidade);
    return foundCidade ? foundCidade.obras : [];
  }, [estado, cidade]);

  const handleEstadoChange = (value: string) => {
    onEstadoChange(value);
    onCidadeChange('');
    onObraChange('');
  };

  const handleCidadeChange = (value: string) => {
    onCidadeChange(value);
    onObraChange('');
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="estado">Estado</Label>
        <Select value={estado} onValueChange={handleEstadoChange}>
          <SelectTrigger className="transition-smooth focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {estados.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Select value={cidade} onValueChange={handleCidadeChange} disabled={!estado}>
          <SelectTrigger className="transition-smooth focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder={estado ? 'Selecione a cidade' : 'Selecione o estado primeiro'} />
          </SelectTrigger>
          <SelectContent>
            {cidades.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obra">Obra</Label>
        <Select value={obra} onValueChange={onObraChange} disabled={!cidade}>
          <SelectTrigger className="transition-smooth focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder={cidade ? 'Selecione a obra' : 'Selecione a cidade primeiro'} />
          </SelectTrigger>
          <SelectContent>
            {obras.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

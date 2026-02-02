import { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    dashboardCount: number;
  };
  onClick: () => void;
  isSelected: boolean;
  style?: CSSProperties;
}

export function WorkspaceCard({ workspace, onClick, isSelected, style }: WorkspaceCardProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-slide-up',
        isSelected && 'ring-2 ring-primary shadow-card-hover'
      )}
      onClick={onClick}
      style={style}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {workspace.name}
          </CardTitle>
        </div>
        <ChevronRight className={cn(
          'h-5 w-5 text-muted-foreground transition-transform duration-200',
          isSelected && 'rotate-90 text-primary'
        )} />
      </CardHeader>
      <CardContent>
        {workspace.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {workspace.description}
          </p>
        )}
        <Badge variant="secondary" className="bg-muted">
          {workspace.dashboardCount} {workspace.dashboardCount === 1 ? 'painel' : 'painéis'}
        </Badge>
      </CardContent>
    </Card>
  );
}

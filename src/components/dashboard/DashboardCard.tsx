import { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight } from 'lucide-react';

interface DashboardCardProps {
  dashboard: {
    id: string;
    name: string;
    description: string | null;
    workspaces: { id: string; name: string }[];
  };
  style?: CSSProperties;
}

export function DashboardCard({ dashboard, style }: DashboardCardProps) {
  return (
    <Card 
      className="transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-slide-up group"
      style={style}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg gradient-primary shrink-0">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {dashboard.name}
            </CardTitle>
            {dashboard.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {dashboard.workspaces.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dashboard.workspaces.slice(0, 3).map((workspace) => (
              <Badge 
                key={workspace.id} 
                variant="outline" 
                className="text-xs bg-muted/50"
              >
                {workspace.name}
              </Badge>
            ))}
            {dashboard.workspaces.length > 3 && (
              <Badge variant="outline" className="text-xs bg-muted/50">
                +{dashboard.workspaces.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <Link to={`/dashboard/${dashboard.id}`}>
          <Button className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-smooth group/btn">
            Visualizar
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

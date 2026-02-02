import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ArrowRight, Shield, Users, BarChart3 } from 'lucide-react';
import logo from '@/assets/logo.jfif';

export default function Index() {
  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
      
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-10 w-auto rounded-lg shadow-md"
            />
            <span className="font-display font-semibold text-xl text-primary-foreground">
              BI Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg">
                Criar Conta
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-primary-foreground/20">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="text-sm text-primary-foreground/90">
              Portal de Business Intelligence
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            Seus dashboards Power BI
            <br />
            <span className="text-accent">em um só lugar</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10">
            Centralize seus relatórios e painéis de BI. Economize com licenças Microsoft 
            compartilhando dashboards públicos de forma organizada e segura.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/25 text-lg px-8 group"
              >
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8"
              >
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="p-3 rounded-xl bg-accent/20 w-fit mb-4">
              <LayoutDashboard className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-primary-foreground mb-2">
              Dashboards Organizados
            </h3>
            <p className="text-primary-foreground/60 text-sm">
              Organize seus painéis em workspaces e tenha fácil acesso a todos os seus relatórios.
            </p>
          </div>

          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="p-3 rounded-xl bg-accent/20 w-fit mb-4">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-primary-foreground mb-2">
              Controle de Acesso
            </h3>
            <p className="text-primary-foreground/60 text-sm">
              Gerencie quem pode ver cada painel com um sistema de permissões simples e eficiente.
            </p>
          </div>

          <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="p-3 rounded-xl bg-accent/20 w-fit mb-4">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-primary-foreground mb-2">
              Economize Licenças
            </h3>
            <p className="text-primary-foreground/60 text-sm">
              Use links públicos do Power BI e economize com licenças Microsoft sem perder a segurança.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-4 py-6 border-t border-primary-foreground/10">
        <p className="text-center text-primary-foreground/40 text-sm">
          © 2024 BI Portal. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

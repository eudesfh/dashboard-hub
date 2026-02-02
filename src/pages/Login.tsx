import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, LayoutDashboard } from 'lucide-react';
import logo from '@/assets/logo.jfif';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Credenciais inválidas',
            description: 'Email ou senha incorretos. Tente novamente.',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            variant: 'destructive',
            title: 'Email não confirmado',
            description: 'Por favor, verifique seu email para confirmar sua conta.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao fazer login',
            description: error.message,
          });
        }
        return;
      }

      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo de volta.',
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      <Card className="w-full max-w-md glass-card animate-scale-in relative z-10">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center justify-center gap-3">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-12 w-auto rounded-lg shadow-md"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-display">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Acesse sua conta para visualizar seus dashboards
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-smooth focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 transition-smooth focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-smooth"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Não tem uma conta?{' '}
              <Link 
                to="/register" 
                className="text-primary hover:underline font-medium transition-colors"
              >
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

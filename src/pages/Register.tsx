import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { LocationFields } from '@/components/register/LocationFields';
import logo from '@/assets/logo.jfif';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [obra, setObra] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas não conferem',
        description: 'Por favor, verifique se as senhas são iguais.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            variant: 'destructive',
            title: 'Email já cadastrado',
            description: 'Este email já está sendo utilizado. Tente fazer login.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao criar conta',
            description: error.message,
          });
        }
        return;
      }

      // Update profile with location data after signup
      if (signUpData.user) {
        // Small delay to let the trigger create the profile first
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await supabase
          .from('profiles')
          .update({
            estado: estado || null,
            cidade: cidade || null,
            obra: obra || null,
          })
          .eq('user_id', signUpData.user.id);
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Verifique seu email para confirmar sua conta.',
      });
      
      navigate('/login');
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
            <CardTitle className="text-2xl font-display">Criar conta</CardTitle>
            <CardDescription>
              Cadastre-se para acessar os dashboards
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="transition-smooth focus:ring-2 focus:ring-primary/20"
              />
            </div>

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

            <LocationFields
              estado={estado}
              cidade={cidade}
              obra={obra}
              onEstadoChange={setEstado}
              onCidadeChange={setCidade}
              onObraChange={setObra}
            />

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
                  minLength={6}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="transition-smooth focus:ring-2 focus:ring-primary/20"
              />
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
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar conta
                </>
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:underline font-medium transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

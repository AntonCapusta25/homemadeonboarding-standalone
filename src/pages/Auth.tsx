import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, ChefHat, ArrowRight } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn, role } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, role, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({
        email,
        password,
        ...(isLogin ? {} : { name }),
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid')) {
            toast({
              title: 'Login failed',
              description: 'Invalid email or password. Please check your credentials and try again.',
              variant: 'destructive',
            });
          } else if (errorMessage.includes('email not confirmed')) {
            toast({
              title: 'Email not verified',
              description: 'Please check your email and verify your account first.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          return; // Stop here on error - don't proceed
        }
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
      } else {
        const { error, data } = await signUp(email, password, name);
        if (error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
            toast({
              title: 'Email already exists',
              description: 'This email is already registered. Please log in instead.',
              variant: 'destructive',
            });
          } else if (errorMessage.includes('password')) {
            toast({
              title: 'Weak password',
              description: 'Please choose a stronger password with at least 6 characters.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Registration failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          return; // Stop here on error
        }
        if (data.user) {
          toast({
            title: 'Account created!',
            description: 'Welcome to ChefStart! Please complete your profile.',
          });
          // Navigation will happen via useEffect when auth state changes
        }
      }
    } catch (err) {
      toast({
        title: 'An error occurred',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-soft">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
              <ChefHat className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <Logo size="lg" />
          <p className="mt-2 text-muted-foreground">
            {isLogin ? 'Welcome back, chef!' : 'Start your culinary journey'}
          </p>
        </div>

        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="font-display text-2xl text-center">
              {isLogin ? 'Sign in' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin
                ? 'Enter your credentials to access your dashboard'
                : 'Fill in your details to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="chef@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2 shadow-glow"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign in' : 'Create account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

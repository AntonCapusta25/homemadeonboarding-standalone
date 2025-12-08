import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useChefProfile } from '@/hooks/useChefProfile';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email');

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, role } = useAuth();
  const { hasCompletedOnboarding, loading: profileLoading } = useChefProfile();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading && !profileLoading) {
      if (role === 'admin') {
        navigate('/admin');
      } else if (hasCompletedOnboarding) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, authLoading, profileLoading, role, hasCompletedOnboarding, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        toast.error(otpError.message);
        return;
      }

      setSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/dashboard`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        toast.error(otpError.message);
      } else {
        toast.success('Magic link sent again!');
      }
    } catch (err) {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success state - magic link sent
  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-soft">
        <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Check your email!</h1>
            <p className="text-muted-foreground">
              We've sent a magic link to sign you in.
            </p>
          </div>

          <Card className="shadow-medium border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Magic link sent to:</span>
              </div>
              <p className="font-medium text-foreground">{email}</p>
              
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Didn't receive it? Resend"
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Check your spam folder if you don't see the email within a few minutes.
          </p>

          <Button
            variant="ghost"
            onClick={() => setSent(false)}
            className="text-sm"
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-soft">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <p className="mt-2 text-muted-foreground">
            Welcome back, chef! 👨‍🍳
          </p>
        </div>

        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="font-display text-2xl text-center">
              Sign in
            </CardTitle>
            <CardDescription className="text-center">
              Enter your email and we'll send you a magic link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="chef@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2 shadow-glow"
                disabled={loading || !email}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send magic link
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    New to Home-Made-Chef?
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => navigate('/onboarding')}
                className="w-full gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start your chef journey
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

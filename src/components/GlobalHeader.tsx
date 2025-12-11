import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearOnboardingProgress } from '@/hooks/useOnboarding';

export function GlobalHeader() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
    clearOnboardingProgress();
    window.location.href = '/onboarding';
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">{t('auth.signOut')}</span>
      </Button>
    </div>
  );
}
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('nl') ? 'nl' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'nl' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{currentLang === 'en' ? 'NL' : 'EN'}</span>
    </Button>
  );
}

import { Phone, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WHATSAPP_NUMBER = '3197010208809';
const PHONE_NUMBER = '+3197010208809';

export function ContactButtons() {
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    const message = encodeURIComponent(t('contact.whatsappMessage', 'Hi! I need help with my Homemade onboarding.'));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    window.location.href = `tel:${PHONE_NUMBER}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 text-sm font-medium"
        aria-label={t('contact.whatsapp', 'Contact us on WhatsApp')}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">{t('contact.whatsapp', 'WhatsApp')}</span>
      </button>
      
      <button
        onClick={handleCall}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 text-sm font-medium"
        aria-label={t('contact.call', 'Call us')}
      >
        <Phone className="w-4 h-4" />
        <span className="hidden sm:inline">{t('contact.call', 'Call us')}</span>
      </button>
    </div>
  );
}

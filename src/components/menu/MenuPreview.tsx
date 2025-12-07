import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GeneratedMenu, MenuDish } from '@/types/onboarding';
import { UtensilsCrossed, TrendingUp, Percent, ChevronRight, Sparkles, Coffee, X, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MenuPreviewProps {
  menu: GeneratedMenu;
  onEdit?: () => void;
  compact?: boolean;
}

export function MenuPreview({ menu, onEdit, compact = false }: MenuPreviewProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;
  const formatMargin = (margin: number) => `${margin}%`;

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg" className="gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            {t('menu.seeMenu')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('menu.yourMenu')}
            </DialogTitle>
          </DialogHeader>
          <MenuContent menu={menu} onEdit={onEdit} />
        </DialogContent>
      </Dialog>
    );
  }

  return <MenuContent menu={menu} onEdit={onEdit} />;
}

function MenuContent({ menu, onEdit }: { menu: GeneratedMenu; onEdit?: () => void }) {
  const { t } = useTranslation();
  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Margin highlight */}
      <Card className="p-4 bg-forest-light/50 border-forest/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('menu.avgMargin')}</p>
              <p className="text-sm text-muted-foreground">{t('menu.marginExplainer')}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-forest">{menu.avgMargin}%</span>
            <p className="text-xs text-muted-foreground">{t('menu.profit')}</p>
          </div>
        </div>
      </Card>

      {/* Main dishes */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          {t('menu.mainDishes')}
        </h3>
        <div className="space-y-3">
          {menu.dishes.map((dish, idx) => (
            <DishCard key={idx} dish={dish} />
          ))}
        </div>
      </div>

      {/* Upsells */}
      {menu.upsells && menu.upsells.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            {t('menu.extras')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {menu.upsells.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <span className="text-foreground">{item.name}</span>
                <span className="font-semibold text-primary">{formatPrice(item.price)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/70 text-center pt-2 border-t border-border">
        {t('disclaimer.menuIp')}
      </p>

      {onEdit && (
        <Button onClick={onEdit} variant="outline" className="w-full gap-2">
          <Edit2 className="w-4 h-4" />
          {t('menu.editMenu')}
        </Button>
      )}
    </div>
  );
}

function DishCard({ dish }: { dish: MenuDish }) {
  const { t } = useTranslation();
  const formatPrice = (price: number) => `€${price.toFixed(2)}`;
  const savings = dish.restaurantPrice ? ((dish.restaurantPrice - dish.price) / dish.restaurantPrice * 100).toFixed(0) : null;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{dish.name}</h4>
          <p className="text-sm text-muted-foreground">{dish.description}</p>
        </div>
        <div className="text-right ml-4">
          <span className="text-lg font-bold text-primary">{formatPrice(dish.price)}</span>
          {dish.restaurantPrice && (
            <p className="text-xs text-muted-foreground line-through">{formatPrice(dish.restaurantPrice)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {t('menu.cost')}: {formatPrice(dish.estimatedCost)}
        </span>
        <span className="flex items-center gap-1 text-forest font-medium">
          <Percent className="w-3 h-3" />
          {dish.margin}% {t('menu.margin')}
        </span>
        {savings && (
          <span className="flex items-center gap-1 text-terracotta font-medium">
            {savings}% {t('menu.cheaper')}
          </span>
        )}
      </div>
    </Card>
  );
}

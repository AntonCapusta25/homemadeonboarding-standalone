import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GeneratedMenu, MenuDish } from '@/types/onboarding';
import { 
  UtensilsCrossed, TrendingUp, Percent, Plus, Trash2, Check, Cloud, 
  GripVertical, Sparkles, Coffee 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EditableMenuProps {
  menu: GeneratedMenu;
  onUpdateMenu: (menu: GeneratedMenu) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

interface EditableDish extends MenuDish {
  id: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export function EditableMenu({ menu, onUpdateMenu, onSave, saving = false }: EditableMenuProps) {
  const { t } = useTranslation();
  const [dishes, setDishes] = useState<EditableDish[]>([]);
  const [pendingSave, setPendingSave] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize dishes with IDs
  useEffect(() => {
    setDishes(
      menu.dishes.map((dish, idx) => ({
        ...dish,
        id: `dish-${idx}-${Date.now()}`,
      }))
    );
  }, []);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    setPendingSave(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      // Update the menu with current dishes
      const updatedMenu: GeneratedMenu = {
        ...menu,
        dishes: dishes.map(({ id, isNew, isDirty, ...dish }) => dish),
        avgMargin: calculateAvgMargin(dishes),
      };
      onUpdateMenu(updatedMenu);
      
      if (onSave) {
        await onSave();
      }
      setPendingSave(false);
    }, 1000);
  }, [dishes, menu, onUpdateMenu, onSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const calculateAvgMargin = (dishList: EditableDish[]) => {
    if (dishList.length === 0) return 0;
    const totalMargin = dishList.reduce((sum, dish) => sum + (dish.margin || 0), 0);
    return Math.round(totalMargin / dishList.length);
  };

  const updateDish = (id: string, updates: Partial<EditableDish>) => {
    setDishes(prev => 
      prev.map(dish => 
        dish.id === id 
          ? { ...dish, ...updates, isDirty: true }
          : dish
      )
    );
    triggerAutoSave();
  };

  const addDish = () => {
    const newDish: EditableDish = {
      id: `new-${Date.now()}`,
      name: '',
      description: '',
      price: 15,
      estimatedCost: 5,
      margin: 67,
      category: 'main',
      isNew: true,
      isDirty: true,
    };
    setDishes(prev => [...prev, newDish]);
    triggerAutoSave();
  };

  const removeDish = (id: string) => {
    setDishes(prev => prev.filter(dish => dish.id !== id));
    triggerAutoSave();
  };

  const calculateMargin = (price: number, cost: number) => {
    if (price <= 0) return 0;
    return Math.round(((price - cost) / price) * 100);
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          {t('menu.yourMenu')}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {saving || pendingSave ? (
            <span className="text-muted-foreground flex items-center gap-1">
              <Cloud className="w-4 h-4 animate-pulse" />
              Saving...
            </span>
          ) : (
            <span className="text-forest flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </div>

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
            <span className="text-3xl font-bold text-forest">{calculateAvgMargin(dishes)}%</span>
            <p className="text-xs text-muted-foreground">{t('menu.profit')}</p>
          </div>
        </div>
      </Card>

      {/* Editable dishes */}
      <div className="space-y-3">
        {dishes.map((dish) => (
          <EditableDishCard
            key={dish.id}
            dish={dish}
            onUpdate={(updates) => updateDish(dish.id, updates)}
            onRemove={() => removeDish(dish.id)}
            calculateMargin={calculateMargin}
          />
        ))}
      </div>

      {/* Add dish button */}
      <Button
        variant="outline"
        onClick={addDish}
        className="w-full gap-2 border-dashed"
      >
        <Plus className="w-4 h-4" />
        {t('menu.addDish')}
      </Button>

      {/* Upsells preview (read-only for now) */}
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
    </div>
  );
}

interface EditableDishCardProps {
  dish: EditableDish;
  onUpdate: (updates: Partial<EditableDish>) => void;
  onRemove: () => void;
  calculateMargin: (price: number, cost: number) => number;
}

function EditableDishCard({ dish, onUpdate, onRemove, calculateMargin }: EditableDishCardProps) {
  const { t } = useTranslation();

  const handlePriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    const margin = calculateMargin(price, dish.estimatedCost);
    onUpdate({ price, margin });
  };

  const handleCostChange = (value: string) => {
    const cost = parseFloat(value) || 0;
    const margin = calculateMargin(dish.price, cost);
    onUpdate({ estimatedCost: cost, margin });
  };

  return (
    <Card className={cn(
      "p-4 transition-all",
      dish.isNew && "border-primary/50 bg-primary/5",
      dish.isDirty && "border-l-4 border-l-primary"
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-2 text-muted-foreground/40 cursor-move">
          <GripVertical className="w-4 h-4" />
        </div>
        
        <div className="flex-1 space-y-3">
          {/* Name and delete */}
          <div className="flex items-start justify-between gap-2">
            <Input
              value={dish.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Dish name"
              className="font-semibold text-foreground border-transparent hover:border-input focus:border-input bg-transparent px-0 h-auto text-base"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Description */}
          <Textarea
            value={dish.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Description"
            className="text-sm text-muted-foreground border-transparent hover:border-input focus:border-input bg-transparent px-0 min-h-[40px] resize-none"
          />

          {/* Price, cost, margin */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Price:</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={dish.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="pl-6 h-8 text-primary font-semibold"
                  step="0.5"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Cost:</span>
              <div className="relative w-20">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  type="number"
                  value={dish.estimatedCost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  className="pl-6 h-8"
                  step="0.5"
                  min="0"
                />
              </div>
            </div>

            <span className="flex items-center gap-1 text-forest font-medium">
              <Percent className="w-3 h-3" />
              {dish.margin}% margin
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

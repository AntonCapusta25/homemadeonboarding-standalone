import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from '@/components/Logo';
import { Plus, Trash2, Package, ExternalLink, TrendingUp, Sparkles, ChevronDown, ChevronUp, Loader2, LogOut, Check, Cloud } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GeneratedMenu } from '@/types/onboarding';
import { CoolLoader } from '@/components/dashboard/CoolLoader';
import { useChefProfile } from '@/hooks/useChefProfile';
import { useMenu, DashboardDish } from '@/hooks/useMenu';

interface Supplier {
  name: string;
  type: string;
  url?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile: dbProfile, loading: profileLoading } = useChefProfile();
  const { signOut } = useAuth();
  const { loadActiveMenu, toGeneratedMenu, updateDish, saveDishes, deleteDish, pendingChanges, saving: menuSaving } = useMenu();
  
  const [dishes, setDishes] = useState<DashboardDish[]>([{ id: 'new-1', name: '', price: '', description: '', isNew: true }]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [chefData, setChefData] = useState<{ logoUrl?: string; restaurantName?: string; city?: string; generatedMenu?: GeneratedMenu } | null>(null);
  const [showPackaging, setShowPackaging] = useState(false);
  const [packagingExpanded, setPackagingExpanded] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  
  // Debounce timers for auto-save
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!dbProfile) return;
      
      // Set chef data from DB profile
      const newChefData: typeof chefData = {
        logoUrl: dbProfile.logo_url || undefined,
        restaurantName: dbProfile.business_name || undefined,
        city: dbProfile.city || undefined,
      };
      
      // Load menu from database
      const menuResult = await loadActiveMenu(dbProfile.id);
      if (menuResult) {
        const generatedMenu = toGeneratedMenu(menuResult.menu, menuResult.dishes);
        newChefData.generatedMenu = generatedMenu;
        setMenuId(menuResult.menu.id);
        
        // Pre-populate dishes from database menu
        const dbDishes: DashboardDish[] = menuResult.dishes
          .filter(d => !d.is_upsell)
          .map((dish) => ({
            id: dish.id,
            name: dish.name,
            price: dish.price.toString(),
            description: dish.description || '',
            estimatedCost: dish.estimated_cost || undefined,
            margin: dish.margin || undefined,
            menuId: menuResult.menu.id,
          }));
        
        if (dbDishes.length > 0) {
          setDishes(dbDishes);
        }
      }
      
      setChefData(newChefData);
    };
    
    loadData();
  }, [dbProfile, loadActiveMenu, toGeneratedMenu]);

  // Debounced auto-save for dish updates
  const debouncedSave = useCallback((dishId: string, updates: { name?: string; price?: number; description?: string }, isNew: boolean) => {
    // Clear existing timer
    if (debounceTimers.current[dishId]) {
      clearTimeout(debounceTimers.current[dishId]);
    }
    
    // Skip auto-save for new dishes
    if (isNew) return;
    
    setSavedStatus(prev => ({ ...prev, [dishId]: 'saving' }));
    
    // Set new timer
    debounceTimers.current[dishId] = setTimeout(async () => {
      const success = await updateDish(dishId, updates);
      setSavedStatus(prev => ({ ...prev, [dishId]: success ? 'saved' : 'error' }));
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSavedStatus(prev => {
          const next = { ...prev };
          delete next[dishId];
          return next;
        });
      }, 2000);
    }, 800);
  }, [updateDish]);

  const fetchSuppliers = async (city: string) => {
    setLoadingSuppliers(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-suppliers', {
        body: { city }
      });
      
      if (error) throw error;
      if (data?.suppliers) {
        setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      // Fallback suppliers
      setSuppliers([
        { name: 'Makro', type: 'Wholesale', url: 'https://www.makro.nl' },
        { name: 'Sligro', type: 'Wholesale', url: 'https://www.sligro.nl' },
        { name: 'Hanos', type: 'Wholesale', url: 'https://www.hanos.nl' },
      ]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handlePackagingToggle = (checked: boolean) => {
    setShowPackaging(checked);
    if (checked && suppliers.length === 0 && chefData?.city) {
      fetchSuppliers(chefData.city);
      setPackagingExpanded(true);
    }
  };

  const addDish = () => {
    const newDish: DashboardDish = { 
      id: `new-${Date.now()}`, 
      name: '', 
      price: '', 
      description: '',
      isNew: true 
    };
    setDishes([...dishes, newDish]);
  };

  const handleDishChange = (id: string, field: keyof DashboardDish, value: string) => {
    // Optimistic update - immediately update UI
    setDishes(dishes.map(d => d.id === id ? { ...d, [field]: value } : d));
    
    // Find the dish to check if it's new
    const dish = dishes.find(d => d.id === id);
    const isNew = dish?.isNew || id.startsWith('new-');
    
    // Debounced background save
    const updates: { name?: string; price?: number; description?: string } = {};
    if (field === 'name') updates.name = value;
    if (field === 'price') updates.price = parseFloat(value) || 0;
    if (field === 'description') updates.description = value;
    
    debouncedSave(id, updates, isNew);
  };

  const removeDish = async (id: string) => {
    if (dishes.length > 1) {
      // Optimistic update
      setDishes(dishes.filter(d => d.id !== id));
      
      // Background delete (only for existing dishes)
      if (!id.startsWith('new-')) {
        const success = await deleteDish(id);
        if (!success) {
          toast({ title: t('dashboard.errorDeleting'), variant: 'destructive' });
        }
      }
    }
  };

  const handleSaveAll = async () => {
    if (!menuId) {
      toast({ title: t('dashboard.noMenuFound'), variant: 'destructive' });
      return;
    }
    
    const validDishes = dishes.filter(d => d.name && d.price);
    if (validDishes.length === 0) {
      toast({ title: t('dashboard.addAtLeastOne'), variant: 'destructive' });
      return;
    }
    
    const success = await saveDishes(menuId, dishes);
    if (success) {
      toast({ title: t('dashboard.dishesSaved'), description: `${validDishes.length} ${t('dashboard.dishesAdded')}` });
      
      // Reload to get proper IDs for new dishes
      if (dbProfile) {
        const menuResult = await loadActiveMenu(dbProfile.id);
        if (menuResult) {
          const dbDishes: DashboardDish[] = menuResult.dishes
            .filter(d => !d.is_upsell)
            .map((dish) => ({
              id: dish.id,
              name: dish.name,
              price: dish.price.toString(),
              description: dish.description || '',
              estimatedCost: dish.estimated_cost || undefined,
              margin: dish.margin || undefined,
              menuId: menuResult.menu.id,
            }));
          setDishes(dbDishes);
        }
      }
    } else {
      toast({ title: t('dashboard.errorSaving'), variant: 'destructive' });
    }
  };

  const avgMargin = chefData?.generatedMenu?.avgMargin;

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo chefLogo={chefData?.logoUrl} size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{chefData?.restaurantName}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* SECTION 1: Menu Section */}
        <section className="mb-12">
          {/* Margin highlight card */}
          {avgMargin && (
            <Card className="p-4 mb-8 bg-forest-light/50 border-forest/20 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t('dashboard.yourMargin')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.vsRestaurants')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-forest">{avgMargin}%</span>
                  <p className="text-xs text-muted-foreground">{t('menu.profit')}</p>
                </div>
              </div>
            </Card>
          )}

          <div className="mb-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              {chefData?.generatedMenu ? (
                <>
                  <Sparkles className="w-6 h-6 text-primary" />
                  {t('dashboard.aiSuggestions')} 🍽️
                </>
              ) : (
                <>{t('dashboard.addDishes')} 🍽️</>
              )}
            </h1>
            <p className="text-muted-foreground">{t('dashboard.addDishesSubtitle')}</p>
          </div>

          <div className="space-y-4 mb-8">
            {dishes.map((dish, index) => (
              <Card 
                key={dish.id} 
                className={`p-4 animate-fade-in transition-all ${dish.isNew ? 'border-dashed border-primary/30' : ''}`} 
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-3">
                    <div className="relative">
                      <Input
                        placeholder={t('dashboard.dishName')}
                        value={dish.name}
                        onChange={(e) => handleDishChange(dish.id, 'name', e.target.value)}
                        className="font-medium pr-8"
                      />
                      {/* Save status indicator */}
                      {savedStatus[dish.id] === 'saving' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Cloud className="w-4 h-4 text-muted-foreground animate-pulse" />
                        </div>
                      )}
                      {savedStatus[dish.id] === 'saved' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Check className="w-4 h-4 text-forest" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Input
                        placeholder={t('dashboard.price')}
                        value={dish.price}
                        onChange={(e) => handleDishChange(dish.id, 'price', e.target.value)}
                        className="w-28"
                        type="number"
                        step="0.50"
                      />
                      <Input
                        placeholder={t('dashboard.description')}
                        value={dish.description}
                        onChange={(e) => handleDishChange(dish.id, 'description', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {dish.margin && (
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">{t('menu.cost')}: €{dish.estimatedCost?.toFixed(2)}</span>
                        <span className="text-forest font-medium">{dish.margin}% {t('menu.margin')}</span>
                      </div>
                    )}
                    {dish.isNew && (
                      <span className="text-xs text-muted-foreground italic">{t('dashboard.newDish')}</span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDish(dish.id)}
                    disabled={dishes.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 mb-8">
            <Button variant="outline" onClick={addDish} className="gap-2">
              <Plus className="w-4 h-4" /> {t('dashboard.addAnother')}
            </Button>
            <Button onClick={handleSaveAll} className="shadow-glow" disabled={menuSaving}>
              {menuSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('dashboard.saving')}
                </>
              ) : (
                t('dashboard.saveMenu')
              )}
            </Button>
          </div>
        </section>

        {/* SECTION 2: Packaging Section - Separate with checkbox */}
        <section className="border-t border-border pt-8">
          <Card className="p-5 border-2 border-dashed border-primary/30 bg-card/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <Checkbox 
                id="packaging" 
                checked={showPackaging}
                onCheckedChange={(checked) => handlePackagingToggle(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="packaging" className="cursor-pointer">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-forest-light rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-forest" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">{t('dashboard.buyPackaging')}</h2>
                      <p className="text-sm text-muted-foreground">{t('dashboard.packagingDesc')}</p>
                    </div>
                  </div>
                </label>

                {showPackaging && (
                  <div className="mt-4 animate-fade-in">
                    <button 
                      onClick={() => setPackagingExpanded(!packagingExpanded)}
                      className="flex items-center gap-2 text-sm text-primary font-medium mb-4"
                    >
                      {packagingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {t('dashboard.packagingSuppliers')}
                    </button>

                    {packagingExpanded && (
                      <>
                        {loadingSuppliers ? (
                          <CoolLoader message={t('dashboard.findingSuppliers')} />
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {suppliers.map((supplier, idx) => (
                              <Card key={idx} className="p-4 hover:shadow-soft transition-shadow animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                                    <p className="text-sm text-muted-foreground">{supplier.type}</p>
                                  </div>
                                  {supplier.url && (
                                    <a href={supplier.url} target="_blank" rel="noopener noreferrer">
                                      <Button variant="ghost" size="icon">
                                        <ExternalLink className="w-4 h-4" />
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* IP Disclaimer */}
        <p className="text-[10px] text-muted-foreground/60 mt-12 text-center">
          {t('disclaimer.ip')}
        </p>
      </main>
    </div>
  );
}

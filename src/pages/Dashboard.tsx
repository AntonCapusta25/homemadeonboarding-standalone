import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Logo } from '@/components/Logo';
import { Plus, Trash2, Package, ExternalLink, TrendingUp, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GeneratedMenu } from '@/types/onboarding';
import { CoolLoader } from '@/components/dashboard/CoolLoader';
import { useChefProfile } from '@/hooks/useChefProfile';

interface Dish {
  id: string;
  name: string;
  price: string;
  description: string;
  estimatedCost?: number;
  margin?: number;
}

interface Supplier {
  name: string;
  type: string;
  url?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile: dbProfile, loading: profileLoading } = useChefProfile();
  
  const [dishes, setDishes] = useState<Dish[]>([{ id: '1', name: '', price: '', description: '' }]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [chefData, setChefData] = useState<{ logoUrl?: string; restaurantName?: string; city?: string; generatedMenu?: GeneratedMenu } | null>(null);
  const [showPackaging, setShowPackaging] = useState(false);
  const [packagingExpanded, setPackagingExpanded] = useState(false);

  useEffect(() => {
    // First try to load from database profile
    if (dbProfile) {
      setChefData({
        logoUrl: dbProfile.logo_url || undefined,
        restaurantName: dbProfile.business_name || undefined,
        city: dbProfile.city || undefined,
      });
    }
    
    // Also check localStorage for generated menu (not stored in DB yet)
    const savedProfile = localStorage.getItem('chefProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      
      // Merge with DB data, preferring DB for core fields
      setChefData(prev => ({
        logoUrl: prev?.logoUrl || profile.logoUrl,
        restaurantName: prev?.restaurantName || profile.restaurantName,
        city: prev?.city || profile.city,
        generatedMenu: profile.generatedMenu, // Only from localStorage for now
      }));
      
      // Pre-populate dishes from AI-generated menu
      if (profile.generatedMenu?.dishes && profile.generatedMenu.dishes.length > 0) {
        const aiDishes = profile.generatedMenu.dishes.map((dish: any, idx: number) => ({
          id: `ai-${idx}`,
          name: dish.name,
          price: dish.price.toString(),
          description: dish.description,
          estimatedCost: dish.estimatedCost,
          margin: dish.margin
        }));
        setDishes(aiDishes);
      }
    }
  }, [dbProfile]);

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
    setDishes([...dishes, { id: Date.now().toString(), name: '', price: '', description: '' }]);
  };

  const updateDish = (id: string, field: keyof Dish, value: string) => {
    setDishes(dishes.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDish = (id: string) => {
    if (dishes.length > 1) {
      setDishes(dishes.filter(d => d.id !== id));
    }
  };

  const saveDishes = () => {
    const validDishes = dishes.filter(d => d.name && d.price);
    if (validDishes.length === 0) {
      toast({ title: t('dashboard.addAtLeastOne'), variant: 'destructive' });
      return;
    }
    localStorage.setItem('chefDishes', JSON.stringify(validDishes));
    toast({ title: t('dashboard.dishesSaved'), description: `${validDishes.length} ${t('dashboard.dishesAdded')}` });
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
          <span className="text-sm text-muted-foreground">{chefData?.restaurantName}</span>
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
              <Card key={dish.id} className="p-4 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder={t('dashboard.dishName')}
                      value={dish.name}
                      onChange={(e) => updateDish(dish.id, 'name', e.target.value)}
                      className="font-medium"
                    />
                    <div className="flex gap-3">
                      <Input
                        placeholder={t('dashboard.price')}
                        value={dish.price}
                        onChange={(e) => updateDish(dish.id, 'price', e.target.value)}
                        className="w-28"
                        type="number"
                        step="0.50"
                      />
                      <Input
                        placeholder={t('dashboard.description')}
                        value={dish.description}
                        onChange={(e) => updateDish(dish.id, 'description', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {dish.margin && (
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">{t('menu.cost')}: €{dish.estimatedCost?.toFixed(2)}</span>
                        <span className="text-forest font-medium">{dish.margin}% {t('menu.margin')}</span>
                      </div>
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
            <Button onClick={saveDishes} className="shadow-glow">
              {t('dashboard.saveMenu')}
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

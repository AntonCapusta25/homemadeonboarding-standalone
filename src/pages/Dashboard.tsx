import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { Plus, Trash2, Package, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Dish {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface Supplier {
  name: string;
  type: string;
  url?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<Dish[]>([{ id: '1', name: '', price: '', description: '' }]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [chefData, setChefData] = useState<{ logoUrl?: string; restaurantName?: string; city?: string } | null>(null);

  useEffect(() => {
    // Load chef data from localStorage
    const savedProfile = localStorage.getItem('chefProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setChefData(profile);
      fetchSuppliers(profile.city);
    } else {
      setLoadingSuppliers(false);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo chefLogo={chefData?.logoUrl} size="sm" />
          <span className="text-sm text-muted-foreground">{chefData?.restaurantName}</span>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {t('dashboard.addDishes')} 🍽️
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

        <div className="flex gap-4 mb-12">
          <Button variant="outline" onClick={addDish} className="gap-2">
            <Plus className="w-4 h-4" /> {t('dashboard.addAnother')}
          </Button>
          <Button onClick={saveDishes} className="shadow-glow">
            {t('dashboard.saveMenu')}
          </Button>
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-forest-light rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-forest" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">{t('dashboard.packagingSuppliers')}</h2>
              <p className="text-sm text-muted-foreground">{t('dashboard.supplierSubtitle')}</p>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('dashboard.findingSuppliers')}</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier, idx) => (
                <Card key={idx} className="p-4 hover:shadow-soft transition-shadow">
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
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  MapPin, 
  Clock, 
  FileText, 
  UtensilsCrossed, 
  ArrowLeft,
  Save,
  Loader2,
  Phone,
  Mail,
  Building,
  CheckCircle,
  Upload,
  Trash2,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChefProfile, DbChefProfile } from '@/hooks/useChefProfile';
import { useMenu, DashboardDish } from '@/hooks/useMenu';
import { useVerification } from '@/hooks/useVerification';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';

interface ApplicationDashboardProps {
  onBack: () => void;
}

const AVAILABILITY_OPTIONS = [
  { id: 'lunch_weekdays', label: 'Lunch (weekdays)' },
  { id: 'lunch_weekends', label: 'Lunch (weekends)' },
  { id: 'dinner_weekdays', label: 'Dinner (weekdays)' },
  { id: 'dinner_weekends', label: 'Dinner (weekends)' },
  { id: 'late_night', label: 'Late Night' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'delivery', label: 'Delivery Only' },
  { value: 'pickup', label: 'Pickup Only' },
  { value: 'both', label: 'Delivery & Pickup' },
  { value: 'unsure', label: 'Not Sure Yet' },
];

export function ApplicationDashboard({ onBack }: ApplicationDashboardProps) {
  const { t } = useTranslation();
  const { profile, loading: profileLoading, updateProfile } = useChefProfile();
  const { loadActiveMenu, saveDishes } = useMenu();
  const { progress } = useVerification();
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  
  // Form states
  const [contactData, setContactData] = useState({
    chefName: '',
    email: '',
    phone: '',
  });
  
  const [businessData, setBusinessData] = useState({
    businessName: '',
    address: '',
    city: '',
  });
  
  const [availabilityData, setAvailabilityData] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<string>('unsure');
  
  const [dishes, setDishes] = useState<DashboardDish[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setContactData({
        chefName: profile.chef_name || '',
        email: profile.contact_email || '',
        phone: profile.contact_phone || '',
      });
      setBusinessData({
        businessName: profile.business_name || '',
        address: profile.address || '',
        city: profile.city || '',
      });
      setAvailabilityData(profile.availability || []);
      setServiceType(profile.service_type || 'unsure');
    }
  }, [profile]);

  // Load menu data
  useEffect(() => {
    const loadMenu = async () => {
      if (!profile?.id) return;
      
      setMenuLoading(true);
      try {
        const result = await loadActiveMenu(profile.id);
        if (result) {
          setMenuId(result.menu.id);
          setDishes(result.dishes.filter(d => !d.is_upsell).map(d => ({
            id: d.id,
            name: d.name,
            price: d.price.toString(),
            description: d.description || '',
            estimatedCost: d.estimated_cost || undefined,
            margin: d.margin || undefined,
          })));
        }
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setMenuLoading(false);
      }
    };
    
    loadMenu();
  }, [profile?.id, loadActiveMenu]);

  const handleSaveContact = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      await updateProfile({
        chef_name: contactData.chefName,
        contact_email: contactData.email,
        contact_phone: contactData.phone,
      });
      toast.success('Contact information saved!');
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      await updateProfile({
        business_name: businessData.businessName,
        address: businessData.address,
        city: businessData.city,
      });
      toast.success('Business information saved!');
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      await updateProfile({
        availability: availabilityData,
        service_type: serviceType as 'delivery' | 'pickup' | 'both' | 'unsure',
      });
      toast.success('Availability saved!');
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!menuId) return;
    
    setSaving(true);
    try {
      await saveDishes(menuId, dishes);
      toast.success('Menu saved!');
    } catch (err) {
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = (id: string) => {
    setAvailabilityData(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  const updateDish = (index: number, field: keyof DashboardDish, value: string) => {
    setDishes(prev => prev.map((d, i) => 
      i === index ? { ...d, [field]: value } : d
    ));
  };

  const addDish = () => {
    setDishes(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: '',
      price: '',
      description: '',
      isNew: true,
    }]);
  };

  const removeDish = (index: number) => {
    setDishes(prev => prev.map((d, i) => 
      i === index ? { ...d, isDeleted: true } : d
    ));
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Application</h1>
              <p className="text-sm text-muted-foreground">Review and adjust your details</p>
            </div>
          </div>
          <Logo chefLogo={profile?.logo_url} size="sm" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 h-auto p-1">
            <TabsTrigger value="contact" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4" />
              <span className="text-xs">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building className="w-4 h-4" />
              <span className="text-xs">Business</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Hours</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chefName">Full Name</Label>
                  <Input
                    id="chefName"
                    value={contactData.chefName}
                    onChange={(e) => setContactData(prev => ({ ...prev, chefName: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={contactData.phone}
                    onChange={(e) => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <Button onClick={handleSaveContact} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Your restaurant name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    City
                  </Label>
                  <Input
                    id="city"
                    value={businessData.city}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Your city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    value={businessData.address}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street, ZIP, City"
                  />
                </div>
                <Button onClick={handleSaveBusiness} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                    Your Menu
                  </span>
                  <Button variant="outline" size="sm" onClick={addDish}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Dish
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {menuLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : dishes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No menu items yet</p>
                ) : (
                  <div className="space-y-3">
                    {dishes.filter(d => !d.isDeleted).map((dish, index) => (
                      <div key={dish.id} className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={dish.name}
                            onChange={(e) => updateDish(index, 'name', e.target.value)}
                            placeholder="Dish name"
                            className="font-medium"
                          />
                          <Input
                            value={dish.description}
                            onChange={(e) => updateDish(index, 'description', e.target.value)}
                            placeholder="Description"
                            className="text-sm"
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            value={dish.price}
                            onChange={(e) => updateDish(index, 'price', e.target.value)}
                            placeholder="€0.00"
                            className="text-right"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDish(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleSaveMenu} disabled={saving || !menuId} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Menu
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Opening Hours & Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>When are you available?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABILITY_OPTIONS.map(option => (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          availabilityData.includes(option.id)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={availabilityData.includes(option.id)}
                          onCheckedChange={() => toggleAvailability(option.id)}
                        />
                        <span className="text-sm font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Service Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVICE_TYPE_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors text-center ${
                          serviceType === option.value
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="serviceType"
                          value={option.value}
                          checked={serviceType === option.value}
                          onChange={(e) => setServiceType(e.target.value)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveAvailability} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Your Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <DocumentStatus
                    label="KVK Registration"
                    uploaded={!!progress?.kvkDocumentUrl}
                    description="Chamber of Commerce registration"
                  />
                  <DocumentStatus
                    label="NVWA Registration"
                    uploaded={!!progress?.nvwaDocumentUrl}
                    description="Food safety authority registration"
                  />
                  <DocumentStatus
                    label="HACCP Certificate"
                    uploaded={!!progress?.haccpDocumentUrl}
                    description="Food safety management certificate"
                  />
                  <DocumentStatus
                    label="Kitchen Photos"
                    uploaded={!!progress?.kitchenVerified}
                    description="Kitchen verification photos"
                  />
                  <DocumentStatus
                    label="Food Safety Quiz"
                    uploaded={!!progress?.foodSafetyViewed}
                    description="Completed food safety training"
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    To re-upload documents, please go through the verification flow again.
                  </p>
                  <Button variant="outline" onClick={onBack} className="w-full">
                    Back to Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DocumentStatus({ 
  label, 
  uploaded, 
  description 
}: { 
  label: string; 
  uploaded: boolean; 
  description: string;
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      uploaded ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-muted/50 border-border'
    }`}>
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {uploaded ? (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Uploaded
        </Badge>
      ) : (
        <Badge variant="secondary">
          <Upload className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      )}
    </div>
  );
}

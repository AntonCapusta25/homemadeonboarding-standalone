import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, XCircle, Loader2, Eye, Phone, Mail, MapPin, 
  Calendar, Clock, User, Utensils, ChefHat, FileCheck, Shield,
  Download
} from 'lucide-react';
import { TaskDetailsModal } from './TaskDetailsModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ChefWithStats } from '@/hooks/useChefProfiles';
import { calculateOnboardingProgress } from '@/lib/chefProgress';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';

const CRM_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  called_no_answer: { label: 'Called - No Answer', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  interested: { label: 'Interested', color: 'bg-green-100 text-green-800 border-green-200' },
  meeting_set: { label: 'Meeting Set', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  not_interested: { label: 'Not Interested', color: 'bg-red-100 text-red-800 border-red-200' },
  active: { label: 'Active Chef', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  call_later: { label: 'Call Later', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

interface ChefDetailsModalProps {
  chef: ChefWithStats;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onStatusChange?: (chefId: string, status: string) => Promise<{ error: any }>;
  onNotesChange?: (chefId: string, notes: string) => Promise<{ error: any }>;
}

interface TaskData {
  id: string;
  name: string;
  completed: boolean;
  data?: any;
  icon: React.ReactNode;
}

interface VerificationData {
  menu_reviewed: boolean;
  food_safety_viewed: boolean;
  documents_uploaded: boolean;
  verification_completed: boolean;
  kvk_document_url: string | null;
  haccp_document_url: string | null;
  nvwa_document_url: string | null;
}

interface MenuData {
  id: string;
  summary: string | null;
  average_margin: number | null;
  dishes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
    is_upsell: boolean;
  }[];
}

export function ChefDetailsModal({ 
  chef, 
  isOpen, 
  onClose, 
  onRefresh,
  onStatusChange,
  onNotesChange 
}: ChefDetailsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id: string; name: string } | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState(chef.admin_status || 'new');
  const [adminNotes, setAdminNotes] = useState(chef.admin_notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && chef.id) {
      fetchChefData();
      setAdminStatus(chef.admin_status || 'new');
      setAdminNotes(chef.admin_notes || '');
    }
  }, [isOpen, chef.id, chef.admin_status, chef.admin_notes]);

  const fetchChefData = async () => {
    setLoading(true);
    try {
      // Fetch verification data
      const { data: verificationData } = await supabase
        .from('chef_verification')
        .select('*')
        .eq('chef_profile_id', chef.id)
        .maybeSingle();

      if (verificationData) {
        setVerification({
          menu_reviewed: verificationData.menu_reviewed || false,
          food_safety_viewed: verificationData.food_safety_viewed || false,
          documents_uploaded: verificationData.documents_uploaded || false,
          verification_completed: verificationData.verification_completed || false,
          kvk_document_url: verificationData.kvk_document_url,
          haccp_document_url: verificationData.haccp_document_url,
          nvwa_document_url: verificationData.nvwa_document_url,
        });
      }

      // Fetch menu and dishes
      const { data: menuData } = await supabase
        .from('menus')
        .select('id, summary, average_margin, is_active')
        .eq('chef_profile_id', chef.id)
        .eq('is_active', true)
        .maybeSingle();

      if (menuData) {
        const { data: dishesData } = await supabase
          .from('dishes')
          .select('id, name, description, price, category, is_upsell')
          .eq('menu_id', menuData.id)
          .order('sort_order', { ascending: true });

        setMenu({
          id: menuData.id,
          summary: menuData.summary,
          average_margin: menuData.average_margin,
          dishes: dishesData || [],
        });
      }
    } catch (error) {
      console.error('Error fetching chef data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setAdminStatus(newStatus);
    if (onStatusChange && user) {
      setSaving(true);
      const { error } = await onStatusChange(chef.id, newStatus);
      setSaving(false);
      if (error) {
        setAdminStatus(chef.admin_status || 'new');
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      }
    }
  };

  const handleNotesBlur = async () => {
    if (onNotesChange && user && adminNotes !== chef.admin_notes) {
      setSaving(true);
      const { error } = await onNotesChange(chef.id, adminNotes);
      setSaving(false);
      if (error) {
        toast({ title: 'Error', description: 'Failed to save notes', variant: 'destructive' });
      }
    }
  };

  const handleMenuDownload = async () => {
    if (!menu || menu.dishes.length === 0) {
      toast({ title: 'No menu', description: 'This chef has no menu to download', variant: 'destructive' });
      return;
    }

    const businessName = chef.business_name || chef.chef_name || 'Chef';
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    // Separate main dishes and extras
    const mainDishes = menu.dishes.filter(d => !d.is_upsell);
    const extras = menu.dishes.filter(d => d.is_upsell);

    // Build extras option string for CSV
    const buildExtrasOption = () => {
      if (extras.length === 0) return { id: '', name: '', variants: '' };
      const optionId = `extras-${Date.now()}`;
      const variants = extras.map(u => {
        const price = Number(u.price).toFixed(0);
        const desc = u.description || u.name;
        return `${u.name},${price},0,1,${desc},,${u.id}`;
      }).join(';');
      return { id: optionId, name: 'Extras', variants };
    };

    const extrasOption = buildExtrasOption();

    // Generate CSV content
    const csvHeaders = [
      'PRODUCT.ID', 'PRODUCT.NAME', 'PRODUCT.DESCRIPTION', 'PRODUCT.SKU',
      'PRODUCT.PRICE.SELLING', 'PRODUCT.PRICE.COST', 'PRODUCT.PRICE.COMPARE',
      'PRODUCT.TAX_PERCENT', 'PRODUCT.STATUS', 'PRODUCT.INVENTORY',
      'PRODUCT.MIN.MAX.QUANTITY', 'PRODUCT.LABELS', 'PRODUCT.CATEGORY',
      'PRODUCT.TAGS', 'PRODUCT.IMAGES', 'OPTION1.ID', 'OPTION1.NAME',
      'OPTION1.TYPE', 'OPTION1.ENABLE_RANGE', 'OPTION1.RANGE', 'OPTION1.REQUIRED',
      'OPTION1.VIEW', 'OPTION1.VARIANTS', 'OPTION2.ID', 'OPTION2.NAME',
      'OPTION2.TYPE', 'OPTION2.ENABLE_RANGE', 'OPTION2.RANGE', 'OPTION2.REQUIRED',
      'OPTION2.VIEW', 'OPTION2.VARIANTS'
    ];

    const escapeCSV = (val: string) => {
      const str = String(val || '').replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    };

    const placeholderImage = 'https://placehold.co/400x300/f5f5f5/999999?text=Food+Image';

    const mainDishRows = mainDishes.map((dish) => {
      const desc = dish.description ? `<p>${dish.description}</p>` : '';
      const category = dish.category || 'Main Dishes';
      
      return [
        dish.id, dish.name, desc, '',
        Number(dish.price).toFixed(2), '', '', '',
        'ACTIVE', '100', '1,50', '', category, '', placeholderImage,
        extrasOption.id, extrasOption.name,
        extras.length > 0 ? 'multiple' : '',
        extras.length > 0 ? 'NO' : '',
        extras.length > 0 ? '0,0' : '',
        extras.length > 0 ? 'NO' : '',
        extras.length > 0 ? 'LIST' : '',
        extrasOption.variants,
        '', '', '', '', '', '', '', ''
      ].map(escapeCSV).join(',');
    });

    const extrasRows = extras.map((dish) => {
      const desc = dish.description ? `<p>${dish.description}</p>` : '';
      const category = dish.category || 'Extras';
      
      return [
        dish.id, dish.name, desc, '',
        Number(dish.price).toFixed(2), '', '', '',
        'ACTIVE', '100', '1,50', 'extra', category, '', placeholderImage,
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', ''
      ].map(escapeCSV).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...mainDishRows, ...extrasRows].join('\n');

    // Generate text content
    const dishesByCategory: Record<string, typeof menu.dishes> = {};
    menu.dishes.forEach((dish) => {
      const category = dish.category || 'Other';
      if (!dishesByCategory[category]) {
        dishesByCategory[category] = [];
      }
      dishesByCategory[category].push(dish);
    });

    let textContent = '';
    Object.entries(dishesByCategory).forEach(([category, dishes]) => {
      textContent += `## ${category}\n\n`;
      dishes.forEach((dish) => {
        const desc = dish.description || '';
        const price = `€${Number(dish.price).toFixed(2)}`;
        textContent += `**${dish.name}** — ${desc} — ${price}  \n`;
      });
      textContent += '\n---\n\n';
    });
    textContent = textContent.replace(/\n---\n\n$/, '\n');

    // Create ZIP file with both
    const zip = new JSZip();
    zip.file(`${businessName}_menu.csv`, csvContent);
    zip.file(`${businessName}_menu.txt`, textContent);
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName}_menu_${dateStr}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Downloaded', description: 'Menu ZIP file downloaded (CSV + Text)' });
  };

  const handleTaskClick = (task: TaskData) => {
    setSelectedTask({ id: task.id, name: task.name });
    setIsTaskDetailsOpen(true);
  };

  // Build task list based on onboarding steps
  const onboardingTasks: TaskData[] = [
    { 
      id: 'city', 
      name: 'City Selection', 
      completed: !!chef.city, 
      data: chef.city,
      icon: <MapPin className="w-4 h-4" />
    },
    { 
      id: 'cuisines', 
      name: 'Cuisine Types', 
      completed: (chef.cuisines?.length || 0) > 0, 
      data: chef.cuisines,
      icon: <Utensils className="w-4 h-4" />
    },
    { 
      id: 'contact', 
      name: 'Contact Information', 
      completed: !!chef.contact_email && !!chef.contact_phone, 
      data: { email: chef.contact_email, phone: chef.contact_phone },
      icon: <Mail className="w-4 h-4" />
    },
    { 
      id: 'address', 
      name: 'Address', 
      completed: !!chef.address, 
      data: chef.address,
      icon: <MapPin className="w-4 h-4" />
    },
    { 
      id: 'business_name', 
      name: 'Business Name', 
      completed: !!chef.business_name, 
      data: chef.business_name,
      icon: <ChefHat className="w-4 h-4" />
    },
    { 
      id: 'logo', 
      name: 'Logo', 
      completed: !!chef.logo_url, 
      data: chef.logo_url,
      icon: <User className="w-4 h-4" />
    },
    { 
      id: 'service_type', 
      name: 'Service Type', 
      completed: !!chef.service_type && chef.service_type !== 'unsure', 
      data: chef.service_type,
      icon: <Clock className="w-4 h-4" />
    },
    { 
      id: 'availability', 
      name: 'Availability', 
      completed: (chef.availability?.length || 0) > 0, 
      data: chef.availability,
      icon: <Calendar className="w-4 h-4" />
    },
    { 
      id: 'dish_types', 
      name: 'Dish Types', 
      completed: (chef.dish_types?.length || 0) > 0, 
      data: chef.dish_types,
      icon: <Utensils className="w-4 h-4" />
    },
    { 
      id: 'food_safety', 
      name: 'Food Safety Status', 
      completed: !!chef.food_safety_status, 
      data: chef.food_safety_status,
      icon: <Shield className="w-4 h-4" />
    },
    { 
      id: 'kvk_status', 
      name: 'KVK/NVWA Status', 
      completed: !!chef.kvk_status, 
      data: chef.kvk_status,
      icon: <FileCheck className="w-4 h-4" />
    },
    { 
      id: 'plan', 
      name: 'Plan Selection', 
      completed: !!chef.plan, 
      data: chef.plan,
      icon: <CheckCircle className="w-4 h-4" />
    },
  ];

  const verificationTasks: TaskData[] = [
    { 
      id: 'menu_reviewed', 
      name: 'Menu Review', 
      completed: verification?.menu_reviewed || false,
      data: menu,
      icon: <Utensils className="w-4 h-4" />
    },
    { 
      id: 'food_safety_viewed', 
      name: 'Food Safety Training', 
      completed: verification?.food_safety_viewed || false,
      icon: <Shield className="w-4 h-4" />
    },
    { 
      id: 'documents_uploaded', 
      name: 'Documents Uploaded', 
      completed: verification?.documents_uploaded || false,
      data: {
        kvk: verification?.kvk_document_url,
        haccp: verification?.haccp_document_url,
        nvwa: verification?.nvwa_document_url,
      },
      icon: <FileCheck className="w-4 h-4" />
    },
  ];

  const completedOnboarding = onboardingTasks.filter(t => t.completed).length;
  const completedVerification = verificationTasks.filter(t => t.completed).length;
  
  // Use same calculation as table view for consistency
  const progressPercent = calculateOnboardingProgress(chef);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{chef.business_name || chef.chef_name || 'Chef Details'}</span>
            <Badge className={progressPercent === 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
              {progressPercent}% Complete
            </Badge>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding ({completedOnboarding}/{onboardingTasks.length})</TabsTrigger>
                <TabsTrigger value="verification">Verification ({completedVerification}/{verificationTasks.length})</TabsTrigger>
                <TabsTrigger value="menu">Menu ({menu?.dishes.length || 0} items)</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Chef Info Card */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Chef Information</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{chef.chef_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-sm truncate">{chef.contact_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{chef.contact_phone || 'Not provided'}</p>
                        {chef.contact_phone && (
                          <a href={`tel:${chef.contact_phone}`} className="text-primary hover:underline">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">City</p>
                      <p className="font-medium">{chef.city || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Business Name</p>
                      <p className="font-medium">{chef.business_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <Badge variant="outline" className="capitalize">{chef.plan || 'Not selected'}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="font-medium">{format(new Date(chef.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Onboarding</p>
                      <Badge variant={chef.onboarding_completed ? 'default' : 'secondary'}>
                        {chef.onboarding_completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Admin CRM Card */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Admin CRM</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={adminStatus} onValueChange={handleStatusChange}>
                        <SelectTrigger>
                          <SelectValue>
                            <Badge className={CRM_STATUS_CONFIG[adminStatus]?.color || 'bg-gray-100'}>
                              {CRM_STATUS_CONFIG[adminStatus]?.label || adminStatus}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CRM_STATUS_CONFIG).map(([key, { label, color }]) => (
                            <SelectItem key={key} value={key}>
                              <Badge className={color}>{label}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Call Attempts</Label>
                      <p className="text-lg font-bold">{chef.call_attempts || 0}</p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        onBlur={handleNotesBlur}
                        placeholder="Add admin notes..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    {chef.crm_last_contact_date && (
                      <span>Last contact: {format(new Date(chef.crm_last_contact_date), 'MMM d, yyyy')}</span>
                    )}
                    {chef.crm_follow_up_date && (
                      <span>Follow-up: {format(new Date(chef.crm_follow_up_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </Card>

                {/* Progress Card */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Progress Overview</h3>
                  
                  {/* Onboarding Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Onboarding</span>
                      <span className="text-sm font-semibold">{progressPercent}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            progressPercent === 100 ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completedOnboarding} of {onboardingTasks.length} tasks
                    </p>
                  </div>
                  
                  {/* Verification Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Verification</span>
                      <span className="text-sm font-semibold">
                        {Math.round((completedVerification / verificationTasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            completedVerification === verificationTasks.length ? "bg-green-500" : "bg-blue-500"
                          )}
                          style={{ width: `${(completedVerification / verificationTasks.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completedVerification} of {verificationTasks.length} tasks
                    </p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="onboarding" className="space-y-3">
                {onboardingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className={`p-2 rounded-full ${task.completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${task.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {task.name}
                      </p>
                      {task.completed && task.data && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {typeof task.data === 'string' ? task.data : Array.isArray(task.data) ? task.data.join(', ') : 'View details'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="verification" className="space-y-3">
                {!verification ? (
                  <p className="text-muted-foreground text-center py-8">No verification data yet</p>
                ) : (
                  verificationTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className={`p-2 rounded-full ${task.completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {task.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${task.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {task.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="menu" className="space-y-4">
                {!menu ? (
                  <p className="text-muted-foreground text-center py-8">No menu generated yet</p>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={handleMenuDownload} className="gap-2">
                        <Download className="w-4 h-4" />
                        Download Menu (ZIP)
                      </Button>
                    </div>
                    {menu.summary && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Menu Summary</h4>
                        <p className="text-sm text-muted-foreground">{menu.summary}</p>
                        {menu.average_margin && (
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">Average Margin:</span>{' '}
                            <span className="font-medium text-green-600">{menu.average_margin}%</span>
                          </p>
                        )}
                      </Card>
                    )}
                    <div className="space-y-2">
                      <h4 className="font-medium">Dishes ({menu.dishes.filter(d => !d.is_upsell).length})</h4>
                      {menu.dishes.filter(d => !d.is_upsell).map((dish) => (
                        <div key={dish.id} className="flex justify-between items-start p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{dish.name}</p>
                            {dish.description && (
                              <p className="text-xs text-muted-foreground mt-1">{dish.description}</p>
                            )}
                            {dish.category && (
                              <Badge variant="outline" className="mt-1 text-xs">{dish.category}</Badge>
                            )}
                          </div>
                          <p className="font-semibold">€{Number(dish.price).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    {menu.dishes.filter(d => d.is_upsell).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Upsells ({menu.dishes.filter(d => d.is_upsell).length})</h4>
                        {menu.dishes.filter(d => d.is_upsell).map((dish) => (
                          <div key={dish.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/30">
                            <p className="font-medium">{dish.name}</p>
                            <p className="font-semibold">€{Number(dish.price).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        {/* Task Details Modal */}
        {selectedTask && (
          <TaskDetailsModal
            isOpen={isTaskDetailsOpen}
            onClose={() => {
              setIsTaskDetailsOpen(false);
              setSelectedTask(null);
            }}
            taskId={selectedTask.id}
            taskName={selectedTask.name}
            chef={chef}
            verification={verification}
            menu={menu}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

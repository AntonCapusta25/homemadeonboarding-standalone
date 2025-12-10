import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChefWithStats } from '@/hooks/useChefProfiles';
import { CheckCircle, XCircle, ExternalLink, MapPin, Mail, Phone, Calendar, Utensils, ChefHat, Shield, FileCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  chef: ChefWithStats;
  verification: {
    menu_reviewed: boolean;
    food_safety_viewed: boolean;
    documents_uploaded: boolean;
    verification_completed: boolean;
    kvk_document_url: string | null;
    haccp_document_url: string | null;
    nvwa_document_url: string | null;
  } | null;
  menu: {
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
  } | null;
}

export function TaskDetailsModal({
  isOpen,
  onClose,
  taskId,
  taskName,
  chef,
  verification,
  menu,
}: TaskDetailsModalProps) {
  const renderTaskContent = () => {
    switch (taskId) {
      case 'city':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Selected City</p>
                <p className="text-xl font-semibold">{chef.city || 'Not provided'}</p>
              </div>
            </div>
            {chef.city && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" /> Completed
              </Badge>
            )}
          </div>
        );

      case 'cuisines':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Utensils className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Selected Cuisines</p>
            </div>
            {chef.cuisines && chef.cuisines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chef.cuisines.map((cuisine, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No cuisines selected</p>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{chef.contact_email || 'Not provided'}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{chef.contact_phone || 'Not provided'}</p>
                </div>
                {chef.contact_phone && (
                  <Button variant="outline" size="sm" asChild className="ml-auto">
                    <a href={`tel:${chef.contact_phone}`}>
                      <Phone className="w-3 h-3 mr-1" /> Call
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Full Address</p>
                <p className="font-medium">{chef.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        );

      case 'business_name':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="text-xl font-semibold">{chef.business_name || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chef Name</p>
              <p className="font-medium">{chef.chef_name || 'Not provided'}</p>
            </div>
          </div>
        );

      case 'logo':
        return (
          <div className="space-y-4">
            {chef.logo_url ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={chef.logo_url}
                  alt="Chef Logo"
                  className="w-32 h-32 object-contain rounded-lg border"
                />
                <Button variant="outline" size="sm" asChild>
                  <a href={chef.logo_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" /> View Full Size
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No logo uploaded</p>
            )}
          </div>
        );

      case 'service_type':
        const serviceLabels: Record<string, string> = {
          delivery: 'Delivery Only',
          pickup: 'Pickup Only',
          both: 'Delivery & Pickup',
          unsure: 'Not Sure Yet',
        };
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Service Type</p>
                <p className="text-xl font-semibold">
                  {serviceLabels[chef.service_type || ''] || chef.service_type || 'Not selected'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'availability':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Available Time Slots</p>
            </div>
            {chef.availability && chef.availability.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chef.availability.map((slot, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                    {slot}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No availability set</p>
            )}
          </div>
        );

      case 'dish_types':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Utensils className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Selected Dish Types</p>
            </div>
            {chef.dish_types && chef.dish_types.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chef.dish_types.map((type, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                    {type}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No dish types selected</p>
            )}
          </div>
        );

      case 'food_safety':
        const foodSafetyLabels: Record<string, { label: string; color: string }> = {
          have_certificate: { label: 'Has Certificate', color: 'bg-green-100 text-green-800' },
          getting_certificate: { label: 'Getting Certificate', color: 'bg-yellow-100 text-yellow-800' },
          need_help: { label: 'Needs Help', color: 'bg-orange-100 text-orange-800' },
        };
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Food Safety Status</p>
                {chef.food_safety_status ? (
                  <Badge className={foodSafetyLabels[chef.food_safety_status]?.color || 'bg-gray-100'}>
                    {foodSafetyLabels[chef.food_safety_status]?.label || chef.food_safety_status}
                  </Badge>
                ) : (
                  <p className="font-medium">Not provided</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'kvk_status':
        const kvkLabels: Record<string, { label: string; color: string }> = {
          have_both: { label: 'Has KVK & NVWA', color: 'bg-green-100 text-green-800' },
          in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
          need_help: { label: 'Needs Help', color: 'bg-orange-100 text-orange-800' },
        };
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">KVK/NVWA Status</p>
                {chef.kvk_status ? (
                  <Badge className={kvkLabels[chef.kvk_status]?.color || 'bg-gray-100'}>
                    {kvkLabels[chef.kvk_status]?.label || chef.kvk_status}
                  </Badge>
                ) : (
                  <p className="font-medium">Not provided</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'plan':
        const planLabels: Record<string, { label: string; commission: string }> = {
          starter: { label: 'Basic Chef', commission: '10%' },
          growth: { label: 'Pro Chef', commission: '12%' },
          pro: { label: 'Advanced Chef', commission: '14%' },
        };
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Selected Plan</p>
                {chef.plan ? (
                  <div>
                    <p className="text-xl font-semibold">{planLabels[chef.plan]?.label || chef.plan}</p>
                    <p className="text-sm text-muted-foreground">
                      Commission: {planLabels[chef.plan]?.commission || 'N/A'}
                    </p>
                  </div>
                ) : (
                  <p className="font-medium">Not selected</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'menu_reviewed':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {verification?.menu_reviewed ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> Reviewed
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="w-3 h-3 mr-1" /> Not Reviewed
                </Badge>
              )}
            </div>
            {menu && menu.dishes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Menu Items ({menu.dishes.length})</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {menu.dishes.map((dish) => (
                    <Card key={dish.id} className="p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{dish.name}</span>
                        <span className="text-green-600">€{Number(dish.price).toFixed(2)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'food_safety_viewed':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {verification?.food_safety_viewed ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> Training Viewed
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="w-3 h-3 mr-1" /> Not Viewed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Chef {verification?.food_safety_viewed ? 'has' : 'has not'} completed the food safety training videos and quiz.
            </p>
          </div>
        );

      case 'documents_uploaded':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {verification?.documents_uploaded ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> Documents Uploaded
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="w-3 h-3 mr-1" /> Pending Upload
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <span>KVK Document</span>
                  {verification?.kvk_document_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={verification.kvk_document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> View
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">Not uploaded</Badge>
                  )}
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <span>HACCP Document</span>
                  {verification?.haccp_document_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={verification.haccp_document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> View
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">Not uploaded</Badge>
                  )}
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex justify-between items-center">
                  <span>NVWA Document</span>
                  {verification?.nvwa_document_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={verification.nvwa_document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> View
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">Not uploaded</Badge>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">No details available for this task.</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{taskName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{renderTaskContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

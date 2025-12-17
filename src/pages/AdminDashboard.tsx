import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChefProfiles, ChefWithStats } from '@/hooks/useChefProfiles';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { AdminStatistics } from '@/components/admin/AdminStatistics';
import { ChefDetailsModal } from '@/components/admin/ChefDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
  LogOut,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  PhoneCall,
  UserPlus,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { calculateOnboardingProgress, calculateVerificationProgress, getOnboardingTasks, getVerificationTasks, getIncompleteTasks } from '@/lib/chefProgress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading, signOut, isAdmin } = useAuth();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [selectedChef, setSelectedChef] = useState<ChefWithStats | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);
  

  const {
    chefs,
    pendingProfiles,
    admins,
    loading: chefsLoading,
    error,
    totalCount,
    totalPages,
    analytics,
    refetch,
    updateChefStatus,
    updateChefNotes,
    assignAdmin,
    incrementCallAttempts,
    updateFollowUpDate,
  } = useChefProfiles({
    page,
    pageSize: 10,
    statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
    adminId: user?.id,
    includePending: true,
    searchQuery: searchQuery.trim() || undefined,
    sortByAdmin: adminFilter !== 'all' ? adminFilter : undefined,
  });

  const { stats: adminStats, loading: statsLoading, error: statsError } = useAdminStatistics();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Auto-sync Typeform quiz responses
  useEffect(() => {
    if (!user || !isAdmin) return;

    const syncQuizzes = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('sync-typeform-quizzes');
        
        if (error) {
          console.error('Quiz sync error:', error);
          return;
        }

        if (data?.count > 0) {
          toast({
            title: 'Quiz Data Synced',
            description: `Linked ${data.count} new quiz result(s): ${data.newlyLinked.join(', ')}`,
          });
          refetch();
        }
      } catch (err) {
        console.error('Quiz sync failed:', err);
      }
    };

    syncQuizzes();
  }, [user, isAdmin]);

  const handleStatusChange = async (chefId: string, newStatus: string) => {
    if (!user) return;

    const { error } = await updateChefStatus(chefId, newStatus, user.id, user.email || undefined);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status Updated',
        description: `Status changed to ${CRM_STATUS_CONFIG[newStatus]?.label || newStatus}`,
      });
    }
  };

  const handleAssignAdmin = async (chefId: string, newAdminId: string) => {
    if (!user) return;

    const adminIdToAssign = newAdminId === 'unassigned' ? null : newAdminId;
    const { error } = await assignAdmin(chefId, adminIdToAssign, user.id, user.email || undefined);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign admin',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Admin Assigned',
        description: adminIdToAssign ? 'Chef assigned to admin' : 'Chef unassigned',
      });
    }
  };

  const handleIncrementCalls = async (chefId: string) => {
    if (!user) return;

    const { error } = await incrementCallAttempts(chefId, user.id, user.email || undefined);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to log call',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Call Logged',
        description: 'Call attempt recorded',
      });
    }
  };

  const handleFollowUpChange = async (chefId: string, date: Date | undefined) => {
    if (!user) return;

    const { error } = await updateFollowUpDate(chefId, date || null, user.id, user.email || undefined);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set follow-up date',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Follow-up Set',
        description: date ? `Follow-up scheduled for ${format(date, 'MMM d, yyyy')}` : 'Follow-up cleared',
      });
    }
  };

  const handleNotesBlur = async (chefId: string) => {
    if (!user || editingNotes[chefId] === undefined) return;

    const { error } = await updateChefNotes(chefId, editingNotes[chefId], user.id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const [backfillLoading, setBackfillLoading] = useState(false);

  const handleBackfillProfiles = async () => {
    try {
      setBackfillLoading(true);
      toast({
        title: 'Running backfill...',
        description: 'Creating missing chef profiles',
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('backfill-chef-profiles', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Backfill Complete',
        description: data?.message || `Created ${data?.created || 0} profiles`,
      });

      refetch();
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: 'Backfill Failed',
        description: error instanceof Error ? error.message : 'Could not run backfill',
        variant: 'destructive',
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      toast({
        title: 'Exporting...',
        description: 'Fetching all chef data',
      });

      // Fetch ALL chef profiles (not paginated)
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: allChefProfiles, error: chefsError } = await supabase
        .from('chef_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (chefsError) throw chefsError;

      // Fetch ALL admin data
      const { data: allAdminData, error: adminDataError } = await supabase
        .from('chef_admin_data')
        .select('*');

      if (adminDataError) throw adminDataError;

      // Fetch ALL pending profiles
      const { data: allPending, error: pendingError } = await supabase
        .from('pending_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Merge admin data with chef profiles
      const adminDataMap = new Map(
        (allAdminData || []).map((ad) => [ad.chef_profile_id, ad])
      );

      const headers = [
        'Type',
        'Business Name',
        'Chef Name',
        'City',
        'Address',
        'Email',
        'Phone',
        'Status',
        'Created At',
        'Plan',
        'Cuisines',
        'Service Type',
        'Admin Notes',
      ];

      const rows: string[][] = [];

      (allChefProfiles || []).forEach((chef) => {
        const adminData = adminDataMap.get(chef.id);
        rows.push([
          'Chef',
          chef.business_name || '',
          chef.chef_name || '',
          chef.city || '',
          chef.address || '',
          chef.contact_email || '',
          chef.contact_phone || '',
          adminData?.admin_status || 'new',
          chef.created_at ? new Date(chef.created_at).toISOString() : '',
          chef.plan || '',
          (chef.cuisines || []).join('; '),
          chef.service_type || '',
          adminData?.admin_notes || '',
        ]);
      });

      (allPending || []).forEach((pending) => {
        rows.push([
          'Pending',
          pending.business_name || '',
          pending.chef_name || '',
          pending.city || '',
          pending.address || '',
          pending.email || '',
          pending.phone || '',
          pending.current_step || 'pending',
          pending.created_at ? new Date(pending.created_at).toISOString() : '',
          pending.plan || '',
          (pending.cuisines || []).join('; '),
          pending.service_type || '',
          '',
        ]);
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => {
              const safe = (value || '').toString().replace(/"/g, '""');
              return `"${safe}"`;
            })
            .join(',')
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chefs_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${(allChefProfiles || []).length} chefs and ${(allPending || []).length} pending profiles`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export data',
        variant: 'destructive',
      });
    }
  };

  // With server-side search, chefs already filtered - use directly
  const filteredChefs = chefs;

  if (authLoading || chefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="p-6">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSignups}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalChefs} completed, {analytics.pendingCount} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.chefsLast30Days}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.chefsLast7Days}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgCompletion}%</div>
                <p className="text-xs text-muted-foreground">Onboarding rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Distribution */}
        {analytics && (
          <Card className="mb-8 p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Status Distribution</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={`text-sm py-1 px-3 ${CRM_STATUS_CONFIG[status]?.color || 'bg-gray-100'}`}
                >
                  {CRM_STATUS_CONFIG[status]?.label || status}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Plan Distribution */}
        {analytics && analytics.planBreakdown && (
          <Card className="mb-8 p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Plan Distribution</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.planBreakdown).map(([plan, count]) => (
                <Badge
                  key={plan}
                  variant="outline"
                  className={`text-sm py-1 px-3 ${
                    plan === 'advanced' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    plan === 'pro' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    plan === 'starter' ? 'bg-green-100 text-green-800 border-green-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Admin Statistics */}
        <div className="mb-8">
          <AdminStatistics stats={adminStats} loading={statsLoading} error={statsError} />
        </div>

        {/* Incomplete Onboarding Alert */}
        {pendingProfiles && pendingProfiles.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg font-semibold text-orange-800">
                  Incomplete Onboarding ({pendingProfiles.length})
                </CardTitle>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                These chefs started onboarding but haven't completed it. Call them to help finish!
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(showAllPending ? pendingProfiles : pendingProfiles.slice(0, 6)).map((pending) => (
                  <div
                    key={pending.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {pending.business_name || pending.chef_name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {pending.email}
                      </p>
                      {pending.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {pending.city}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                        Step: {pending.current_step || 'contact'}
                      </Badge>
                      {pending.phone && (
                        <a 
                          href={`tel:${pending.phone}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {pendingProfiles.length > 6 && !showAllPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllPending(true)}
                  className="mt-4 w-full"
                >
                  See All ({pendingProfiles.length} total)
                </Button>
              )}
              {showAllPending && pendingProfiles.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllPending(false)}
                  className="mt-4 w-full"
                >
                  Show Less
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chef Pipeline */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-xl font-bold">Chef Pipeline</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search all chefs..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
                {searchQuery && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Global
                  </span>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(CRM_STATUS_CONFIG).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBackfillProfiles}
                disabled={backfillLoading}
                className="gap-2"
              >
                {backfillLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Backfill Profiles
              </Button>

            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Chef</TableHead>
                  <TableHead className="min-w-[100px]">City</TableHead>
                  <TableHead className="min-w-[120px]">Progress</TableHead>
                  <TableHead className="min-w-[80px]">Quiz</TableHead>
                  <TableHead className="min-w-[140px]">Assigned To</TableHead>
                  <TableHead className="min-w-[150px]">Status</TableHead>
                  <TableHead className="min-w-[180px]">Notes</TableHead>
                  <TableHead className="min-w-[100px]">Calls</TableHead>
                  <TableHead className="min-w-[100px]">Last Contact</TableHead>
                  <TableHead className="min-w-[140px]">Follow-up</TableHead>
                  <TableHead className="min-w-[100px]">Joined</TableHead>
                  <TableHead className="min-w-[80px]">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChefs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No chefs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChefs.map((chef) => (
                    <TableRow 
                      key={chef.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        !chef.onboarding_completed && "bg-orange-50/50 hover:bg-orange-100/50",
                        chef.onboarding_completed && "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        setSelectedChef(chef);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {chef.business_name || chef.chef_name || 'Unnamed'}
                            </p>
                            {!chef.onboarding_completed && (
                              <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                Incomplete
                              </Badge>
                            )}
                          </div>
                          {chef.contact_email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {chef.contact_email}
                            </p>
                          )}
                          {chef.contact_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {chef.contact_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {chef.city && (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {chef.city}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const onboardingProgress = calculateOnboardingProgress(chef);
                          const verificationProgress = calculateVerificationProgress(chef);
                          const incompleteOnboarding = getIncompleteTasks(getOnboardingTasks(chef));
                          const incompleteVerification = getIncompleteTasks(getVerificationTasks(chef));
                          return (
                            <div className="space-y-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <span className="text-xs text-muted-foreground w-12">Onboard</span>
                                      <div className="flex-1 bg-secondary rounded-full h-2 min-w-[40px]">
                                        <div
                                          className={cn(
                                            "h-2 rounded-full transition-all",
                                            onboardingProgress === 100 ? "bg-green-500" : "bg-primary"
                                          )}
                                          style={{ width: `${onboardingProgress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium w-8">{onboardingProgress}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[200px]">
                                    {incompleteOnboarding.length === 0 ? (
                                      <p className="text-green-600">All tasks complete!</p>
                                    ) : (
                                      <div>
                                        <p className="font-medium mb-1">Missing:</p>
                                        <ul className="text-xs space-y-0.5">
                                          {incompleteOnboarding.map(t => (
                                            <li key={t}>• {t}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <span className="text-xs text-muted-foreground w-12">Verify</span>
                                      <div className="flex-1 bg-secondary rounded-full h-2 min-w-[40px]">
                                        <div
                                          className={cn(
                                            "h-2 rounded-full transition-all",
                                            verificationProgress === 100 ? "bg-green-500" : "bg-blue-500"
                                          )}
                                          style={{ width: `${verificationProgress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium w-8">{verificationProgress}%</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[200px]">
                                    {incompleteVerification.length === 0 ? (
                                      <p className="text-green-600">All tasks complete!</p>
                                    ) : (
                                      <div>
                                        <p className="font-medium mb-1">Missing:</p>
                                        <ul className="text-xs space-y-0.5">
                                          {incompleteVerification.map(t => (
                                            <li key={t}>• {t}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {chef.verification_quiz_completed ? (
                          <div className="flex items-center gap-1">
                            <Award className={cn(
                              "w-4 h-4",
                              chef.verification_quiz_passed ? "text-green-600" : "text-orange-500"
                            )} />
                            <span className={cn(
                              "text-sm font-medium",
                              chef.verification_quiz_passed ? "text-green-600" : "text-orange-500"
                            )}>
                              {chef.verification_quiz_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={chef.assigned_admin_id || 'unassigned'}
                          onValueChange={(value) => handleAssignAdmin(chef.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <span className="flex items-center gap-1 text-sm">
                                <UserPlus className="w-3 h-3" />
                                {chef.assigned_admin_id 
                                  ? admins.find(a => a.id === chef.assigned_admin_id)?.name || 'Assigned'
                                  : 'Unassigned'}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-muted-foreground">Unassigned</span>
                            </SelectItem>
                            {admins.map((admin) => (
                              <SelectItem key={admin.id} value={admin.id}>
                                {admin.name || admin.email || `Admin ${admin.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={chef.admin_status || 'new'}
                          onValueChange={(value) => handleStatusChange(chef.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <Badge
                                className={
                                  CRM_STATUS_CONFIG[chef.admin_status || 'new']?.color ||
                                  'bg-gray-100'
                                }
                              >
                                {CRM_STATUS_CONFIG[chef.admin_status || 'new']?.label || 'New'}
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
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Textarea
                          placeholder="Add notes..."
                          value={editingNotes[chef.id] ?? chef.admin_notes ?? ''}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({
                              ...prev,
                              [chef.id]: e.target.value,
                            }))
                          }
                          onBlur={() => handleNotesBlur(chef.id)}
                          className="min-h-[60px] text-sm resize-none"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium min-w-[20px]">{chef.call_attempts || 0}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIncrementCalls(chef.id)}
                            className="gap-1 h-8"
                          >
                            <PhoneCall className="w-3 h-3" />
                            Log
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {chef.crm_last_contact_date ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(chef.crm_last_contact_date), 'MMM d')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">Never</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !chef.crm_follow_up_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {chef.crm_follow_up_date
                                ? format(new Date(chef.crm_follow_up_date), 'MMM d')
                                : 'Set'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0 z-50 bg-card border shadow-lg" 
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={chef.crm_follow_up_date ? new Date(chef.crm_follow_up_date) : undefined}
                              onSelect={(date) => handleFollowUpChange(chef.id, date)}
                              initialFocus
                              className="pointer-events-auto bg-card"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(chef.created_at), 'MMM d')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChef(chef);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Chef Details Modal */}
      {selectedChef && (
        <ChefDetailsModal
          chef={selectedChef}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedChef(null);
          }}
          onRefresh={refetch}
          onStatusChange={async (chefId, status) => {
            if (!user) return { error: 'Not authenticated' };
            return updateChefStatus(chefId, status, user.id, user.email || undefined);
          }}
          onNotesChange={async (chefId, notes) => {
            if (!user) return { error: 'Not authenticated' };
            return updateChefNotes(chefId, notes, user.id);
          }}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChefProfiles } from '@/hooks/useChefProfiles';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { AdminStatistics } from '@/components/admin/AdminStatistics';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const {
    chefs,
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
  });

  const { stats: adminStats, loading: statsLoading, error: statsError } = useAdminStatistics();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, authLoading, navigate]);

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

  const filteredChefs = chefs.filter((chef) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      chef.business_name?.toLowerCase().includes(query) ||
      chef.chef_name?.toLowerCase().includes(query) ||
      chef.contact_email?.toLowerCase().includes(query) ||
      chef.city?.toLowerCase().includes(query)
    );
  });

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
                <CardTitle className="text-sm font-medium">Total Chefs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalChefs}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
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

        {/* Admin Statistics */}
        <div className="mb-8">
          <AdminStatistics stats={adminStats} loading={statsLoading} error={statsError} />
        </div>

        {/* Chef Pipeline */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-xl font-bold">Chef Pipeline</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chefs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Chef</TableHead>
                  <TableHead className="min-w-[100px]">City</TableHead>
                  <TableHead className="min-w-[140px]">Assigned To</TableHead>
                  <TableHead className="min-w-[150px]">Status</TableHead>
                  <TableHead className="min-w-[180px]">Notes</TableHead>
                  <TableHead className="min-w-[100px]">Calls</TableHead>
                  <TableHead className="min-w-[100px]">Last Contact</TableHead>
                  <TableHead className="min-w-[140px]">Follow-up</TableHead>
                  <TableHead className="min-w-[100px]">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChefs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No chefs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChefs.map((chef) => (
                    <TableRow key={chef.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {chef.business_name || chef.chef_name || 'Unnamed'}
                          </p>
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
                      <TableCell>
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
                      <TableCell>
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
                      <TableCell>
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
                      <TableCell>
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={chef.crm_follow_up_date ? new Date(chef.crm_follow_up_date) : undefined}
                              onSelect={(date) => handleFollowUpChange(chef.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(chef.created_at), 'MMM d')}
                        </span>
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
    </div>
  );
}

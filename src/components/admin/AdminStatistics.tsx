import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Phone, Calendar, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AdminStats } from '@/hooks/useAdminStatistics';

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

interface AdminStatisticsProps {
  stats: AdminStats[];
  loading: boolean;
  error: string | null;
}

export const AdminStatistics = ({ stats, loading, error }: AdminStatisticsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading && stats.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-destructive">
          Error loading admin statistics: {error}
        </div>
      </Card>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          No admin statistics available. Assign chefs to admins to see performance data.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors border border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Employee Performance</h2>
          <Badge variant="outline" className="text-sm">
            {stats.length} {stats.length === 1 ? 'Admin' : 'Admins'}
          </Badge>
        </div>
        <button className="p-2 hover:bg-muted rounded-full transition-colors">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((admin) => (
            <Card key={admin.adminId} className="hover:shadow-lg transition-shadow h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{admin.adminName}</CardTitle>
                    {admin.adminEmail && (
                      <p className="text-sm text-muted-foreground mt-1">{admin.adminEmail}</p>
                    )}
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Assigned Chefs</p>
                    <p className="text-2xl font-bold text-foreground">{admin.assignedChefs}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-green-600">{admin.successRate}%</p>
                      <p className="text-xs text-muted-foreground">
                        ({admin.successfulConversions}/{admin.assignedChefs})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Completion */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Avg Completion
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {admin.averageCompletion}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all"
                      style={{ width: `${admin.averageCompletion}%` }}
                    />
                  </div>
                </div>

                {/* Activity Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Calls</p>
                      <p className="text-sm font-semibold">{admin.totalCalls}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Follow-ups Set</p>
                      <p className="text-sm font-semibold">{admin.totalFollowUps}</p>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                {Object.keys(admin.statusBreakdown).length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Status Breakdown
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(admin.statusBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([status, count]) => {
                          const statusKey = (!status || status === 'null' || status === 'undefined') ? 'new' : status;
                          const config = CRM_STATUS_CONFIG[statusKey];
                          
                          return (
                            <Badge
                              key={status}
                              className={cn(
                                "text-xs px-2 py-0.5 font-normal border whitespace-nowrap",
                                config?.color || "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {config?.label || statusKey}: {count}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Last Activity */}
                {admin.lastActivity && (
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Last activity: {format(new Date(admin.lastActivity), 'MMM d, yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

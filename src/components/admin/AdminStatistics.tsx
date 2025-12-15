import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Phone, Calendar, Activity, ChevronDown, ChevronUp, Star, Award, Trophy, Medal } from 'lucide-react';
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

// Calculate performance score based on calls and success rate
const calculatePerformanceScore = (admin: AdminStats): number => {
  // Weighted score: 60% success rate, 30% call efficiency, 10% activity
  const successWeight = 0.6;
  const callEfficiencyWeight = 0.3;
  const activityWeight = 0.1;

  const successScore = admin.successRate; // 0-100

  // Call efficiency: calls per chef (ideal ~3-5 calls per conversion)
  const callsPerChef = admin.assignedChefs > 0 ? admin.totalCalls / admin.assignedChefs : 0;
  // Normalize: 3-5 calls per chef = 100%, more or fewer = lower score
  const idealCalls = 4;
  const callEfficiency = callsPerChef > 0 
    ? Math.max(0, 100 - Math.abs(callsPerChef - idealCalls) * 15)
    : 0;

  // Activity score based on total interactions
  const activityScore = Math.min(100, (admin.totalCalls + admin.totalFollowUps) * 5);

  return Math.round(
    (successScore * successWeight) +
    (callEfficiency * callEfficiencyWeight) +
    (activityScore * activityWeight)
  );
};

// Get rating tier based on performance score
const getRatingTier = (score: number): { label: string; color: string; icon: typeof Trophy; stars: number } => {
  if (score >= 80) return { label: 'Top Performer', color: 'text-yellow-500', icon: Trophy, stars: 5 };
  if (score >= 60) return { label: 'High Achiever', color: 'text-emerald-500', icon: Award, stars: 4 };
  if (score >= 40) return { label: 'Solid Progress', color: 'text-blue-500', icon: Medal, stars: 3 };
  if (score >= 20) return { label: 'Building Up', color: 'text-orange-500', icon: Medal, stars: 2 };
  return { label: 'Rookie', color: 'text-gray-500', icon: Award, stars: 1 };
};

export const AdminStatistics = ({ stats, loading, error }: AdminStatisticsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate rankings dynamically
  const rankedStats = useMemo(() => {
    return stats
      .map(admin => ({
        ...admin,
        performanceScore: calculatePerformanceScore(admin),
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .map((admin, index) => ({
        ...admin,
        rank: index + 1,
        tier: getRatingTier(admin.performanceScore),
      }));
  }, [stats]);

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
          {rankedStats.map((admin) => {
            const TierIcon = admin.tier.icon;
            return (
              <Card key={admin.adminId} className={cn(
                "hover:shadow-lg transition-shadow h-full relative overflow-hidden",
                admin.rank === 1 && "ring-2 ring-yellow-400/50 bg-gradient-to-br from-yellow-50/50 to-transparent"
              )}>
                {/* Rank Badge */}
                <div className={cn(
                  "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  admin.rank === 1 && "bg-yellow-100 text-yellow-700",
                  admin.rank === 2 && "bg-gray-200 text-gray-700",
                  admin.rank === 3 && "bg-orange-100 text-orange-700",
                  admin.rank > 3 && "bg-muted text-muted-foreground"
                )}>
                  #{admin.rank}
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between pr-10">
                    <div>
                      <CardTitle className="text-lg">{admin.adminName}</CardTitle>
                      {admin.adminEmail && (
                        <p className="text-sm text-muted-foreground mt-1">{admin.adminEmail}</p>
                      )}
                    </div>
                  </div>

                  {/* Performance Rating */}
                  <div className="flex items-center gap-2 mt-3">
                    <TierIcon className={cn("h-5 w-5", admin.tier.color)} />
                    <span className={cn("text-sm font-semibold", admin.tier.color)}>
                      {admin.tier.label}
                    </span>
                    <div className="flex items-center ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4 transition-colors",
                            i < admin.tier.stars ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Performance Score Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Performance Score</span>
                      <span className="font-bold text-foreground">{admin.performanceScore}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          admin.performanceScore >= 80 && "bg-gradient-to-r from-yellow-400 to-yellow-500",
                          admin.performanceScore >= 60 && admin.performanceScore < 80 && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                          admin.performanceScore >= 40 && admin.performanceScore < 60 && "bg-gradient-to-r from-blue-400 to-blue-500",
                          admin.performanceScore >= 20 && admin.performanceScore < 40 && "bg-gradient-to-r from-orange-400 to-orange-500",
                          admin.performanceScore < 20 && "bg-gradient-to-r from-gray-400 to-gray-500"
                        )}
                        style={{ width: `${admin.performanceScore}%` }}
                      />
                    </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

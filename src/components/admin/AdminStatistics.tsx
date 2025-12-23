import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Phone, Calendar, Activity, ChevronDown, ChevronUp, Star, Award, Trophy, Medal, CheckCircle, Users, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AdminStats } from '@/hooks/useAdminStatistics';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

// Calculate performance score based on progress score and conversions
const calculatePerformanceScore = (admin: AdminStats): number => {
  // Weighted score: 50% progress score, 30% success rate, 20% activity
  const progressWeight = 0.5;
  const successWeight = 0.3;
  const activityWeight = 0.2;

  const progressScore = admin.progressScore; // 0-100
  const successScore = admin.successRate; // 0-100

  // Activity score based on total interactions (calls + follow-ups)
  const activityScore = Math.min(100, (admin.totalCalls * 10 + admin.totalFollowUps * 5));

  return Math.round(
    (progressScore * progressWeight) +
    (successScore * successWeight) +
    (activityScore * activityWeight)
  );
};

// Get rating tier based on performance score
const getRatingTier = (score: number): { label: string; color: string; icon: typeof Trophy; stars: number } => {
  if (score >= 80) return { label: 'Top Performer', color: 'text-yellow-500', icon: Trophy, stars: 5 };
  if (score >= 60) return { label: 'High Achiever', color: 'text-emerald-500', icon: Award, stars: 4 };
  if (score >= 40) return { label: 'Solid Progress', color: 'text-blue-500', icon: Medal, stars: 3 };
  if (score >= 20) return { label: 'Building Up', color: 'text-orange-500', icon: Medal, stars: 2 };
  return { label: 'Getting Started', color: 'text-gray-500', icon: Award, stars: 1 };
};

export const AdminStatistics = ({ stats, loading, error }: AdminStatisticsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (adminId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(adminId)) {
        next.delete(adminId);
      } else {
        next.add(adminId);
      }
      return next;
    });
  };

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
            const isCardExpanded = expandedCards.has(admin.adminId);
            // Top 3 get special trophy colors
            const rankColor = admin.rank === 1 
              ? 'text-yellow-500' 
              : admin.rank === 2 
                ? 'text-gray-400' 
                : admin.rank === 3 
                  ? 'text-amber-600' 
                  : admin.tier.color;
            const RankIcon = admin.rank <= 3 ? Trophy : TierIcon;
            
            return (
              <Card key={admin.adminId} className={cn(
                "hover:shadow-lg transition-shadow h-full relative overflow-hidden",
                admin.rank === 1 && "ring-2 ring-yellow-400/50 bg-gradient-to-br from-yellow-50/50 to-transparent",
                admin.rank === 2 && "ring-2 ring-gray-300/50 bg-gradient-to-br from-gray-50/50 to-transparent",
                admin.rank === 3 && "ring-2 ring-amber-400/50 bg-gradient-to-br from-amber-50/50 to-transparent"
              )}>
                {/* Rank Badge */}
                <div className={cn(
                  "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center",
                  admin.rank === 1 && "bg-yellow-100",
                  admin.rank === 2 && "bg-gray-100",
                  admin.rank === 3 && "bg-amber-100",
                  admin.rank > 3 && "bg-muted"
                )}>
                  {admin.rank <= 3 ? (
                    <Trophy className={cn(
                      "h-5 w-5",
                      admin.rank === 1 && "text-yellow-500 fill-yellow-200",
                      admin.rank === 2 && "text-gray-400 fill-gray-200",
                      admin.rank === 3 && "text-amber-600 fill-amber-200"
                    )} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">#{admin.rank}</span>
                  )}
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
                    <RankIcon className={cn("h-5 w-5", rankColor)} />
                    <span className={cn("text-sm font-semibold", rankColor)}>
                      {admin.rank <= 3 ? `#${admin.rank} ${admin.tier.label}` : admin.tier.label}
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
                      <p className="text-sm text-muted-foreground">Closed / Active</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-green-600">{admin.successfulConversions}</p>
                        <p className="text-xs text-muted-foreground">
                          ({admin.successRate}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Closed Chefs List */}
                  {admin.closedChefs.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Closed Chefs
                      </p>
                      <div className="space-y-1">
                        {admin.closedChefs.slice(0, 3).map((chef) => (
                          <div key={chef.id} className="flex items-center justify-between text-xs">
                            <span className="text-green-700 font-medium truncate max-w-[150px]">
                              {chef.businessName || chef.name}
                            </span>
                            <span className="text-green-600">
                              {format(new Date(chef.closedAt), 'MMM d')}
                            </span>
                          </div>
                        ))}
                        {admin.closedChefs.length > 3 && (
                          <p className="text-xs text-green-600 text-center pt-1">
                            +{admin.closedChefs.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chef Progress Breakdown */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Chef Progress Breakdown
                      </p>
                      <span className="text-xs font-bold text-foreground">
                        Score: {admin.progressScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-lg font-bold text-green-700">{admin.chefsByProgress.high.length}</p>
                        <p className="text-[10px] text-green-600">75%+ Ready</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                        <p className="text-lg font-bold text-yellow-700">{admin.chefsByProgress.medium.length}</p>
                        <p className="text-[10px] text-yellow-600">50-74%</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-lg font-bold text-red-700">{admin.chefsByProgress.low.length}</p>
                        <p className="text-[10px] text-red-600">&lt;50%</p>
                      </div>
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
                        <p className="text-xs text-muted-foreground">Follow-ups</p>
                        <p className="text-sm font-semibold">{admin.totalFollowUps}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Chef Details */}
                  <Collapsible open={isCardExpanded} onOpenChange={() => toggleCard(admin.adminId)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Users className="h-3 w-3" />
                        <span>{isCardExpanded ? 'Hide' : 'Show'} Chef Details</span>
                        {isCardExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pt-3 space-y-3">
                        {/* High Progress Chefs */}
                        {admin.chefsByProgress.high.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-700 mb-1">Almost Ready (75%+)</p>
                            <div className="space-y-1">
                              {admin.chefsByProgress.high.slice(0, 5).map((chef) => (
                                <div key={chef.id} className="flex items-center justify-between text-xs p-1.5 bg-green-50 rounded">
                                  <span className="truncate max-w-[120px]">{chef.businessName || chef.name}</span>
                                  <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                    {chef.progress}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Medium Progress Chefs */}
                        {admin.chefsByProgress.medium.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-yellow-700 mb-1">In Progress (50-74%)</p>
                            <div className="space-y-1">
                              {admin.chefsByProgress.medium.slice(0, 5).map((chef) => (
                                <div key={chef.id} className="flex items-center justify-between text-xs p-1.5 bg-yellow-50 rounded">
                                  <span className="truncate max-w-[120px]">{chef.businessName || chef.name}</span>
                                  <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-300">
                                    {chef.progress}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Low Progress Chefs */}
                        {admin.chefsByProgress.low.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-700 mb-1">Needs Attention (&lt;50%)</p>
                            <div className="space-y-1">
                              {admin.chefsByProgress.low.slice(0, 5).map((chef) => (
                                <div key={chef.id} className="flex items-center justify-between text-xs p-1.5 bg-red-50 rounded">
                                  <span className="truncate max-w-[120px]">{chef.businessName || chef.name}</span>
                                  <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">
                                    {chef.progress}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

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

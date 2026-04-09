import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  DollarSign,
  CalendarDays,
  Eye,
  Users,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Crown,
  MousePointerClick,
  BarChart3,
} from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  accent,
}: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className={`mt-1 text-2xl font-bold ${accent || ""}`}>{value}</p>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PixelStatusCard({
  name,
  id,
  url,
  color,
}: {
  name: string;
  id: string;
  url: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground font-mono">{id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          已安裝
        </Badge>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function AdTracking() {
  const utils = trpc.useUtils();
  const { data: summary, isLoading: summaryLoading } = trpc.admin.conversionSummary.useQuery({});
  const { data: daily, isLoading: dailyLoading } = trpc.admin.dailyConversions.useQuery({});
  const { data: pixels } = trpc.admin.adPixelConfig.useQuery();
  const { data: premiumAds, isLoading: premiumLoading } = trpc.admin.premiumAds.useQuery();
  const syncMut = trpc.admin.syncPremiumAds.useMutation({
    onSuccess: () => { utils.admin.premiumAds.invalidate(); },
  });

  const conversionRate = summary && summary.uniqueVisitors > 0
    ? ((summary.totalLoans + summary.totalAppointments) / summary.uniqueVisitors * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">廣告追蹤</h1>
        <p className="text-sm text-muted-foreground">
          Meta Pixel / Google Ads / GA4 轉換數據看板
        </p>
      </div>

      {/* Conversion Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="貸款填單"
          value={summary?.totalLoans ?? 0}
          icon={DollarSign}
          description="Meta: Lead 事件"
          loading={summaryLoading}
          accent="text-green-600"
        />
        <StatCard
          title="預約看車"
          value={summary?.totalAppointments ?? 0}
          icon={CalendarDays}
          description="Meta: Schedule 事件"
          loading={summaryLoading}
          accent="text-blue-600"
        />
        <StatCard
          title="總瀏覽量"
          value={summary?.totalPageViews ?? 0}
          icon={Eye}
          description="Meta: PageView 事件"
          loading={summaryLoading}
        />
        <StatCard
          title="不重複訪客"
          value={summary?.uniqueVisitors ?? 0}
          icon={Users}
          loading={summaryLoading}
        />
      </div>

      {/* Conversion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            轉換率
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-primary">{conversionRate}%</span>
              <span className="text-sm text-muted-foreground">
                (填單 + 預約) / 不重複訪客
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            每日轉換趨勢
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : daily && daily.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b">
                <span>日期</span>
                <span className="text-right">貸款填單</span>
                <span className="text-right">預約看車</span>
                <span className="text-right">總計</span>
              </div>
              {/* Rows */}
              {daily.slice(-14).map((row: any) => (
                <div key={row.date} className="grid grid-cols-4 text-sm py-1.5 border-b border-muted/50 last:border-0">
                  <span className="text-muted-foreground">{row.date}</span>
                  <span className="text-right font-medium text-green-600">{row.loans}</span>
                  <span className="text-right font-medium text-blue-600">{row.appointments}</span>
                  <span className="text-right font-bold">{row.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              尚無轉換資料，部署上線後數據會自動出現
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pixel Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">追蹤像素狀態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pixels ? (
            <>
              <PixelStatusCard
                name="Meta Pixel (Facebook / Instagram)"
                id={pixels.metaPixelId}
                url={pixels.metaEventsManagerUrl}
                color="bg-blue-500"
              />
              <PixelStatusCard
                name="Google Ads"
                id={pixels.googleAdsId}
                url={pixels.googleAdsUrl}
                color="bg-yellow-500"
              />
              <PixelStatusCard
                name="Google Analytics 4"
                id={pixels.ga4Id}
                url={pixels.ga4Url}
                color="bg-green-500"
              />
            </>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">事件對照表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span>使用者動作</span>
              <span>Meta Pixel 事件</span>
              <span>Google Ads 事件</span>
            </div>
            {[
              ["瀏覽頁面", "PageView", "page_view"],
              ["貸款填單送出", "Lead", "conversion"],
              ["預約看車送出", "Schedule", "conversion"],
              ["點擊電話", "Contact", "conversion"],
              ["點擊 LINE", "Contact", "conversion"],
              ["點擊地圖", "FindLocation", "conversion"],
            ].map(([action, meta, google]) => (
              <div key={action} className="grid grid-cols-3 text-sm py-1.5 border-b border-muted/50 last:border-0">
                <span>{action}</span>
                <span className="text-blue-600 font-mono text-xs">{meta}</span>
                <span className="text-yellow-700 font-mono text-xs">{google}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 8891 Premium Ads Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-orange-500" />
              8891 精選廣告成效
              {premiumAds && premiumAds.some((a: any) => a.status === "推廣中") && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">推廣中</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncMut.isPending ? "animate-spin" : ""}`} />
              {syncMut.isPending ? "同步中..." : "手動同步"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {premiumLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : premiumAds && premiumAds.length > 0 ? (
            <div className="space-y-5">
              {/* Aggregate stat cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="累計曝光量"
                  value={(premiumAds as any[]).reduce((s: number, a: any) => s + (a.impressions || 0), 0).toLocaleString()}
                  icon={Eye}
                  accent="text-orange-600"
                />
                <StatCard
                  title="累計點閱量"
                  value={(premiumAds as any[]).reduce((s: number, a: any) => s + (a.clicks || 0), 0).toLocaleString()}
                  icon={MousePointerClick}
                  accent="text-blue-600"
                />
                <StatCard
                  title="累計費用"
                  value={`NT$${(premiumAds as any[]).reduce((s: number, a: any) => s + (a.totalCost || 0), 0).toLocaleString()}`}
                  icon={DollarSign}
                  accent="text-green-600"
                />
                <StatCard
                  title="目前排名"
                  value={(() => {
                    const active = (premiumAds as any[]).find((a: any) => a.status === "推廣中" && a.currentRank);
                    return active ? `第 ${active.currentRank} 名` : "—";
                  })()}
                  icon={BarChart3}
                  accent="text-primary"
                />
              </div>

              {/* Detail rows for each ad */}
              {(premiumAds as any[]).map((ad: any) => (
                <div key={ad.itemId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ad.carName || "未知車款"}</span>
                      <span className="text-xs text-muted-foreground font-mono">{ad.itemId}</span>
                    </div>
                    <Badge variant={ad.status === "推廣中" ? "default" : "secondary"}>
                      {ad.status || "未知"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">推廣期別</p>
                      <p className="font-medium">{ad.campaignPeriod || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">推廣時間</p>
                      <p className="font-medium text-xs">{ad.periodStart && ad.periodEnd ? `${ad.periodStart} ~ ${ad.periodEnd}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">累計天數</p>
                      <p className="font-medium tabular-nums">{ad.cumulativeDays || 0} 天</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">本期出價</p>
                      <p className="font-medium tabular-nums">{ad.currentBid ? `NT$${ad.currentBid.toLocaleString()}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均排名</p>
                      <p className="font-medium tabular-nums">{ad.avgRank ? `第 ${ad.avgRank} 名` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均出價</p>
                      <p className="font-medium tabular-nums">{ad.avgBid ? `NT$${ad.avgBid.toLocaleString()}` : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground text-center">
                數據每日 08:00 自動更新
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                尚無 8891 精選廣告數據
              </p>
              <p className="text-xs text-muted-foreground">
                請先在 Railway 環境變數設定 EIGHTBALL_ACCOUNT 和 EIGHTBALL_PASSWORD，再點擊「手動同步」
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

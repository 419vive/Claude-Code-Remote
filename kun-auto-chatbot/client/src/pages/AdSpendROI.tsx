import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Plus, Trash2, BarChart3, ArrowUpDown,
} from "lucide-react";

const CHANNEL_OPTIONS = [
  { value: "8891", label: "8891 汽車交易網", color: "bg-orange-500" },
  { value: "facebook", label: "Facebook / Instagram", color: "bg-blue-500" },
  { value: "google", label: "Google Ads", color: "bg-yellow-500" },
  { value: "line", label: "LINE 廣告", color: "bg-green-500" },
  { value: "other", label: "其他", color: "bg-gray-500" },
];

function getChannelLabel(ch: string) {
  return CHANNEL_OPTIONS.find(c => c.value === ch)?.label || ch;
}
function getChannelColor(ch: string) {
  return CHANNEL_OPTIONS.find(c => c.value === ch)?.color || "bg-gray-500";
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdSpendROI() {
  const utils = trpc.useUtils();
  const { data: spendList, isLoading: spendLoading } = trpc.admin.adSpendList.useQuery();
  const { data: roiData, isLoading: roiLoading } = trpc.admin.channelROI.useQuery();
  const upsertMut = trpc.admin.adSpendUpsert.useMutation({
    onSuccess: () => { utils.admin.adSpendList.invalidate(); utils.admin.channelROI.invalidate(); },
  });
  const deleteMut = trpc.admin.adSpendDelete.useMutation({
    onSuccess: () => { utils.admin.adSpendList.invalidate(); utils.admin.channelROI.invalidate(); },
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formChannel, setFormChannel] = useState("8891");
  const [formMonth, setFormMonth] = useState(getCurrentMonth());
  const [formAmount, setFormAmount] = useState("");
  const [formListings, setFormListings] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const handleSubmit = () => {
    if (!formAmount) return;
    upsertMut.mutate({
      channel: formChannel,
      month: formMonth,
      amount: formAmount,
      listingsCount: formListings ? parseInt(formListings) : undefined,
      notes: formNotes || undefined,
    });
    setFormAmount("");
    setFormListings("");
    setFormNotes("");
    setShowForm(false);
  };

  // Aggregate ROI for summary cards
  const currentMonth = getCurrentMonth();
  const thisMonthSpend = (spendList || [])
    .filter((r: any) => r.month === currentMonth)
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  const totalSpendAll = (spendList || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  // Best CPA channel this month
  const thisMonthROI = (roiData || []).filter((r: any) => r.month === currentMonth && r.cpa !== null);
  const bestCPA = thisMonthROI.length > 0
    ? thisMonthROI.reduce((best: any, r: any) => (!best || r.cpa < best.cpa) ? r : best, null)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">廣告花費 & ROI</h1>
          <p className="text-sm text-muted-foreground">
            8891 / Facebook / Google / LINE 跨管道成本效益比較
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          新增花費
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月廣告總花費</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">NT${thisMonthSpend.toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">累計廣告總花費</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">NT${totalSpendAll.toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月最佳 CP 值管道</p>
                <p className="mt-1 text-2xl font-bold">
                  {bestCPA ? getChannelLabel(bestCPA.channel) : "—"}
                </p>
                {bestCPA && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    CPA: NT${bestCPA.cpa?.toLocaleString()}/轉換
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Spend Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新增廣告花費</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">管道</label>
                <select
                  value={formChannel}
                  onChange={e => setFormChannel(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {CHANNEL_OPTIONS.map(ch => (
                    <option key={ch.value} value={ch.value}>{ch.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">月份</label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={e => setFormMonth(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">花費 (NT$)</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="例: 5000"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">上架車數 (8891)</label>
                <input
                  type="number"
                  value={formListings}
                  onChange={e => setFormListings(e.target.value)}
                  placeholder="可選"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">備註</label>
              <input
                type="text"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="可選，例：8891 精選方案"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={!formAmount || upsertMut.isPending}>
                {upsertMut.isPending ? "儲存中..." : "儲存"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROI Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="h-4 w-4" />
            跨管道 ROI 比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roiLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : roiData && roiData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="space-y-1 min-w-[600px]">
                {/* Header */}
                <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <span>月份</span>
                  <span>管道</span>
                  <span className="text-right">花費</span>
                  <span className="text-right">訪客</span>
                  <span className="text-right">轉換</span>
                  <span className="text-right">CPA</span>
                  <span className="text-right">操作</span>
                </div>
                {/* Rows */}
                {(roiData as any[]).map((row: any) => (
                  <div key={`${row.month}-${row.channel}`} className="grid grid-cols-7 items-center text-sm py-2 border-b border-muted/50 last:border-0">
                    <span className="text-muted-foreground">{row.month}</span>
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${getChannelColor(row.channel)}`} />
                      {getChannelLabel(row.channel)}
                    </span>
                    <span className="text-right font-medium tabular-nums">NT${Number(row.spend).toLocaleString()}</span>
                    <span className="text-right tabular-nums">{row.visitors}</span>
                    <span className="text-right tabular-nums">{row.conversions}</span>
                    <span className={`text-right font-bold tabular-nums ${row.cpa !== null ? "text-green-600" : "text-muted-foreground"}`}>
                      {row.cpa !== null ? `NT$${row.cpa.toLocaleString()}` : "—"}
                    </span>
                    <span className="text-right">
                      <button
                        onClick={() => row.id && deleteMut.mutate({ id: row.id })}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              尚無資料，點「新增花費」開始記錄各管道的廣告支出
            </p>
          )}
        </CardContent>
      </Card>

      {/* Spend History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">花費記錄</CardTitle>
        </CardHeader>
        <CardContent>
          {spendLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : spendList && spendList.length > 0 ? (
            <div className="space-y-1">
              <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground pb-2 border-b">
                <span>月份</span>
                <span>管道</span>
                <span className="text-right">花費</span>
                <span className="text-right">上架數</span>
                <span>備註</span>
              </div>
              {(spendList as any[]).map((row: any) => (
                <div key={row.id} className="grid grid-cols-5 items-center text-sm py-1.5 border-b border-muted/50 last:border-0">
                  <span className="text-muted-foreground">{row.month}</span>
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getChannelColor(row.channel)}`} />
                    {getChannelLabel(row.channel)}
                  </span>
                  <span className="text-right font-medium tabular-nums">NT${Number(row.amount).toLocaleString()}</span>
                  <span className="text-right tabular-nums">{row.listingsCount ?? "—"}</span>
                  <span className="text-muted-foreground truncate">{row.notes || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">尚無花費記錄</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

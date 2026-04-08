import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, ChevronRight } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SeoFooter from "@/components/SeoFooter";
import StickyBookingBar from "@/components/StickyBookingBar";
import { VehicleListCard } from "@/components/VehicleListCard";

const LINE_OA_URL = "https://page.line.me/825oftez";

type PriceRange = "under-30" | "30-50" | "50-80" | "over-80";

interface RangeMeta {
  label: string;
  h1: string;
  description: string;
  filter: (price: number) => boolean;
}

const RANGE_META: Record<PriceRange, RangeMeta> = {
  "under-30": {
    label: "30萬以下",
    h1: "30萬以下二手車推薦｜崑家汽車",
    description:
      "預算有限也能找到好車！崑家汽車精選30萬以下優質二手車，每台車況透明、第三方認證，讓您以實惠的價格安心入手。",
    filter: (p) => p < 30,
  },
  "30-50": {
    label: "30-50萬",
    h1: "30-50萬二手車推薦｜崑家汽車",
    description:
      "30至50萬預算，是二手車市場最熱門的區間。崑家汽車提供各式車款，品質保證、車況透明，幫您找到最超值的選擇。",
    filter: (p) => p >= 30 && p < 50,
  },
  "50-80": {
    label: "50-80萬",
    h1: "50-80萬二手車推薦｜崑家汽車",
    description:
      "中高價位區間，進口車款、SUV 皆有！崑家汽車嚴選50至80萬二手車，品牌多元、車況優良，讓您開得安心、開得有面子。",
    filter: (p) => p >= 50 && p < 80,
  },
  "over-80": {
    label: "80萬以上",
    h1: "80萬以上二手車推薦｜崑家汽車",
    description:
      "頂級車款首選！崑家汽車提供80萬以上精選二手豪華車，每台皆經過嚴格車況檢驗，讓您以合理價格享受頂級駕乘體驗。",
    filter: (p) => p >= 80,
  },
};

function isValidRange(range: string): range is PriceRange {
  return Object.keys(RANGE_META).includes(range);
}

export default function PricePage() {
  const [, params] = useRoute("/price/:range");
  const [, setLocation] = useLocation();

  const rawRange = params?.range ?? "";

  if (!isValidRange(rawRange)) {
    setLocation("/");
    return null;
  }

  const range = rawRange as PriceRange;
  const meta = RANGE_META[range];

  const { data: vehiclesData, isLoading } = trpc.vehicle.list.useQuery();
  const vehicles = vehiclesData?.items;

  const filtered =
    vehicles?.filter((v) => meta.filter(Number(v.price))) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#303d4e] text-white">
        <div className="container py-6">
          <a href="/" className="text-sm text-white/60 hover:text-white/90 transition-colors">
            ← 崑家汽車
          </a>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">{meta.h1}</h1>
          <p className="mt-2 text-sm text-white/70 max-w-xl">{meta.description}</p>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="border-b bg-muted/30">
        <div className="container py-2">
          <ol className="flex items-center gap-1 text-xs text-muted-foreground">
            <li>
              <a href="/" className="hover:text-foreground transition-colors">
                首頁
              </a>
            </li>
            <li>
              <ChevronRight className="h-3 w-3" />
            </li>
            <li className="font-medium text-foreground">{meta.label} 二手車</li>
          </ol>
        </div>
      </nav>

      {/* Main content */}
      <main className="container py-6">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                共找到{" "}
                <span className="font-semibold text-foreground">
                  {filtered.length}
                </span>{" "}
                台 {meta.label} 二手車
              </p>
            )}
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            回到全部車款
          </a>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[16/10]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Car className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-base font-medium">目前沒有 {meta.label} 的車款</p>
            <p className="mt-1 text-sm">請稍後再來，或聯繫我們了解最新車況</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                回到首頁看全部車款
              </a>
              <a
                href={LINE_OA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-semibold text-white hover:bg-[#05b04c] transition-colors"
              >
                LINE 詢問最新車況
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VehicleListCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}

        {/* Internal links section */}
        <div className="mt-12 rounded-xl border bg-muted/30 p-6">
          <h2 className="text-sm font-bold mb-4">其他預算區間</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {range !== "under-30" && <a href="/price/under-30" className="text-xs text-primary hover:underline">30萬以下二手車</a>}
            {range !== "30-50" && <a href="/price/30-50" className="text-xs text-primary hover:underline">30-50萬二手車</a>}
            {range !== "50-80" && <a href="/price/50-80" className="text-xs text-primary hover:underline">50-80萬二手車</a>}
            {range !== "over-80" && <a href="/price/over-80" className="text-xs text-primary hover:underline">80萬以上二手車</a>}
          </div>
          <h2 className="text-sm font-bold mt-6 mb-4">延伸閱讀</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/blog/buy-used-car-guide" className="text-xs text-primary hover:underline">買二手車7大注意事項</a>
            <a href="/blog/used-car-loan-guide" className="text-xs text-primary hover:underline">二手車貸款全攻略</a>
            <a href="/faq" className="text-xs text-primary hover:underline">常見問題 FAQ</a>
            <a href="/blog" className="text-xs text-primary hover:underline">更多購車攻略</a>
          </div>
        </div>
      </main>

      <SeoFooter />
      <StickyBookingBar />
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, ChevronRight } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SeoFooter from "@/components/SeoFooter";
import StickyBookingBar from "@/components/StickyBookingBar";
import { VehicleListCard } from "@/components/VehicleListCard";

export default function BrandPage() {
  const [matched, params] = useRoute("/brand/:brand");
  const [, setLocation] = useLocation();

  const rawBrand = params?.brand ?? "";
  const brand = decodeURIComponent(rawBrand);

  const { data: vehiclesData, isLoading } = trpc.vehicle.list.useQuery();
  const vehicles = vehiclesData?.items;

  // Redirect if brand is empty
  if (!brand || brand.trim() === "") {
    setLocation("/");
    return null;
  }

  const filtered =
    vehicles?.filter(
      (v) => v.brand.toLowerCase() === brand.toLowerCase()
    ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#303d4e] text-white">
        <div className="container py-6">
          <a href="/" className="text-sm text-white/60 hover:text-white/90 transition-colors">
            ← 崑家汽車
          </a>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">
            {brand} 二手車推薦｜崑家汽車 高雄
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-xl">
            崑家汽車提供精選{brand}二手車，每台車況透明、第三方認證，讓您安心購車。
            在高雄買{brand}二手車，崑家是您最值得信賴的選擇。
          </p>
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
            <li className="font-medium text-foreground">{brand} 二手車</li>
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
                台 {brand} 二手車
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
            <p className="text-base font-medium">目前沒有 {brand} 的車款</p>
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
          <h2 className="text-sm font-bold mb-4">其他找車方式</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a href="/price/under-30" className="text-xs text-primary hover:underline">30萬以下二手車</a>
            <a href="/price/30-50" className="text-xs text-primary hover:underline">30-50萬二手車</a>
            <a href="/price/50-80" className="text-xs text-primary hover:underline">50-80萬二手車</a>
            <a href="/price/over-80" className="text-xs text-primary hover:underline">80萬以上二手車</a>
            <a href="/blog" className="text-xs text-primary hover:underline">購車攻略文章</a>
            <a href="/faq" className="text-xs text-primary hover:underline">常見問題 FAQ</a>
          </div>
        </div>
      </main>

      <SeoFooter />
      <StickyBookingBar />
    </div>
  );
}

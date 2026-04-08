/**
 * VehicleListCard — shared simple vehicle card for list pages.
 *
 * Used by:
 *   - pages/BrandPage.tsx
 *   - pages/PricePage.tsx
 *   - pages/ServiceAreaPage.tsx
 *
 * The interactive card on the home page (with photo carousel, compare button,
 * wishlist, swipe handlers) lives inline in pages/Home.tsx as `VehicleCard` —
 * it has different prop requirements and is intentionally separate.
 *
 * Design system: this component is the canonical implementation of the
 * "vehicle card" pattern from `docs/DESIGN.md` Section 4. Any future refactor
 * to vehicle card visuals should happen here, not in the pages that import it.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Gauge, Fuel, Calendar, ExternalLink } from "lucide-react";
import { ProgressiveImage } from "@/components/ProgressiveImage";

const LINE_OA_URL = "https://page.line.me/825oftez";

export function VehicleListCard({ vehicle }: { vehicle: any }) {
  const photos: string[] = vehicle.photoUrls
    ? vehicle.photoUrls.split("|").filter((u: string) => u.trim())
    : [];

  const lineMsg = encodeURIComponent(
    `我想了解這台 ${vehicle.brand} ${vehicle.model} ${vehicle.modelYear}年款 ${vehicle.priceDisplay || vehicle.price + "萬"}`
  );

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      {/* DESIGN.md vehicle card spec: 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {photos.length > 0 ? (
          <ProgressiveImage
            src={photos[0]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="transition-transform group-hover:scale-105"
            containerClassName="h-full w-full"
            aspectRatio="4/3"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Car className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-xs">
          {vehicle.status === "available"
            ? "在售"
            : vehicle.status === "reserved"
              ? "已預訂"
              : "已售出"}
        </Badge>
        {photos.length > 1 && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
            📷 {photos.length}
          </span>
        )}
      </div>

      <CardContent className="p-4 md:p-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* DESIGN.md: card title = text-xl font-semibold */}
            <h3 className="truncate text-xl font-semibold text-foreground leading-tight">
              {vehicle.brand} {vehicle.model}
            </h3>
            {/* DESIGN.md: body small (vehicle metadata) = text-sm text-muted-foreground */}
            <p className="text-sm text-muted-foreground">{vehicle.modelYear}年款</p>
          </div>
          {/* DESIGN.md: price = text-2xl font-bold tabular-nums foreground (price is data, not a CTA) */}
          <span className="shrink-0 text-2xl font-bold tabular-nums text-foreground leading-none">
            {vehicle.priceDisplay || `${vehicle.price}萬`}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm text-muted-foreground">
          {/* DESIGN.md: tabular-nums on mileage so numbers align */}
          <span className="flex items-center gap-1.5 tabular-nums">
            <Gauge className="h-3.5 w-3.5" /> {vehicle.mileage || "N/A"}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" /> {vehicle.fuelType || "N/A"}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {vehicle.color || "N/A"}
          </span>
          <span className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" /> {vehicle.transmission || "N/A"}
          </span>
        </div>

        {/* Action buttons — DESIGN.md: shadcn Button via asChild for <a> semantics */}
        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <a href={`/vehicle/${vehicle.id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              看詳情
            </a>
          </Button>
          {/*
            LINE 問車 — uses LINE brand green (#06C755) as a documented exception
            to the "no raw hex" rule. LINE's branding guidelines mandate this
            exact color for any LINE CTA. Keep this hex inline.
          */}
          <Button
            asChild
            size="sm"
            className="flex-1 bg-[#06C755] text-white hover:bg-[#05b04c] active:bg-[#049a43]"
          >
            <a
              href={`${LINE_OA_URL}?openQrCodeReader=false&msg=${lineMsg}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE 問車
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

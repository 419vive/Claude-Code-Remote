import { useState } from "react";
import { DollarSign, TrendingUp, HelpCircle } from "lucide-react";
import SeoFooter from "@/components/SeoFooter";

const BRANDS = [
  "Toyota", "Honda", "BMW", "Benz", "Mazda", "Nissan",
  "Lexus", "Ford", "Volkswagen", "Mitsubishi", "Hyundai",
  "Kia", "Subaru", "Volvo", "Audi", "Porsche"
];

const YEARS = Array.from({ length: 16 }, (_, i) => 2010 + i);

const BASE_PRICES: Record<string, number> = {
  "Toyota": 800000,
  "Honda": 750000,
  "BMW": 1500000,
  "Benz": 1600000,
  "Mazda": 700000,
  "Nissan": 700000,
  "Lexus": 1400000,
  "Ford": 600000,
  "Volkswagen": 900000,
  "Mitsubishi": 600000,
  "Hyundai": 550000,
  "Kia": 500000,
  "Subaru": 750000,
  "Volvo": 1200000,
  "Audi": 1400000,
  "Porsche": 2500000
};

interface ValuationResult {
  estimatedPrice: number;
  minPrice: number;
  maxPrice: number;
  depreciation: number;
}

export default function CarValuation() {
  const [brand, setBrand] = useState("Toyota");
  const [year, setYear] = useState(2020);
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState(50000);
  const [result, setResult] = useState<ValuationResult | null>(null);

  const calculateValuation = () => {
    if (!model.trim()) {
      alert("請輸入車型");
      return;
    }

    const basePrice = BASE_PRICES[brand] || 800000;
    const age = new Date().getFullYear() - year;

    // Depreciation calculation: steeper for newer cars, gradual for older ones
    let depreciationRate = 0;
    if (age === 0) depreciationRate = 0.15; // 0 years: 15% depreciation
    else if (age === 1) depreciationRate = 0.25; // 1 year: 25% depreciation
    else if (age <= 3) depreciationRate = 0.35 + (age - 2) * 0.08;
    else if (age <= 6) depreciationRate = 0.50 + (age - 3) * 0.08;
    else if (age <= 10) depreciationRate = 0.74 + (age - 6) * 0.04;
    else depreciationRate = 0.90; // 10+ years: at most 90% depreciation

    depreciationRate = Math.min(depreciationRate, 0.95); // Cap at 95%

    // Mileage factor: 15km/year is standard
    const standardMileage = (age + 1) * 15000;
    const mileageFactor = 1 - (Math.abs(mileage - standardMileage) / standardMileage) * 0.15;

    const estimatedPrice = Math.round(
      basePrice * (1 - depreciationRate) * Math.max(0.5, mileageFactor)
    );

    const minPrice = Math.round(estimatedPrice * 0.9);
    const maxPrice = Math.round(estimatedPrice * 1.1);

    setResult({
      estimatedPrice,
      minPrice,
      maxPrice,
      depreciation: depreciationRate
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      calculateValuation();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#1e2a38] to-[#0A0A0F] py-8 px-4">
        <div className="container max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
            二手車線上估價
          </h1>
          <p className="text-xl text-white/70 mb-4">
            中古車收購價格查詢
          </p>
          <p className="text-sm text-white/60">
            輸入您的愛車資訊，立即取得行情價格。估價基於市場行情，實際收購價格會依據車況而異。
          </p>
        </div>
      </div>

      {/* Valuation Tool */}
      <div className="container max-w-4xl py-10 px-4">
        <div className="bg-[#1e2a38] rounded-lg p-6 md:p-8 border border-white/10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            車輛資訊
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Brand Select */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                車型品牌 <span className="text-red-400">*</span>
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#0A0A0F] text-white border border-white/20 focus:border-primary focus:outline-none transition-colors"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                出廠年份 <span className="text-red-400">*</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-[#0A0A0F] text-white border border-white/20 focus:border-primary focus:outline-none transition-colors"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            {/* Model Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                車型 (如: RAV4, 3系列) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="例如: RAV4"
                className="w-full px-4 py-2 rounded-lg bg-[#0A0A0F] text-white border border-white/20 focus:border-primary focus:outline-none transition-colors placeholder:text-white/40"
              />
            </div>

            {/* Mileage Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                里程數 (km)
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                onKeyPress={handleKeyPress}
                min="0"
                className="w-full px-4 py-2 rounded-lg bg-[#0A0A0F] text-white border border-white/20 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={calculateValuation}
            className="w-full mt-8 px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-5 w-5" />
            立即估價
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {/* Estimated Price Card */}
            <div className="bg-[#1e2a38] rounded-lg p-6 border border-primary/30">
              <h3 className="text-sm font-medium text-white/60 mb-2">預估收購價</h3>
              <p className="text-3xl font-bold text-primary mb-2">
                {result.estimatedPrice.toLocaleString("zh-TW")}
              </p>
              <p className="text-xs text-white/50">新台幣</p>
            </div>

            {/* Price Range Card */}
            <div className="bg-[#1e2a38] rounded-lg p-6 border border-white/10">
              <h3 className="text-sm font-medium text-white/60 mb-2">價格區間</h3>
              <div className="space-y-1">
                <p className="text-sm text-white/80">
                  {result.minPrice.toLocaleString("zh-TW")} ~
                </p>
                <p className="text-xl font-semibold text-white">
                  {result.maxPrice.toLocaleString("zh-TW")}
                </p>
              </div>
            </div>

            {/* Depreciation Card */}
            <div className="bg-[#1e2a38] rounded-lg p-6 border border-white/10">
              <h3 className="text-sm font-medium text-white/60 mb-2">車齡折舊</h3>
              <p className="text-3xl font-bold text-white mb-2">
                {(result.depreciation * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-white/50">距離出廠年份</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-[#1e2a38]/50 rounded-lg p-6 border border-white/10">
          <p className="text-xs text-white/60 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              本估價基於台灣二手車市場平均行情。實際收購價格會依據車況、事故紀錄、里程數、內裝品質等因素進行調整。如欲取得最準確的估價，建議與我們聯繫進行現場鑑定。
            </span>
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-[#1e2a38]/30 py-12 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold mb-8">常見問題</h2>

          <div className="space-y-6">
            {/* FAQ Item 1 */}
            <div className="border-l-4 border-primary pl-6">
              <h3 className="font-semibold text-white mb-2">
                二手車估價的準確度有多高？
              </h3>
              <p className="text-white/70 text-sm">
                我們的線上估價是基於市場平均行情。實際收購價格可能上下浮動 5-15%，主要取決於車況、事故紀錄、保養狀況、內裝品質等因素。建議現場鑑定以取得最精準的估價。
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div className="border-l-4 border-primary pl-6">
              <h3 className="font-semibold text-white mb-2">
                估價包含哪些因素？
              </h3>
              <p className="text-white/70 text-sm">
                估價考慮品牌、年份、里程數、折舊率等基本因素。不含：事故紀錄、泡水狀況、維修紀錄、內裝品質等。這些因素會在現場鑑定時詳細評估。
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div className="border-l-4 border-primary pl-6">
              <h3 className="font-semibold text-white mb-2">
                如何取得準確的估價？
              </h3>
              <p className="text-white/70 text-sm">
                歡迎致電 0936-812-818 或 LINE 聯繫（@825oftez），我們的專業鑑定師會為您提供詳細的現場估價。高雄地區可免費上門鑑定，外縣市亦提供估價服務。
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div className="border-l-4 border-primary pl-6">
              <h3 className="font-semibold text-white mb-2">
                賣車流程需要多久？
              </h3>
              <p className="text-white/70 text-sm">
                從估價、簽約到完成過戶，最快可在 1-3 個工作天內完成。我們提供快速高效的賣車服務，同時確保您的權益。
              </p>
            </div>

            {/* FAQ Item 5 */}
            <div className="border-l-4 border-primary pl-6">
              <h3 className="font-semibold text-white mb-2">
                換車時可以直接折扣嗎？
              </h3>
              <p className="text-white/70 text-sm">
                可以！我們提供舊車折扣方案。您可以在購買新車時，將舊車作為折扣抵用，省去單獨賣車的時間，一次完成換車流程。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#1e2a38] py-10 px-4 border-t border-white/10">
        <div className="container max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">還想深入了解二手車？</h2>
          <p className="text-white/70 mb-6">
            瀏覽我們的購車攻略，學習更多二手車相關知識。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/blog"
              className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
            >
              購車攻略
            </a>
            <a
              href="/loan-inquiry"
              className="px-6 py-2 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors"
            >
              貸款試算
            </a>
            <a
              href="/book-visit"
              className="px-6 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              預約看車
            </a>
          </div>
        </div>
      </div>

      <SeoFooter />
    </div>
  );
}

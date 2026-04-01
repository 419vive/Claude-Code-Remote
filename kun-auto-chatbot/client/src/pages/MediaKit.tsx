import { ChevronRight, MapPin, Award, Users, MessageSquare } from "lucide-react";
import SeoFooter from "@/components/SeoFooter";

export default function MediaKit() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#303d4e] text-white">
        <div className="container py-8">
          <a href="/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/90 mb-3 transition-colors">
            ← 回到首頁
          </a>
          <h1 className="text-3xl font-bold mb-3">媒體報導與合作夥伴</h1>
          <p className="text-base text-white/80 max-w-2xl">
            崑家汽車歡迎媒體報導、新聞媒體合作與商業夥伴洽詢。
          </p>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container py-2">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">首頁</a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">媒體與合作</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Business Introduction */}
          <section className="bg-white rounded-2xl border p-8">
            <h2 className="text-2xl font-bold mb-4">崑家汽車介紹</h2>
            <div className="space-y-3 text-sm text-foreground/80">
              <p>
                <strong>公司名稱：</strong> 崑家汽車 KUN MOTORS
              </p>
              <p>
                <strong>營業項目：</strong> 二手車買賣、汽車貸款媒合、車輛認證代辦、過戶服務
              </p>
              <p>
                <strong>成立年份：</strong> 1984年
              </p>
              <p>
                <strong>總部位置：</strong> 高雄市三民區大順二路269號（肯德基斜對面）
              </p>
              <p>
                <strong>聯絡電話：</strong> 0956-607-498
              </p>
              <p>
                <strong>營業時間：</strong> 週一至週日 09:30-20:00
              </p>
              <p>
                <strong>官方網站：</strong> <a href="https://claude-code-remote-production.up.railway.app" className="text-primary hover:underline">https://claude-code-remote-production.up.railway.app</a>
              </p>
              <p>
                <strong>LINE官方帳號：</strong> @825oftez
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold text-base mb-3">公司願景</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                成為南部最值得信賴的二手車服務平台，透過透明定價、全車第三方認證、專業貸款團隊，讓每位客人都能安心購車。我們堅守正派經營的原則，從不為了短期利益而犧牲長期信譽，這也是為什麼崑家汽車能在高雄屹立40年，成為世代相傳的購車首選。
              </p>
            </div>
          </section>

          {/* Key Statistics */}
          <section>
            <h2 className="text-2xl font-bold mb-6">崑家汽車一覽</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-white p-6 text-center">
                <div className="text-3xl font-bold text-[#C4A265] mb-2">40</div>
                <p className="text-xs text-foreground/70">年在地經營</p>
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <div className="text-3xl font-bold text-[#C4A265] mb-2">5</div>
                <p className="text-xs text-foreground/70">縣市服務範圍</p>
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <div className="text-3xl font-bold text-[#C4A265] mb-2">100%</div>
                <p className="text-xs text-foreground/70">全車第三方認證</p>
              </div>
              <div className="rounded-lg border bg-white p-6 text-center">
                <div className="text-3xl font-bold text-[#C4A265] mb-2">3hrs</div>
                <p className="text-xs text-foreground/70">最快交車時間</p>
              </div>
            </div>
          </section>

          {/* Service Areas */}
          <section className="bg-muted/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#C4A265]" />
              服務範圍
            </h2>
            <p className="text-sm text-foreground/80 mb-6">
              崑家汽車雖然總店位於高雄三民區，但服務範圍涵蓋南部五大縣市：
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { area: "高雄市", desc: "總店所在地" },
                { area: "台南市", desc: "全城市服務" },
                { area: "屏東縣", desc: "全城市服務" },
                { area: "嘉義市", desc: "全城市服務" },
                { area: "台中市", desc: "南投以南" }
              ].map((item) => (
                <div key={item.area} className="rounded-lg bg-white p-4 text-center">
                  <div className="font-semibold text-base">{item.area}</div>
                  <div className="text-xs text-foreground/60">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Core Strengths */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award className="h-6 w-6 text-[#C4A265]" />
              核心競爭優勢
            </h2>
            <div className="space-y-3">
              {[
                "40年在地信譽與口碑",
                "全車獨立第三方認證",
                "實車實價、透明定價",
                "超強貸款團隊、多家銀行合作",
                "最快3小時交車",
                "外縣市免費接駕服務",
                "過戶完全代辦、無額外手續費",
                "歡迎自行攜帶驗車師傅"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-[#C4A265]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Logo & Brand Assets */}
          <section className="bg-white border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">品牌資產</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-base mb-3">官方Logo</h3>
                <div className="bg-muted rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-[#C4A265]">KUN MOTORS</div>
                  <p className="text-xs text-foreground/60 mt-2">崑家汽車官方標識</p>
                </div>
                <p className="text-xs text-foreground/70 mt-3">
                  報導或推薦時可使用上述標識。高清Logo文件可透過聯絡我們申請。
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">品牌配色</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="h-20 bg-[#303d4e] rounded-lg mb-2" />
                    <p className="text-xs text-foreground/70">深灰藍 #303d4e</p>
                  </div>
                  <div>
                    <div className="h-20 bg-[#C4A265] rounded-lg mb-2" />
                    <p className="text-xs text-foreground/70">金色 #C4A265</p>
                  </div>
                  <div>
                    <div className="h-20 bg-white border-2 border-foreground/20 rounded-lg mb-2" />
                    <p className="text-xs text-foreground/70">白色 #FFFFFF</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Partnership Inquiry */}
          <section className="bg-blue-50 border border-blue-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-[#C4A265]" />
              合作夥伴洽詢
            </h2>
            <p className="text-sm text-foreground/80 mb-6">
              崑家汽車歡迎以下類型的媒體及商業合作：
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-white rounded-lg p-4 border-l-4 border-[#C4A265]">
                <h3 className="font-semibold text-sm mb-2">新聞媒體</h3>
                <p className="text-xs text-foreground/70">
                  報紙、廣播、電視、新聞網站、汽車雜誌等媒體，歡迎採訪、報導或邀請評論。
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border-l-4 border-[#C4A265]">
                <h3 className="font-semibold text-sm mb-2">內容創作者</h3>
                <p className="text-xs text-foreground/70">
                  YouTube、部落格、Podcast、社群媒體等創作者，可洽詢合作及贊助機會。
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border-l-4 border-[#C4A265]">
                <h3 className="font-semibold text-sm mb-2">汽車及金融服務平台</h3>
                <p className="text-xs text-foreground/70">
                  二手車資訊平台、貸款媒合平台、汽車保險代理等，歡迎討論合作事宜。
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border-l-4 border-[#C4A265]">
                <h3 className="font-semibold text-sm mb-2">企業聯盟</h3>
                <p className="text-xs text-foreground/70">
                  汽車相關企業聯盟、商會、同業組織等，歡迎洽詢會員合作及資源分享。
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border-t-4 border-[#C4A265]">
              <h3 className="font-semibold text-base mb-4">聯絡我們進行合作洽詢</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-foreground/60 mb-1">電話</p>
                  <a href="tel:0956607498" className="text-sm font-semibold text-primary hover:underline">
                    0956-607-498
                  </a>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 mb-1">LINE官方帳號</p>
                  <a href="https://page.line.me/825oftez" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                    @825oftez
                  </a>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 mb-1">親臨總店</p>
                  <p className="text-sm">高雄市三民區大順二路269號</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 mb-1">營業時間</p>
                  <p className="text-sm">週一至週日 09:30-20:00</p>
                </div>
              </div>
            </div>
          </section>

          {/* Press Contact */}
          <section className="bg-[#303d4e] text-white rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-[#C4A265]" />
              媒體聯絡資訊
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">聯絡方式</h3>
                <ul className="space-y-2 text-xs text-white/80">
                  <li>
                    <strong>公司：</strong> 崑家汽車 KUN MOTORS
                  </li>
                  <li>
                    <strong>地址：</strong> 高雄市三民區大順二路269號
                  </li>
                  <li>
                    <strong>電話：</strong> 0956-607-498
                  </li>
                  <li>
                    <strong>LINE：</strong> @825oftez
                  </li>
                  <li>
                    <strong>網站：</strong> https://claude-code-remote-production.up.railway.app
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-3">營業資訊</h3>
                <ul className="space-y-2 text-xs text-white/80">
                  <li>
                    <strong>成立年份：</strong> 1984年
                  </li>
                  <li>
                    <strong>經營年數：</strong> 40年
                  </li>
                  <li>
                    <strong>營業時間：</strong> 週一至週日 09:30-20:00
                  </li>
                  <li>
                    <strong>服務地區：</strong> 高雄、台南、屏東、嘉義、台中
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-xs text-white/70 mb-4">
                感謝媒體朋友的關注與報導。我們誠摯邀請各位業者蒞臨總店訪問，深入了解崑家汽車的運營模式、服務流程及客戶見證。歡迎透過任何管道聯絡我們！
              </p>
              <a
                href="https://page.line.me/825oftez"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#05b04c] transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE聯絡我們
              </a>
            </div>
          </section>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}

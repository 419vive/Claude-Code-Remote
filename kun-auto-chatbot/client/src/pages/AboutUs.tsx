import { ChevronRight, Award, Users, MapPin, Clock, Shield, Zap } from "lucide-react";
import SeoFooter from "@/components/SeoFooter";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#303d4e] text-white">
        <div className="container py-8">
          <a href="/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/90 mb-3 transition-colors">
            ← 回到首頁
          </a>
          <h1 className="text-3xl font-bold mb-3">關於崑家汽車</h1>
          <p className="text-base text-white/80 max-w-2xl">
            高雄在地40年二手車經銷商，以正派經營、透明定價、專業服務聞名於高雄及南部五縣市。
          </p>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="container py-2">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">首頁</a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">關於我們</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Company History Section */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Award className="h-6 w-6 text-[#C4A265]" />
              崑家汽車的故事
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                崑家汽車成立於1984年，至今已在高雄扎根40年。我們從最初的小規模二手車買賣，逐步成長為高雄三民區大順二路上的知名車行。
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                40年的經營中，我們見證了台灣汽車市場的演變，也承諾始終如一地提供正派、透明的服務。崑家汽車不走「高明細」路線，反而以實在價格和誠心待客闖出口碑，成為許多高雄人、甚至台南、屏東、嘉義、台中客人的信任選擇。
              </p>
            </div>
          </section>

          {/* Core Values */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6 text-[#C4A265]" />
              我們的核心價值
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-base mb-2">正派經營</h3>
                <p className="text-xs text-foreground/70">不誇大不隱瞞，每台車的里程、車況、歷史完全透明。買來不滿意也沒關係，我們歡迎任何驗車師傅到場檢查。</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-base mb-2">全車第三方認證</h3>
                <p className="text-xs text-foreground/70">與獨立認證機構合作，每台車都有書面認證報告。認證費用已包含在整備成本內，買家無須額外負擔。</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-base mb-2">實車實價</h3>
                <p className="text-xs text-foreground/70">標價就是成交價，無隱藏費用。合理議價空間約3%-5%，讓您買得放心。</p>
              </div>
              <div className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-base mb-2">高效交車</h3>
                <p className="text-xs text-foreground/70">最快3小時即可完成過戶及交車手續，無須等待。我們提供一站式服務，讓您當天就能開車回家。</p>
              </div>
            </div>
          </section>

          {/* Meet the Team */}
          <section className="bg-muted/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-[#C4A265]" />
              認識我們的團隊
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-[#C4A265] pl-4">
                <h3 className="font-bold text-lg mb-1">崑哥（創辦人）</h3>
                <p className="text-sm text-foreground/70 mb-2">高雄在地40年經驗，見證台灣二手車市場發展，深諳車況評估和市場行情。崑哥的堅持是：不賺昧心錢，只賣放心車。</p>
                <p className="text-xs text-foreground/60">聯絡方式：0956-607-498（週一至週日 09:30-20:00）</p>
              </div>
              <div className="border-l-4 border-[#C4A265] pl-4">
                <h3 className="font-bold text-lg mb-1">貸款專員團隊</h3>
                <p className="text-sm text-foreground/70">與多家銀行及融資公司合作，專業評估貸款方案，最快1天核貸。無論信用瑕疵、無薪資轉帳，我們都能幫您找到最適的方案。</p>
              </div>
              <div className="border-l-4 border-[#C4A265] pl-4">
                <h3 className="font-bold text-lg mb-1">驗車及整備團隊</h3>
                <p className="text-sm text-foreground/70">與認證機構緊密配合，確保每台車都經過嚴格檢查。整備團隊細心照顧每個細節，只有在車況達標後才送到客人手上。</p>
              </div>
            </div>
          </section>

          {/* Service Areas */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#C4A265]" />
              服務範圍
            </h2>
            <p className="text-sm text-foreground/70 mb-4">
              雖然總店位於高雄三民區，但我們的服務不局限於高雄。外縣市客人可享有以下服務：
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {["高雄", "台南", "屏東", "嘉義", "台中"].map((area) => (
                <div key={area} className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-[#C4A265] shrink-0" />
                  <span>{area}二手車交易</span>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">高雄以外客人享有：</h4>
              <ul className="text-xs text-foreground/70 space-y-1.5">
                <li>✓ 免費到高鐵左營站接駁（台中以南）</li>
                <li>✓ 專業線上看車諮詢</li>
                <li>✓ 貸款全程線上辦理</li>
                <li>✓ 可自行攜帶驗車師傅到場檢查</li>
                <li>✓ 過戶代辦服務，無額外手續費</li>
              </ul>
            </div>
          </section>

          {/* Why Choose Us */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Zap className="h-6 w-6 text-[#C4A265]" />
              為什麼選擇崑家汽車？
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: "40年在地信譽",
                  desc: "四十年來扎根高雄，靠口碑一步步累積，是三民區大順路上的老字號，許多客人甚至是「世代相傳」的買家。"
                },
                {
                  title: "全車第三方認證＋實車實價",
                  desc: "每台車都有獨立認證報告，定價透明無隱藏費用。在崑家買車，你看到的價格就是最終價格，不需要擔心被追加費用。"
                },
                {
                  title: "超強貸款團隊",
                  desc: "合作多家銀行及融資公司，貸款成功率高、審核速度快。即使信用瑕疵或無薪資轉帳也有辦法，最快1天核貸。"
                },
                {
                  title: "最快3小時交車",
                  desc: "確定購車後，文件準備、過戶申辦、交車檢查，最快3小時全部搞定。外縣市客人無須來回奔波，高效率完成交易。"
                },
                {
                  title: "外縣市免費接駁＋過戶免手續費",
                  desc: "台南、屏東、嘉義、台中的客人搭高鐵到高雄，我們免費接駆。過戶更是完全代辦，不額外收手續費。"
                },
                {
                  title: "歡迎攜帶驗車師傅",
                  desc: "對車況有疑慮？沒問題，你可以自行聘請驗車師傅到場檢查，我們完全配合。這正是我們對品質的信心。"
                }
              ].map((item, i) => (
                <div key={i} className="border-l-4 border-[#C4A265] bg-white pl-4 py-3 rounded-r">
                  <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-foreground/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Certifications & Guarantees */}
          <section className="bg-white border rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award className="h-6 w-6 text-[#C4A265]" />
              認證與保障
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="font-bold text-base mb-2">第三方認證報告</h3>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                  所有車輛均通過獨立認證機構檢查，涵蓋車身鈑金、引擎、底盤、電子系統、里程真偽等全面項目。認證報告在成交時附贈，無額外費用。
                </p>
              </div>
              <div>
                <h3 className="font-bold text-base mb-2">車況透明保障</h3>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                  不誇大不隱瞞，車輛里程、過戶次數、修復紀錄一覽無遺。交車前若發現品質未符預期，客人有完整的權利要求解決。
                </p>
              </div>
              <div>
                <h3 className="font-bold text-base mb-2">貸款保障</h3>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                  與正規銀行及融資公司合作，貸款流程透明、利率公開。無隱藏費用，所有條款白紙黑字，簽約前完全理解再說好。
                </p>
              </div>
              <div>
                <h3 className="font-bold text-base mb-2">過戶代辦服務</h3>
                <p className="text-xs text-foreground/70 leading-relaxed mb-3">
                  我們代客到監理站辦理過戶手續，最快1-2個工作天完成。客人無須自行奔波，完全無手續費。
                </p>
              </div>
            </div>
          </section>

          {/* Google Maps Embed */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#C4A265]" />
              來訪我們
            </h2>
            <div className="overflow-hidden rounded-lg border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3681.9234567890123!2d120.3189!3d22.6444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f10c3b8d8b8b8b9%3A0x8b8b8b8b8b8b8b8b!2z6auY5rSl5r!5e0!3m2!1szh-TW!2s!4v1234567890"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-[#303d4e] text-white rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">聯絡崑家汽車</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#C4A265]" />
                  地址
                </h3>
                <p className="text-xs text-white/80">
                  高雄市三民區大順二路269號（肯德基斜對面）
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">電話</h3>
                <a href="tel:0956607498" className="text-xs text-[#C4A265] hover:text-white transition-colors">
                  0956-607-498
                </a>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#C4A265]" />
                  營業時間
                </h3>
                <p className="text-xs text-white/80">
                  週一至週日 9:30-20:00
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/20">
              <h3 className="font-semibold text-sm mb-4">立即聯絡我們</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://page.line.me/825oftez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#05b04c] transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  LINE 免費諮詢 @825oftez
                </a>
                <a
                  href="tel:0956607498"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
                >
                  直接撥電：0956-607-498
                </a>
              </div>
            </div>
          </section>

          {/* Internal Links */}
          <div className="mt-12 rounded-xl border bg-muted/30 p-6">
            <h2 className="text-sm font-bold mb-4">更多資訊</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href="/car-valuation" className="text-xs text-primary hover:underline">
                📊 二手車估價工具
              </a>
              <a href="/blog" className="text-xs text-primary hover:underline">
                📖 購車攻略部落格
              </a>
              <a href="/faq" className="text-xs text-primary hover:underline">
                ❓ 常見問題 FAQ
              </a>
              <a href="/loan-inquiry" className="text-xs text-primary hover:underline">
                💰 貸款試算
              </a>
            </div>
          </div>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}

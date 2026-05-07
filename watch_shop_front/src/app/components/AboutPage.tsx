import { Link, useLocation } from "react-router";
import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

const sections = [
  { id: "story", key: "ourStory" },
  { id: "privacy", key: "privacyPolicy" },
  { id: "terms", key: "termsConditions" },
  { id: "delivery", key: "deliveryPolicy" },
  { id: "returns", key: "returnPolicy" },
  { id: "warranty", key: "warranty" },
  { id: "repairs", key: "repairs" },
  { id: "faq", key: "faq" },
  { id: "guide", key: "buyingGuide" },
  { id: "contact", key: "contactUs" },
] as const;

export function AboutPage() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash && refs.current[hash]) {
      refs.current[hash]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  const isZh = lang === "zh";

  const SectionContent = () => {
    switch (location.hash.slice(1)) {
      case "privacy":
        return (
          <div className="space-y-6">
            <p className="text-base leading-relaxed">
              {isZh
                ? "我们非常重视您的隐私保护。本政策说明我们如何收集、使用和保护您的个人信息。"
                : "We take your privacy seriously. This policy explains how we collect, use, and protect your personal information."}
            </p>
            <div className="space-y-4">
              {[
                { title: isZh ? "信息收集" : "Information Collection", content: isZh ? "我们收集您下订单时提供的信息（姓名、地址、联系方式）" : "We collect information you provide when placing orders (name, address, contact details)" },
                { title: isZh ? "信息使用" : "Information Usage", content: isZh ? "我们使用这些信息处理订单、发货和客户服务" : "We use this information to process orders, shipping, and customer service" },
                { title: isZh ? "信息保护" : "Information Protection", content: isZh ? "我们不会向第三方出售或出租您的个人信息" : "We do not sell or rent your personal information to third parties" },
                { title: isZh ? "支付安全" : "Payment Security", content: isZh ? "您的支付信息通过安全加密传输" : "Your payment information is transmitted via secure encryption" },
                { title: isZh ? "您的权利" : "Your Rights", content: isZh ? "您可以随时要求查看、修改或删除您的个人信息" : "You can request to view, modify, or delete your personal information at any time" },
              ].map((item, i) => (
                <div key={i} className="border-l border-primary/30 pl-6">
                  <h4 className="text-foreground font-medium mb-2">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "terms":
        return (
          <div className="space-y-6">
            <p className="text-base leading-relaxed">
              {isZh
                ? "欢迎访问 VS Factory 官方网站。使用本网站即表示同意以下条款："
                : "Welcome to VS Factory official website. By using this site, you agree to the following terms:"}
            </p>
            <div className="space-y-6">
              {[
                { num: "01", title: isZh ? "网站内容" : "Website Content", content: isZh ? "所有内容包括图片、商标和文字均为 VS Factory 财产，未经许可不得使用。" : "All content including images, trademarks, and text are property of VS Factory and cannot be used without permission." },
                { num: "02", title: isZh ? "商品价格" : "Product Prices", content: isZh ? "所有价格以网页显示为准，如有变动恕不另行通知。" : "All prices as shown on the website are subject to change without notice." },
                { num: "03", title: isZh ? "订单确认" : "Order Confirmation", content: isZh ? "我们保留接受或拒绝任何订单的权利。" : "We reserve the right to accept or reject any order." },
                { num: "04", title: isZh ? "法律责任" : "Liability", content: isZh ? "本网站信息按'现状'提供，不作任何明示或暗示的保证。" : "Information on this site is provided 'as is' without warranties of any kind." },
              ].map((item) => (
                <div key={item.num} className="flex gap-4">
                  <span className="text-4xl font-light text-primary/20" style={{ fontFamily: "'Playfair Display', serif" }}>{item.num}</span>
                  <div>
                    <h4 className="text-lg font-medium text-foreground mb-2">{item.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "delivery":
        return (
          <div className="space-y-8">
            <p className="text-xl text-center text-muted-foreground">
              {isZh ? "我们提供全球免费配送服务" : "We offer free worldwide shipping"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: isZh ? "配送范围" : "Shipping Area", value: isZh ? "全球配送" : "Worldwide delivery", desc: isZh ? "覆盖 200+ 国家和地区" : "Covering 200+ countries" },
                { title: isZh ? "配送时间" : "Delivery Time", value: "3-7 " + (isZh ? "个工作日" : "business days"), desc: isZh ? "国际快递服务" : "International express" },
                { title: isZh ? "配送费用" : "Shipping Cost", value: isZh ? "免费" : "Free", desc: isZh ? "所有订单免运费" : "Free on all orders" },
                { title: isZh ? "订单追踪" : "Order Tracking", value: isZh ? "实时追踪" : "Real-time tracking", desc: isZh ? "发货后提供追踪号" : "Tracking provided after shipment" },
                { title: isZh ? "包装" : "Packaging", value: isZh ? "奢华礼盒" : "Luxury gift box", desc: isZh ? "精美包装适合送礼" : "Perfect for gifting" },
                { title: isZh ? "保险" : "Insurance", value: isZh ? "全额保价" : "Fully insured", desc: isZh ? "运输全程保障" : "Full coverage during transit" },
              ].map((item) => (
                <div key={item.title} className="text-center p-6 rounded-lg border border-border/50 bg-background/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{item.title}</p>
                  <p className="text-2xl text-primary font-light mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "returns":
        return (
          <div className="text-center space-y-8 py-8">
            <div className="inline-block">
              <p className="text-7xl text-primary font-light" style={{ fontFamily: "'Playfair Display', serif" }}>30</p>
              <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2">{isZh ? "天无忧退换" : "Days Hassle-Free Returns"}</p>
            </div>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isZh ? "自签收之日起 30 天内，如商品有任何问题，我们提供免费退换服务。" : "Within 30 days from receipt, if there are any issues with the product, we offer free return and exchange service."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto pt-8">
              {[
                { title: isZh ? "保持原包装" : "Original Packaging", desc: isZh ? "商品及配件需保持完整" : "Item and accessories must be intact" },
                { title: isZh ? "快速退款" : "Fast Refund", desc: isZh ? "3-5 个工作日处理退款" : "Refund processed in 3-5 business days" },
                { title: isZh ? "免费退换" : "Free Exchange", desc: isZh ? "我们承担退换运费" : "We cover return shipping costs" },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <p className="text-foreground font-medium mb-2">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "warranty":
        return (
          <div className="text-center space-y-8 py-8">
            <div className="inline-block">
              <p className="text-7xl text-primary font-light" style={{ fontFamily: "'Playfair Display', serif" }}>5</p>
              <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2">{isZh ? "年全球联保" : "Year International Warranty"}</p>
            </div>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {isZh ? "所有 VS Factory 腕表提供 5 年全球联保服务。" : "All VS Factory watches come with a 5-year international warranty."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8">
              {[
                { text: isZh ? "机芯故障" : "Movement Defects", covered: true },
                { text: isZh ? "制造缺陷" : "Manufacturing Flaws", covered: true },
                { text: isZh ? "材质问题" : "Material Issues", covered: true },
                { text: isZh ? "人为损坏" : "Accidental Damage", covered: false },
              ].map((item) => (
                <div key={item.text} className={`p-4 rounded border ${item.covered ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'}`}>
                  <span className={item.covered ? 'text-primary' : 'text-muted-foreground'}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "repairs":
        return (
          <div className="space-y-8">
            <p className="text-center text-muted-foreground">
              {isZh ? "我们提供专业的腕表维修保养服务，确保您的爱表始终保持最佳状态。" : "We provide professional watch repair and maintenance services to keep your timepiece in perfect condition."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: isZh ? "定期保养" : "Regular Maintenance", desc: isZh ? "延长腕表使用寿命，建议每 3-5 年进行一次全面保养。" : "Extend watch lifespan, recommended every 3-5 years for full service." },
                { title: isZh ? "机芯维修" : "Movement Repair", desc: isZh ? "由认证技师进行专业维修，使用原厂配件。" : "Professional repair by certified technicians with original parts." },
                { title: isZh ? "表带更换" : "Strap Replacement", desc: isZh ? "提供多种材质表带选择，包括皮质、金属和橡胶。" : "Various strap options including leather, metal, and rubber." },
                { title: isZh ? "防水测试" : "Water Resistance", desc: isZh ? "专业设备检测防水性能，确保使用安全。" : "Professional testing to ensure water resistance and safety." },
              ].map((item) => (
                <div key={item.title} className="p-6 rounded-lg border border-border/50">
                  <h4 className="text-foreground font-medium mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground pt-4">
              {isZh ? "维修周期：7-14 个工作日 | 保修期内免费，保修期外收取成本费" : "Service time: 7-14 business days | Free during warranty, cost-based after warranty"}
            </p>
          </div>
        );
      case "faq":
        return (
          <div className="space-y-4">
            {[
              {
                q: isZh ? "如何确认订单？" : "How do I confirm my order?",
                a: isZh ? "下单后您会收到确认邮件，包含订单详情和预计发货时间。" : "You'll receive a confirmation email with order details and estimated shipping time after placing your order.",
              },
              {
                q: isZh ? "支持哪些支付方式？" : "What payment methods do you accept?",
                a: isZh ? "我们支持 VISA、Mastercard、PayPal 和 Apple Pay。" : "We accept VISA, Mastercard, PayPal, and Apple Pay.",
              },
              {
                q: isZh ? "腕表是全新的吗？" : "Are the watches brand new?",
                a: isZh ? "是的，所有腕表均为全新，配有完整包装和保修卡。" : "Yes, all watches are brand new with complete packaging and warranty cards.",
              },
              {
                q: isZh ? "如何追踪订单？" : "How can I track my order?",
                a: isZh ? "发货后您会收到追踪号码，可在网站上实时查看物流状态。" : "You'll receive a tracking number after shipment to check logistics in real-time.",
              },
              {
                q: isZh ? "是否支持定制服务？" : "Do you offer customization services?",
                a: isZh ? "我们提供表带刻字等个性化定制服务，详情请联系客服。" : "We offer personalization services like strap engraving, please contact customer service for details.",
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-border/50 pb-4">
                <p className="font-medium text-foreground mb-3">{item.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        );
      case "guide":
        return (
          <div className="space-y-8">
            {[
              { n: "01", title: isZh ? "确定预算" : "Determine Your Budget", desc: isZh ? "腕表价格范围广泛，从入门级到收藏级不等。建议先确定预算范围，再在该范围内挑选合适的款式。" : "Watch prices vary widely, from entry-level to collector grade. It's best to determine your budget range first, then select suitable styles within that range." },
              { n: "02", title: isZh ? "选择风格" : "Choose Your Style", desc: isZh ? "根据您的穿着风格和场合选择：正装表适合商务场合，运动表适合休闲活动，潜水表适合水上运动。" : "Choose based on your dress style and occasions: dress watches for business, sport watches for casual activities, dive watches for water sports." },
              { n: "03", title: isZh ? "了解尺寸" : "Understand Sizing", desc: isZh ? "表壳直径通常在 38-44mm 之间。较细的手腕适合 38-40mm，较粗的手腕适合 42-44mm。表耳宽度也应与手腕比例协调。" : "Case diameters typically range from 38-44mm. Slimmer wrists suit 38-40mm, larger wrists suit 42-44mm. Lug width should also be proportional to your wrist." },
              { n: "04", title: isZh ? "选择功能" : "Select Features", desc: isZh ? "基础功能包括时、分、秒显示。额外功能如日期显示、计时码表、月相等功能会增加复杂性和价格。" : "Basic functions include hour, minute, and second display. Additional features like date display, chronograph, moon phase add complexity and price." },
            ].map((item) => (
              <div key={item.n} className="flex gap-6 items-start">
                <span className="text-5xl font-light text-primary/10 shrink-0" style={{ fontFamily: "'Playfair Display', serif" }}>{item.n}</span>
                <div className="pt-2">
                  <h4 className="text-xl font-medium text-foreground mb-3">{item.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case "contact":
        return (
          <div className="text-center space-y-8 py-8">
            <p className="text-muted-foreground">
              {isZh ? "如有任何问题，欢迎通过以下方式联系我们：" : "If you have any questions, feel free to contact us:"}
            </p>
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <span className="text-primary">📍</span>
                <span className="text-sm">{t("footerAddress")}</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <span className="text-primary">✉️</span>
                <span className="text-sm">{t("footerEmail")}</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <span className="text-primary">📞</span>
                <span className="text-sm">{t("footerPhone")}</span>
              </div>
            </div>
            <div className="pt-8">
              <Link
                to="/category"
                className="inline-flex items-center justify-center px-8 py-3 border border-primary/50 text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-all rounded-full"
              >
                {isZh ? "浏览腕表系列" : "Browse Collections"}
              </Link>
            </div>
          </div>
        );
      default: // story
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-lg overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=800&q=80"
                  alt={t("ourStory")}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/5 rounded-lg -z-10" />
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-primary text-xs tracking-[0.2em] uppercase mb-3">{t("brandStoryTitle")}</p>
                <h2 className="text-3xl md:text-4xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{t("ourStory")}</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{t("brandStoryP1")}</p>
                <p>{t("brandStoryP2")}</p>
              </div>
              <div className="flex gap-4 pt-4">
                <Link
                  to="/category"
                  className="px-6 py-3 border border-primary/50 text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-all rounded-full"
                >
                  {isZh ? "探索系列" : "Explore Collection"}
                </Link>
              </div>
            </div>
          </div>
        );
    }
  };

  const currentKey = sections.find(s => s.id === location.hash.slice(1))?.key || "ourStory";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden bg-secondary">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        </div>
        <div className="relative z-10 text-center px-4">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-4">{t("ourHeritage")}</p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl text-white font-extralight tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
            VS FACTORY
          </h1>
        </div>
      </section>

      {/* Navigation */}
      <section className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <nav className="flex gap-6 overflow-x-auto scrollbar-hide">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`text-xs uppercase tracking-widest whitespace-nowrap transition-colors ${
                  currentKey === s.key
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(s.key)}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <SectionContent />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-muted-foreground text-sm">
          <p>© 2026 VS FACTORY. {t("allRightsReserved")} — {t("footerSince")}</p>
        </div>
      </footer>
    </div>
  );
}

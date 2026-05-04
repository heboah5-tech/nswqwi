import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, Product } from "@/context/CartContext";
import { useToast } from "@/components/ui/use-toast";

const AnimatedElement = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { clearTimeout(fallback); setTimeout(() => setIsVisible(true), delay); observer.unobserve(el); }
    }, { threshold: 0.05, rootMargin: "0px 0px 200px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className || ""}`}>
      {children}
    </div>
  );
};

const heroImages = [
  "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f57d0789b_www_naqi_sa_compressed-40-_7b29acee.webp",
  "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/944be33d8_www_naqi_sa_compressed-banner-7-1_32d3c955.webp",
  "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/59e0314d0_www_naqi_sa_compressed-banner-6-2_96162c90.webp",
  "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/459c22625_www_naqi_sa_compressed-banner-10_e798283d.webp",
  "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/e9931bb3c_www_naqi_sa_compressed-banner-9_7d67a7bb.webp",
];

function HeroSection() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section className="relative w-full bg-background overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none z-0 animate-float-a" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none z-0 animate-float-b" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-10 max-w-[1920px] mx-auto">
        <div className="relative w-full h-[30vh] sm:h-[45vh] md:h-[58vh] min-h-[200px] max-h-[700px] overflow-hidden group">
          {heroImages.map((src, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? "opacity-100" : "opacity-0"}`}>
              <img src={src} alt={`Banner ${i + 1}`} className="w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-[10s] ease-out" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? "bg-primary w-8" : "bg-card/50 hover:bg-card w-2.5"}`} />
            ))}
          </div>
          <button onClick={() => setCurrent((p) => (p - 1 + heroImages.length) % heroImages.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/40 backdrop-blur-md p-3 rounded-full shadow-lg text-card-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
            <ChevronRight className="w-6 h-6" />
          </button>
          <button onClick={() => setCurrent((p) => (p + 1) % heroImages.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/40 backdrop-blur-md p-3 rounded-full shadow-lg text-card-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}

function QuickAccessSection() {
  const actions = [
    { title: "للطلب سجل رقمك", desc: "أدخل رقمك وسنتواصل معك فوراً", icon: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3f432ed21_www_naqi_sa_contact_5300676_e9a33f95.png" },
    { title: "اطلب صيانة دورية", desc: "احجز موعد الصيانة بكل سهولة", icon: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/092d28992_www_naqi_sa_man_10214947_be5547ce.png" },
    { title: "شكوى أو صيانة طارئة", desc: "فريقنا جاهز لحل مشكلتك بسرعة", icon: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3c6f78ebf_www_naqi_sa_gear_11695860_9f5106f6.png" },
  ];
  return (
    <AnimatedElement className="relative z-20 -mt-6 sm:-mt-12 mb-8 sm:mb-12 px-3 sm:px-4 max-w-5xl mx-auto">
      <div className="bg-card backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl sm:rounded-2xl p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border">
        {actions.map((act, i) => (
          <a key={i} href="#" className="flex items-center gap-3 group p-2 sm:p-3 rounded-xl transition-all duration-300 hover:shadow-md bg-transparent hover:bg-muted/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-secondary rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
              <img src={act.icon} alt="" className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors">{act.title}</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-snug hidden sm:block">{act.desc}</span>
            </div>
          </a>
        ))}
      </div>
    </AnimatedElement>
  );
}

interface Category { name_ar: string; slug: string; image_url: string; }

function CategoriesSection({ categories }: { categories: Category[] }) {
  const staticCategories: Category[] = [
    { name_ar: "العروض المميزة", slug: "promotions", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/2075ea122_www_naqi_sa_--e1738571010238_4c905d18.svg" },
    { name_ar: "التحلية والبرادات", slug: "desalination", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0680ca8d4_www_naqi_sa_---e1738571121112-2048x1927_5f1e0bd5.png" },
    { name_ar: "منقيات الهواء", slug: "air-purifiers", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/a2f88fcd3_www_naqi_sa_--e1738571805455-2048x1927_e2cef727.png" },
    { name_ar: "صانعات الثلج", slug: "ice-makers", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/9bce1d27c_www_naqi_sa_---e1738571211984-2048x1927_9038284a.png" },
    { name_ar: "أجهزة القهوة", slug: "coffee", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/5000580ff_www_naqi_sa_-----e1738571414376-2048x1927_b5157a28.png" },
    { name_ar: "الدفايات والثلاجات", slug: "heaters", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/6d5cd2731_www_naqi_sa_--e1738571507554-2048x1927_6e055084.png" },
    { name_ar: "أجهزة المطبخ", slug: "kitchen", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/144881d9b_www_naqi_sa_Screenshot_6-removebg-preview_a80b25d8.png" },
    { name_ar: "منتجات المنزل", slug: "home-devices", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/db48f2487_www_naqi_sa_Screenshot_12-removebg-preview_549e1975.png" },
    { name_ar: "المضخات والغطاسات", slug: "pumps", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/641308484_www_naqi_sa_Screenshot_10-removebg-preview_1d33505a.png" },
    { name_ar: "الصيانة الدورية", slug: "maintenance", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/e7b5aced5_www_naqi_sa_-1-e1738571650797-2048x1927_a9a98a1c.png" },
  ];
  const items = categories.length > 0 ? categories.slice(0, 10) : staticCategories;
  return (
    <AnimatedElement>
      <section className="py-8 sm:py-12 bg-background" dir="rtl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="text-3xl font-extrabold text-foreground inline-block relative">
              تسوق بالأقسام
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            </h2>
          </div>
          <div className="overflow-x-auto pb-6 no-scrollbar snap-x">
            <div className="flex gap-3 sm:gap-6 min-w-max justify-start sm:justify-center px-2 sm:px-4">
              {items.map((cat, i) => (
                <a key={i} href="#" className="flex flex-col items-center gap-2 group w-16 sm:w-24 shrink-0 snap-center">
                  <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 sm:p-4 transition-all duration-500 bg-card border-2 shadow-sm group-hover:-translate-y-2 group-hover:shadow-xl ${i === 0 ? "border-destructive/30 group-hover:border-destructive bg-destructive/5" : "border-border/50 group-hover:border-primary"}`}>
                    <img src={cat.image_url} alt={cat.name_ar} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className={`text-[10px] sm:text-sm text-center leading-tight font-semibold transition-colors duration-300 ${i === 0 ? "text-destructive" : "text-foreground group-hover:text-primary"}`}>{cat.name_ar}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AnimatedElement>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [wishlist, setWishlist] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const hasDiscount = product.discount && product.discount > 0;
  return (
    <AnimatedElement delay={index * 100}>
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full relative z-10">
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 pointer-events-none">
          <div className="flex flex-col gap-2 pointer-events-auto">
            {hasDiscount && (
              <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive shadow-sm animate-pulse-slow">
                خصم {product.discount?.toLocaleString("ar-SA")} ر.س
              </Badge>
            )}
            {index % 3 === 0 && <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20 w-fit">الأكثر مبيعاً</Badge>}
          </div>
          <button onClick={(e) => { e.preventDefault(); setWishlist(!wishlist); }} className="pointer-events-auto bg-card/90 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:text-primary-foreground shadow-sm translate-x-2 group-hover:translate-x-0">
            <Heart className={`w-4 h-4 ${wishlist ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
        </div>
        <div className="relative overflow-hidden aspect-square bg-gradient-to-b from-muted/50 to-transparent p-6 flex items-center justify-center">
          <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
        </div>
        <div className="p-5 flex flex-col grow border-t border-border/30 bg-card">
          <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug mb-2 sm:mb-3 line-clamp-2 text-start grow group-hover:text-primary transition-colors">{product.name_ar}</h3>
          <div className="flex flex-col gap-1 mb-5">
            {hasDiscount ? (
              <div className="flex items-center gap-2 flex-wrap-reverse">
                <span className="text-xl font-black text-destructive">{product.price?.toLocaleString("ar-SA")} ر.س</span>
                <span className="text-xs text-muted-foreground line-through">{product.original_price?.toLocaleString("ar-SA")} ر.س</span>
              </div>
            ) : (
              <span className="text-xl font-black text-foreground">{product.price?.toLocaleString("ar-SA")} ر.س</span>
            )}
            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded w-fit mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" /> متوفر في المخزون
            </span>
          </div>
          <Button onClick={() => { addToCart(product); toast({ title: "تمت الإضافة للسلة ✓", description: product.name_ar, duration: 2000 }); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-bold group/btn flex items-center justify-center gap-1.5 rounded-xl h-9 sm:h-11 text-xs sm:text-sm shadow-sm hover:shadow-primary/25 relative overflow-hidden">
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
            <ShoppingCart className="w-4 h-4 relative z-10 transition-transform group-hover/btn:-rotate-12 group-hover/btn:-translate-x-1" />
            <span className="relative z-10">أضف للسلة</span>
          </Button>
        </div>
      </div>
    </AnimatedElement>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-5 sm:mb-8 pb-3 sm:pb-4 border-b border-border/50">
      <div>
        {subtitle && <p className="text-primary text-xs sm:text-sm font-bold mb-1 tracking-wide uppercase">{subtitle}</p>}
        <h4 className="text-lg sm:text-2xl font-extrabold text-foreground">{title}</h4>
      </div>
      <a href="#" className="hidden sm:flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors group">
        عرض الكل <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      </a>
    </div>
  );
}

const sectionData: { title: string; subtitle?: string; items: Product[]; bg: string }[] = [
  {
    title: "أقوى العروض", subtitle: "خصومات حصرية لفترة محدودة", bg: "bg-muted/40",
    items: [
      { name_ar: "جامبو + مضخه نقي + غطاء مضخة مجانا", price: 2499, original_price: 3248, discount: 749, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d056b6e2e_www_naqi_sa_compressed----__70d3ccf0.webp" },
      { name_ar: "مضخة نقي A + غطاء مضخة مجانا", price: 1199, original_price: 1249, discount: 50, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/9a04ad90f_www_naqi_sa_---_c2edbd22.webp" },
      { name_ar: "منقي هواء L-1", price: 799, original_price: 1099, discount: 300, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8b79666c2_www_naqi_sa_WhatsApp-Image-2026-02-25-at-32232-PM_1e54a3aa.jpeg" },
      { name_ar: "قهوة مقطرة + مطحنة القهوة", price: 999, original_price: 1198, discount: 199, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/50032fac4_www_naqi_sa_--_46aeb48f.webp" },
    ],
  },
  {
    title: "أجهزة التحلية والبرادات", bg: "bg-background",
    items: [
      { name_ar: "خزان 7 لتر", price: 200, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/5f99dc7aa_www_naqi_sa_---02_915f9a56.png" },
      { name_ar: "برادة نقي مفلترة – G1", price: 2299, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/655ce1ca7_www_naqi_sa_compressed---3-1_19b69be2.webp" },
      { name_ar: "برادة وصانعة ثلج – T1", price: 1499, original_price: 1699, discount: 200, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/106c7462a_www_naqi_sa_compressed---13-scaled_b47477fb.webp" },
      { name_ar: "فلتر مياه نقي ديجتال 200 جالون", price: 1499, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/bcc906193_www_naqi_sa_compressed---6_1e98c2dc.webp" },
    ],
  },
  {
    title: "منقيات الهواء واجهزة تلطيف الأجواء", bg: "bg-muted/30",
    items: [
      { name_ar: "منقي هواء L-1", price: 799, original_price: 1099, discount: 300, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8b79666c2_www_naqi_sa_WhatsApp-Image-2026-02-25-at-32232-PM_1e54a3aa.jpeg" },
      { name_ar: "منقي هواء 6 مراحل + منقي هواء 4 مراحل", price: 1099, original_price: 1698, discount: 599, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/a92a2c105_www_naqi_sa_------_e4501974.webp" },
      { name_ar: "مرطب هواء نقي", price: 499, original_price: 599, discount: 100, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/4d006f0d7_www_naqi_sa_compressed---15_6eb4fa6b.webp" },
      { name_ar: "منقي هواء نقي برو", price: 699, original_price: 999, discount: 300, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/b3557c0a3_www_naqi_sa_compressed---11-1_e877f320.webp" },
    ],
  },
  {
    title: "صانعات الثلج والآيس كريم", bg: "bg-background",
    items: [
      { name_ar: "صانعة حبيبات الثلج P-1", price: 1099, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/b02a42700_www_naqi_sa_compressed---27_50c327bb.webp" },
      { name_ar: "صانعة الايسكريم C1", price: 1399, original_price: 1599, discount: 200, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/a255c14ab_www_naqi_sa_compressed--_0f979ddd.webp" },
      { name_ar: "ماكينة صنع الثلج نقي برو", price: 1299, original_price: 1499, discount: 200, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3d54e1088_www_naqi_sa_--26_70bf4bf8.png" },
      { name_ar: "ماكينة صنع الثلج نقي كلاسيك", price: 549, original_price: 699, discount: 150, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/7367fe619_www_naqi_sa_--1_2d8f1b1e.jpeg" },
    ],
  },
  {
    title: "اجهزة تحضير القهوة والمشروبات الساخنة", bg: "bg-muted/30",
    items: [
      { name_ar: "غلاية القهوة المقطرة N-1", price: 359, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/2a2c1b7d8_www_naqi_sa_compressed---2-4_7272c18e.webp" },
      { name_ar: "مطحنة القهوة R – 1", price: 599, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/7b794fa05_www_naqi_sa_compressed---15-1_74f03456.webp" },
      { name_ar: "قهوة نقي المقطرة", price: 699, original_price: 799, discount: 100, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3bc0e74ce_www_naqi_sa_compressed---35_0859ed62.webp" },
      { name_ar: "صانعة القهوة – Cor1", price: 1899, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f4e4852d2_www_naqi_sa_compressed---34_76591a89.webp" },
    ],
  },
  {
    title: "الدفايات والثلاجات", bg: "bg-background",
    items: [
      { name_ar: "واجهة تبريد نقي 70 لتر", price: 599, original_price: 899, discount: 300, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8168df76b_www_naqi_sa_--4_62e7dcb2.jpg" },
      { name_ar: "دفاية نقي برو", price: 1299, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f65125fc7_www_naqi_sa_compressed---2-3-1_041b5e4f.webp" },
      { name_ar: "ايس بوكس نقي – ثلاجة متنقلة بريميوم", price: 599, original_price: 1099, discount: 500, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f7bfcb390_www_naqi_sa_compressed---6_51b82606.webp" },
      { name_ar: "دفاية كهربائية نقي داخلية بريميوم", price: 799, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0d477327d_www_naqi_sa_compressed---33_15f6f4f6.webp" },
    ],
  },
  {
    title: "المضخات والغطاسات", bg: "bg-muted/30",
    items: [
      { name_ar: "غطاس نقي (بوستر) 0.8حصان", price: 1599, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/79e293ac1_www_naqi_sa_WhatsApp-Image-2025-11-13-at-144953_4636c346_079921ee.jpg" },
      { name_ar: "غطاس نقي 1.5 حصان", price: 1499, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/effa07e2c_www_naqi_sa_01-1_8402cf75.webp" },
      { name_ar: "مضخة سكالا ٢ (قروندفوس)", price: 2599, original_price: 2799, discount: 200, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/ca7e38f94_www_naqi_sa_--44_b7ec9fc3.png" },
      { name_ar: "مضخة مياه نقي A", price: 999, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/b9ccf0ff5_www_naqi_sa_--18_c000343f.jpg" },
    ],
  },
];

// Flagship Naqi water cartons. Mirrored from the api-server's
// FEATURED_PRODUCTS so the homepage stays in sync with the storefront
// even on first paint (before the /api/products fetch resolves). Images
// live in /public/products/ and are served from the site root since
// BASE_PATH is "/".
const featuredWaterBottles: Product[] = [
  {
    name_ar: "نقي 200 مل - عبوة 48 قارورة",
    price: 16,
    image_url: "/products/naqi-200ml.png",
    in_stock: true,
  },
  {
    name_ar: "قطرة 200 مل - عبوة 40 قارورة",
    price: 9.5,
    image_url: "/products/qatra-200ml.png",
    in_stock: true,
  },
  {
    name_ar: "نقي 330 مل - عبوة 40 قارورة",
    price: 16,
    image_url: "/products/naqi-330ml.png",
    in_stock: true,
  },
];

const certs = [
  { img: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/51a3cba34_naqi_sa_WhatsApp-Image-2022-10-01-at-65936-PM-1-300x300_cdc6bb07.jpeg", text: "حاصل على نظام إدارة الجودة – الآيزو 9001-2015" },
  { img: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8cb71753a_www_naqi_sa_WhatsApp-Image-2026-01-21-at-121324-PM-300x300_c5d870be.jpeg", text: "حاصل على شهادة قياس رضا العملاء – الايزو 10004:2018" },
  { img: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/fe84a14b1_naqi_sa_--_page-0001-1-e1735720007509-293x300_a22e8738.jpg", text: "حاصل على شهادة إدارة شكاوى العملاء – الآيزو 10002:2018" },
  { img: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0df1e8b7e_naqi_sa__aa67d65d.png", text: "حاصل على شهادة الجودة لمراكز خدمة المستفيدين (حياك)" },
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  return (
    <div dir="rtl" className="bg-background min-h-screen">
      <HeroSection />
      <QuickAccessSection />
      <CategoriesSection categories={categories} />

      {/* Flagship water-bottle cartons — the actual Naqi product line.
          Sits ahead of the appliance sections so visitors see the core
          beverage products first. Three columns on tablet/desktop, two
          on mobile, matching the rest of the page. */}
      <AnimatedElement>
        <section
          className="py-10 sm:py-16 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden"
          dir="rtl"
        >
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-3 sm:px-4 relative z-10">
            <SectionHeader
              title="مياه نقي – النقاء في كل قطرة"
              subtitle="منتجاتنا الأصلية"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              {featuredWaterBottles.map((product, i) => (
                <ProductCard key={i} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      </AnimatedElement>

      {sectionData.map((section, si) => (
        <section key={si} className={`py-10 sm:py-16 ${section.bg} relative overflow-hidden`} dir="rtl">
          {si === 0 && <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />}
          <div className="max-w-7xl mx-auto px-3 sm:px-4 relative z-10">
            <SectionHeader title={section.title} subtitle={section.subtitle} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {section.items.map((product, i) => (
                <ProductCard key={i} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <AnimatedElement>
        <section className="py-10 sm:py-16 bg-card border-t border-border" dir="rtl">
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-start justify-items-center">
              {certs.map((cert, i) => (
                <div key={i} className="flex flex-col items-center gap-4 text-center group">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-background rounded-full flex items-center justify-center p-2 shadow-sm border border-border group-hover:shadow-lg group-hover:-translate-y-2 group-hover:border-primary/50 transition-all duration-500">
                    <img src={cert.img} alt="شهادة" className="w-full h-full object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 mix-blend-multiply" />
                  </div>
                  <p className="text-sm text-foreground/80 font-bold leading-relaxed max-w-[200px] group-hover:text-primary transition-colors">{cert.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedElement>
    </div>
  );
}

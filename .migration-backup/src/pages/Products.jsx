import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Heart, Star, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/use-toast";

const AnimatedElement = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
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
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className || ""}`}>
      {children}
    </div>
  );
};

const staticFallback = [
  { name_ar: "جامبو + مضخه نقي + غطاء مضخة مجانا", price: 2499, original_price: 3248, discount: 749, category: "promotions", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d056b6e2e_www_naqi_sa_compressed----__70d3ccf0.webp" },
  { name_ar: "مضخة نقي A + غطاء مضخة مجانا", price: 1199, original_price: 1249, discount: 50, category: "promotions", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/9a04ad90f_www_naqi_sa_---_c2edbd22.webp" },
  { name_ar: "منقي هواء L-1", price: 799, original_price: 1099, discount: 300, category: "air-purifiers", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8b79666c2_www_naqi_sa_WhatsApp-Image-2026-02-25-at-32232-PM_1e54a3aa.jpeg" },
  { name_ar: "برادة نقي مفلترة – G1", price: 2299, original_price: 2299, discount: 0, category: "desalination", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/655ce1ca7_www_naqi_sa_compressed---3-1_19b69be2.webp" },
  { name_ar: "برادة وصانعة ثلج – T1", price: 1499, original_price: 1699, discount: 200, category: "desalination", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/106c7462a_www_naqi_sa_compressed---13-scaled_b47477fb.webp" },
  { name_ar: "قهوة مقطرة + مطحنة القهوة", price: 999, original_price: 1198, discount: 199, category: "coffee", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/50032fac4_www_naqi_sa_--_46aeb48f.webp" },
  { name_ar: "صانعة حبيبات الثلج P-1", price: 1099, original_price: 1099, discount: 0, category: "ice-makers", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/b02a42700_www_naqi_sa_compressed---27_50c327bb.webp" },
  { name_ar: "ماكينة صنع الثلج نقي برو", price: 1299, original_price: 1499, discount: 200, category: "ice-makers", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3d54e1088_www_naqi_sa_--26_70bf4bf8.png" },
  { name_ar: "فرن نقي E-1", price: 499, original_price: 999, discount: 500, category: "kitchen", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/519aa4d34_www_naqi_sa_compressed--_619f33b7.webp" },
  { name_ar: "دفاية نقي برو", price: 1299, original_price: 1299, discount: 0, category: "heaters", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f65125fc7_www_naqi_sa_compressed---2-3-1_041b5e4f.webp" },
  { name_ar: "فلتر مياه نقي ديجتال 200 جالون", price: 1499, original_price: 1499, discount: 0, category: "desalination", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/bcc906193_www_naqi_sa_compressed---6_1e98c2dc.webp" },
  { name_ar: "مضخة سكالا ٢ (قروندفوس)", price: 2599, original_price: 2799, discount: 200, category: "pumps", in_stock: true, image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/ca7e38f94_www_naqi_sa_--44_b7ec9fc3.png" },
];

const allCategories = [
  { label: "الكل", value: "all" },
  { label: "العروض", value: "promotions" },
  { label: "التحلية والبرادات", value: "desalination" },
  { label: "منقيات الهواء", value: "air-purifiers" },
  { label: "صانعات الثلج", value: "ice-makers" },
  { label: "القهوة والمشروبات", value: "coffee" },
  { label: "الدفايات والثلاجات", value: "heaters" },
  { label: "المطبخ", value: "kitchen" },
  { label: "المضخات", value: "pumps" },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState({});
  const [sortBy, setSortBy] = useState("default");
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Product.list("-updated_date", 50)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const items = products.length > 0 ? products : staticFallback;

  const filtered = items.filter(p => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !search || p.name_ar?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
    if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
    return 0;
  });

  const toggleWishlist = (i) => setWishlist(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div dir="rtl" className="bg-background min-h-screen">
      {/* Hero Banner */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="bg-primary text-primary-foreground py-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-2xl font-bold mb-1">جميع المنتجات</h1>
          <p className="text-primary-foreground/80 text-sm">اكتشف مجموعتنا الكاملة من أجهزة تنقية المياه والهواء</p>
        </div>
      </motion.section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search + Sort */}
        <AnimatedElement>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-border bg-card text-card-foreground pe-9 ps-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="default">الترتيب الافتراضي</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="discount">الأكثر خصماً</option>
            </select>
          </div>
        </AnimatedElement>

        {/* Category Tabs */}
        <AnimatedElement delay={80}>
          <div className="overflow-x-auto pb-2 mb-6">
            <div className="flex gap-2 min-w-max">
              {allCategories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-1.5 text-sm font-medium transition-all whitespace-nowrap border ${
                    activeCategory === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </AnimatedElement>

        {/* Results count */}
        <AnimatedElement delay={100}>
          <p className="text-sm text-muted-foreground mb-4 text-end">{filtered.length} منتج</p>
        </AnimatedElement>

        {/* Products Grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${loading ? "opacity-50" : "opacity-100"} transition-opacity`}>
          {filtered.map((product, i) => (
            <AnimatedElement key={product.id || i} delay={i * 60}>
              <div className="bg-card border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative">
                <div className="relative overflow-hidden aspect-square">
                  {(product.discount || 0) > 0 && (
                    <span className="absolute top-2 start-2 z-10 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 font-bold">
                      خصم {product.discount?.toLocaleString("ar-SA")} ر.س
                    </span>
                  )}
                  <button
                    onClick={() => toggleWishlist(i)}
                    className="absolute top-2 end-2 z-10 bg-card/80 p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Heart className={`w-4 h-4 ${wishlist[i] ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  </button>
                  <img
                    src={product.image_url}
                    alt={product.name_ar}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground leading-tight mb-2 line-clamp-2 text-end">{product.name_ar}</h3>
                  <div className="flex items-center justify-end gap-0.5 mb-2">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-muted-foreground" />)}
                  </div>
                  <p className="text-xs text-accent font-bold mb-2 text-end">{product.in_stock ? "متوفر" : "غير متوفر"}</p>
                  <div className="text-end mb-3">
                    {(product.discount || 0) > 0 ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through me-2">{product.original_price?.toLocaleString("ar-SA")} ر.س</span>
                        <span className="text-base font-bold text-destructive">{product.price?.toLocaleString("ar-SA")} ر.س</span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-foreground">{product.price?.toLocaleString("ar-SA")} ر.س</span>
                    )}
                  </div>
                  <button onClick={() => { addToCart(product); toast({ title: "تمت الإضافة للسلة ✓", description: product.name_ar, duration: 2000 }); }} className="w-full bg-primary text-primary-foreground text-xs py-2 hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    إضافة إلى السلة
                  </button>
                </div>
              </div>
            </AnimatedElement>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">لا توجد منتجات مطابقة للبحث</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }} className="mt-3 text-primary text-sm hover:underline">إعادة تعيين الفلتر</button>
          </div>
        )}
      </div>
    </div>
  );
}
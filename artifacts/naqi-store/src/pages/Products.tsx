import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ShoppingCart, Heart, Star } from "lucide-react";
import { useCart, Product } from "@/context/CartContext";
import { useToast } from "@/components/ui/use-toast";

const AnimatedElement = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return <div className={`transition-all duration-700 ease-out ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"} ${className || ""}`}>{children}</div>;
};

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
  { label: "أجهزة المنزل", value: "home-devices" },
  { label: "الصيانة", value: "maintenance" },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({});
  const [sortBy, setSortBy] = useState("default");
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products
    .filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = !search || p.name_ar?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
      return 0;
    });

  const toggleWishlist = (i: number) => setWishlist((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div dir="rtl" className="bg-background min-h-screen">
      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}
        className="bg-primary text-primary-foreground py-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-2xl font-bold mb-1">جميع المنتجات</h1>
          <p className="text-primary-foreground/80 text-sm">اكتشف مجموعتنا الكاملة من أجهزة تنقية المياه والهواء</p>
        </div>
      </motion.section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatedElement>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" placeholder="ابحث عن منتج..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border bg-card text-card-foreground pe-9 ps-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="default">الترتيب الافتراضي</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="discount">الأكثر خصماً</option>
            </select>
          </div>
        </AnimatedElement>

        <AnimatedElement delay={80}>
          <div className="overflow-x-auto pb-2 mb-6">
            <div className="flex gap-2 min-w-max">
              {allCategories.map((cat) => (
                <button
                  key={cat.value} onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-1.5 text-sm font-medium transition-all whitespace-nowrap border ${activeCategory === cat.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary hover:text-primary"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </AnimatedElement>

        <AnimatedElement delay={100}>
          <p className="text-sm text-muted-foreground mb-4 text-end">{filtered.length} منتج</p>
        </AnimatedElement>

        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${loading ? "opacity-50" : "opacity-100"} transition-opacity`}>
          {filtered.map((product, i) => (
            <AnimatedElement key={(product.id as string) || i} delay={i * 60}>
              <div className="bg-card border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative">
                <div className="relative overflow-hidden aspect-square">
                  {(product.discount || 0) > 0 && (
                    <span className="absolute top-2 start-2 z-10 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 font-bold">
                      خصم {product.discount?.toLocaleString("ar-SA")} ر.س
                    </span>
                  )}
                  <button onClick={() => toggleWishlist(i)} className="absolute top-2 end-2 z-10 bg-card/80 p-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <Heart className={`w-4 h-4 ${wishlist[i] ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  </button>
                  <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-3 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground leading-tight mb-2 line-clamp-2 text-end">{product.name_ar}</h3>
                  <div className="flex items-center justify-end gap-0.5 mb-2">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="w-3 h-3 text-muted-foreground" />)}
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
                  <button
                    onClick={() => { addToCart(product); toast({ title: "تمت الإضافة للسلة ✓", description: product.name_ar, duration: 2000 }); }}
                    className="w-full bg-primary text-primary-foreground text-xs py-2 hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-1"
                  >
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

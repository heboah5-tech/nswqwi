import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, ShoppingCart, Heart, Phone, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import CartSidebar from "./CartSidebar";

export default function Header() {
  const [searchVal, setSearchVal] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, total } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div dir="rtl" className="sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="bg-primary text-primary-foreground text-xs py-2 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 font-medium">
            <a href="#" className="hover:text-primary-foreground/80 hover:-translate-y-0.5 transition-all flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              للطلب سجل رقمك
            </a>
            <a href="#" className="hover:text-primary-foreground/80 hover:-translate-y-0.5 transition-all">عملاء ولاء نقي</a>
            <a href="#" className="hover:text-primary-foreground/80 hover:-translate-y-0.5 transition-all">خدمات مابعد البيع</a>
            <a href="#" className="hover:text-primary-foreground/80 hover:-translate-y-0.5 transition-all">مركز المساعدة</a>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/06919201c_www_naqi_sa_saudi-arabia-icon-512x384-269zrx40-150x150_9e242201.png" alt="السعودية" className="w-4 h-4 object-contain" />
              <span>السعودية</span>
            </a>
            <a href="https://uae.naqi.sa/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-primary-foreground/70">
              <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/78f7d5a62_www_naqi_sa_united-arab-emirates-icon-512x384-gqm0kh8w-150x150_71565224.png" alt="الإمارات" className="w-4 h-4 object-contain grayscale opacity-60" />
              <span>الإمارات</span>
            </a>
            <a href="https://bahrain.naqi.sa/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-primary-foreground/70">
              <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0331b66c9_www_naqi_sa_bahrain-icon-512x384-48q0nzll-1-150x150_c4929b1f.png" alt="البحرين" className="w-4 h-4 object-contain grayscale opacity-60" />
              <span>البحرين</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <header className={`bg-card border-b border-border transition-all duration-300 ${scrolled ? "shadow-lg py-2" : "py-3"}`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 group">
            <img
              src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d15fdc132_www_naqi_sa_LOGO_HORIZONTAL_84b72681.png"
              alt="نقي"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              onError={e => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "inline"; }}
            />
            <span className="font-bold text-2xl text-primary tracking-tight hidden" style={{ display: "none" }}>نقي</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-xl relative group">
            <input
              type="text"
              placeholder="ابحث عما تفكر فيه..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-card text-foreground text-sm rounded-full py-2.5 px-12 transition-all duration-300 outline-none"
            />
            <Search className="w-5 h-5 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <button className="absolute left-1.5 top-1.5 bottom-1.5 bg-primary text-primary-foreground px-4 rounded-full text-xs font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all">
              بحث
            </button>
          </div>

          {/* Actions & Phone */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            
            {/* Phone */}
            <div className="hidden sm:flex items-center gap-3 border-l border-border pl-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <Phone className="w-5 h-5 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">الدعم الفني</span>
                <span className="text-sm font-bold text-foreground font-mono">920021500</span>
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="p-2.5 hover:bg-secondary rounded-full transition-colors text-foreground hidden sm:block">
                <User className="w-5 h-5" />
              </button>
              
              <button className="p-2.5 hover:bg-secondary rounded-full transition-colors text-foreground relative hidden sm:block group">
                <Heart className="w-5 h-5 group-hover:fill-primary/20 transition-colors" />
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">0</span>
              </button>

              <button onClick={() => setCartOpen(true)} className="flex items-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-4 py-2 rounded-full transition-all duration-300 group">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                  <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-card">{count}</span>
                </div>
                <span className="font-bold text-sm hidden sm:block font-mono">{total.toLocaleString("ar-SA")} ر.س</span>
              </button>
            </div>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary rounded-full">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 border-l border-border" dir="rtl">
                <div className="p-4 border-b border-border bg-primary/5">
                  <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d15fdc132_www_naqi_sa_LOGO_HORIZONTAL_84b72681.png" alt="نقي" className="h-8 w-auto mb-4" />
                  <div className="relative">
                    <input type="text" placeholder="ابحث..." className="w-full bg-background border border-border rounded-lg py-2 px-10 text-sm focus:border-primary outline-none" />
                    <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="flex flex-col overflow-y-auto h-[calc(100vh-140px)]">
                  {[
                    { n: "الرئيسية", l: "/" },
                    { n: "المنتجات", l: "/Products" },
                    { n: "عروض نقي", l: "#" },
                    { n: "أجهزة التحلية والبرادات", l: "#" },
                    { n: "منقيات الهواء", l: "#" },
                    { n: "صانعات الثلج والايسكريم", l: "#" },
                    { n: "أجهزة القهوة والمشروبات", l: "#" },
                    { n: "الدفايات والثلاجات", l: "#" },
                    { n: "المضخات والغطاسات", l: "#" },
                    { n: "مراكز الصيانة", l: "#" },
                  ].map((item, idx) => (
                    item.l.startsWith("/") ? 
                      <Link key={idx} to={item.l} className="px-5 py-3 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium border-b border-border/50">{item.n}</Link>
                    : 
                      <a key={idx} href={item.l} className="px-5 py-3 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors font-medium border-b border-border/50">{item.n}</a>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
        {/* Category bar - Desktop only */}
        <div className="hidden lg:block mt-3 border-t border-border pt-2">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-center">
              {[
                { name: "عروض نقي", active: true },
                { name: "أجهزة التحلية والبرادات" },
                { name: "صانعات الثلج والايسكريم" },
                { name: "أجهزة القهوة والمشروبات" },
                { name: "الدفايات والثلاجات" },
                { name: "قطع الغيار والاكسسوارات" },
                { name: "المضخات والغطاسات" },
                { name: "منقيات الهواء" },
                { name: "منتجات المنزل" },
              ].map((cat, i) => (
                <a key={i} href="#" className={`px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-full transition-all duration-300 hover:bg-primary/10 hover:text-primary ${cat.active ? "text-primary bg-primary/5" : "text-foreground"}`}>
                  {cat.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </div>
  );
}
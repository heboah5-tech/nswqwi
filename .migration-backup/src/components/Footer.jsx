import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer dir="rtl" className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">

          {/* Logo + Contact */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <img
              src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d15fdc132_www_naqi_sa_LOGO_HORIZONTAL_84b72681.png"
              alt="نقي"
              className="h-9 w-auto object-contain mb-4 brightness-0 invert"
              onError={e => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "block"; }}
            />
            <span className="text-background font-bold text-xl hidden">نقي</span>
            {/* Mobile: show contact inline */}
            <div className="flex items-center gap-2 lg:hidden mb-3">
              <Phone className="w-4 h-4 text-background/70 shrink-0" />
              <span className="text-background font-bold text-sm">920021500</span>
            </div>
            <a href="mailto:contact@naqi.sa" className="text-background/70 text-xs hover:text-background flex items-center gap-1 mb-4">
              <Mail className="w-3 h-3" /> contact@naqi.sa
            </a>
            {/* App stores - mobile: row, lg: column */}
            <div className="flex flex-row lg:flex-col gap-2">
              <a href="#" className="block">
                <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/a5ae01b11_www_naqi_sa_google-play_362c4796.svg" alt="Google Play" className="h-7 w-auto" />
              </a>
              <a href="#" className="block">
                <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/b59cf3dec_www_naqi_sa_app-store_2cf680cd.svg" alt="App Store" className="h-7 w-auto" />
              </a>
            </div>
          </div>

          {/* رعاية العميل */}
          <div className="col-span-1">
            <h5 className="text-background font-bold text-sm mb-3">رعاية العميل</h5>
            <ul className="space-y-2">
              {["حط رقمك", "الأسئلة الشائعة", "سياسة الضمان", "سياسة الاستبدال والاسترجاع", "سياسة الخصوصية", "شروط الاستخدام"].map(t => (
                <li key={t}><a href="#" className="text-background/70 text-xs hover:text-background transition-colors leading-relaxed">{t}</a></li>
              ))}
            </ul>
          </div>

          {/* خدمات مابعد البيع */}
          <div className="col-span-1">
            <h5 className="text-background font-bold text-sm mb-3">خدمات مابعد البيع</h5>
            <ul className="space-y-2">
              {["صيانة دورية أو خدمة", "الأسئلة الشائعة", "طلب صيانة طارئة", "شكوى"].map(t => (
                <li key={t}><a href="#" className="text-background/70 text-xs hover:text-background transition-colors">{t}</a></li>
              ))}
            </ul>
          </div>

          {/* عن نقي */}
          <div className="col-span-1">
            <h5 className="text-background font-bold text-sm mb-3">عن نقي</h5>
            <ul className="space-y-2">
              {["عن الشركة", "الشهادة الضريبية", "فروع نقي", "التوظيف"].map(t => (
                <li key={t}><a href="#" className="text-background/70 text-xs hover:text-background transition-colors">{t}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact (desktop only) */}
          <div className="hidden lg:block col-span-1">
            <div className="mb-4">
              <h4 className="text-background font-bold text-lg mb-1">920021500</h4>
              <p className="text-background/70 text-xs">للطلب والاستفسار أو للمساعدة اتصل الآن</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-background/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-background/60 text-[11px] text-center sm:text-end leading-relaxed">
            شركة النبع النقي للتجارة - السجل التجاري 1010450817 - الرقم الضريبي 310362058800003
            <br />
            2024-2018 © جميع الحقوق محفوظة - شركة النبع النقي للتجارة
          </p>
          <img
            src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/aa29632c2_www_naqi_sa_--copy_803339b4.png"
            alt="payments"
            className="h-7 w-auto object-contain brightness-0 invert opacity-60"
          />
        </div>
      </div>
    </footer>
  );
}
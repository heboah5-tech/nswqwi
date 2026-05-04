import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface CardMockProps {
  cardNumber?: string;
  cardLast4?: string;
  cardName?: string;
  expiry?: string;
  cvv?: string;
}

function detectBrand(
  pan: string,
): "visa" | "mastercard" | "mada" | "amex" | "generic" {
  const digits = pan.replace(/\D/g, "");
  // Need at least the full BIN (6 digits) to make a confident call. If we
  // only have the last 4 (or less), brand-by-last-4 is meaningless — render
  // a generic card instead of guessing.
  if (digits.length < 6) return "generic";

  // Check the most specific issuer (Mada) first — its BINs overlap the
  // generic Visa (4xxxxx) and Mastercard (5xxxxx) ranges.
  if (
    /^(440647|440795|446404|457865|484783|486094|486095|486096|504300|508160|524130|529415|530906|531095|531196|535825|535989|536023|537767|543357|556563|557606|558848|585265|588845|589206|604906|636120)/.test(
      digits,
    )
  ) {
    return "mada";
  }
  // American Express: 34 / 37
  if (/^3[47]/.test(digits)) return "amex";
  // Mastercard: 51-55 OR 2221-2720 (2017+ range). Match the 4-digit range
  // exactly to avoid the over-broad 2[2-7] match that classified non-MC BINs.
  const first4 = parseInt(digits.slice(0, 4), 10);
  if (/^5[1-5]/.test(digits) || (first4 >= 2221 && first4 <= 2720)) {
    return "mastercard";
  }
  // Visa: any PAN starting with 4 (after Mada has been ruled out above).
  if (/^4/.test(digits)) return "visa";
  return "generic";
}

function formatPan(pan: string): string {
  return pan.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

const brandStyles: Record<
  "visa" | "mastercard" | "mada" | "amex" | "generic",
  { gradient: string; label: string; logo: React.ReactNode }
> = {
  visa: {
    gradient: "linear-gradient(135deg, #1a1f71 0%, #2b3493 50%, #f9a533 100%)",
    label: "VISA",
    logo: (
      <span
        className="text-white font-extrabold italic tracking-tight"
        style={{ fontSize: "22px", letterSpacing: "-0.5px" }}
      >
        VISA
      </span>
    ),
  },
  mastercard: {
    gradient: "linear-gradient(135deg, #1c1c1e 0%, #2d2d2f 60%, #ea001b 100%)",
    label: "Mastercard",
    logo: (
      <div className="flex items-center -space-x-2">
        <span className="block w-6 h-6 rounded-full bg-[#ea001b]" />
        <span className="block w-6 h-6 rounded-full bg-[#f79e1b] mix-blend-screen" />
      </div>
    ),
  },
  mada: {
    gradient: "linear-gradient(135deg, #00563f 0%, #006837 60%, #84c441 100%)",
    label: "mada",
    logo: (
      <span
        className="text-white font-extrabold tracking-wider"
        style={{ fontSize: "18px" }}
      >
        مدى
      </span>
    ),
  },
  amex: {
    gradient: "linear-gradient(135deg, #016fd0 0%, #0a86db 100%)",
    label: "AMEX",
    logo: (
      <span className="text-white font-extrabold tracking-widest text-sm">
        AMEX
      </span>
    ),
  },
  generic: {
    gradient: "linear-gradient(135deg, #374151 0%, #4b5563 60%, #6b7280 100%)",
    label: "CARD",
    logo: (
      <span className="text-white/80 font-bold text-xs tracking-widest">
        CARD
      </span>
    ),
  },
};

export function CardMock({
  cardNumber,
  cardLast4,
  cardName,
  expiry,
  cvv,
}: CardMockProps) {
  const [revealed, setRevealed] = useState(false);
  const fullPan = (cardNumber ?? "").replace(/\s/g, "");
  const last4 = cardLast4 ?? fullPan.slice(-4);
  const displayPan = fullPan
    ? revealed
      ? formatPan(fullPan)
      : `•••• •••• •••• ${last4 || "••••"}`
    : `•••• •••• •••• ${last4 || "••••"}`;
  const brand = detectBrand(fullPan || last4 || "");
  const style = brandStyles[brand];
  const displayCvv = cvv ? (revealed ? cvv : "•".repeat(cvv.length)) : "•••";
  const displayExpiry = expiry || "MM/YY";
  const displayName = cardName || "CARDHOLDER";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-bold">معاينة البطاقة</span>
        {(fullPan || cvv) && (
          <button
            type="button"
            onClick={() => setRevealed((p) => !p)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {revealed ? (
              <>
                <EyeOff className="w-3 h-3" /> إخفاء
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" /> إظهار
              </>
            )}
          </button>
        )}
      </div>
      <div
        dir="ltr"
        className="relative w-full aspect-[1.586/1] rounded-2xl shadow-lg overflow-hidden text-white p-5 flex flex-col justify-between"
        style={{ background: style.gradient }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(255,255,255,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex items-start justify-between">
          <div
            className="w-10 h-7 rounded-md"
            style={{
              background:
                "linear-gradient(135deg, #d4af37 0%, #f5e7a0 50%, #b88e2f 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
            }}
          />
          <div>{style.logo}</div>
        </div>

        <div
          className="relative font-mono tracking-[0.18em] text-lg sm:text-xl font-semibold"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
        >
          {displayPan}
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase opacity-70">Card Holder</div>
            <div className="text-sm font-bold truncate uppercase">
              {displayName}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70">Expires</div>
            <div className="text-sm font-bold font-mono">{displayExpiry}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70">CVV</div>
            <div className="text-sm font-bold font-mono">{displayCvv}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardMock;

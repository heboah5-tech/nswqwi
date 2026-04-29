import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import FloatCart from "./FloatCart";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
      <FloatCart />
    </div>
  );
}

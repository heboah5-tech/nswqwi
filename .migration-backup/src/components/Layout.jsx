import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import FloatCart from "./FloatCart";

export default function Layout() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatCart />
    </div>
  );
}
"use client";
import { useCallback, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { ChatWidget } from "@/components/ChatWidget";
import { Header } from "@/components/Header";
import { QuickView } from "@/components/QuickView";
import { BackToTop, Categories, Contact, Faqs, Footer, Hero, Marquee, MobileOrderBar, Newsletter, Reviews, SaleBanner, WhyUs } from "@/components/Sections";
import { Shop } from "@/components/Shop";
import { type ClientProduct, type Filter } from "@/lib/products";

export function HomeClient({ products }: { products: ClientProduct[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [quick, setQuick] = useState<ClientProduct | null>(null);
  const [size, setSize] = useState<number | null>(null);

  const goFilter = useCallback((f: Filter) => {
    setFilter(f);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <Header search={search} setSearch={setSearch} />
      <main>
        <Hero styles={products.length} />
        <Marquee />
        <Reviews />
        <Categories onSelect={goFilter} />
        <Shop products={products} filter={filter} setFilter={setFilter} search={search} sort={sort} setSort={setSort} onQuick={setQuick} size={size} setSize={setSize} />
        <SaleBanner onSelect={goFilter} />
        <WhyUs />
        <Faqs />
        <Contact />
        <Newsletter />
      </main>
      <Footer />
      <QuickView product={quick} onClose={() => setQuick(null)} />
      <CartDrawer />
      <MobileOrderBar />
      <BackToTop />
      <ChatWidget products={products} />
    </>
  );
}

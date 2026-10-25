"use client";
import { useCallback, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { QuickView } from "@/components/QuickView";
import { Categories, Contact, Footer, Hero, Marquee, Newsletter, Reviews, SaleBanner, WhyUs } from "@/components/Sections";
import { Shop } from "@/components/Shop";
import type { Filter, Product } from "@/lib/products";

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [quick, setQuick] = useState<Product | null>(null);

  const goFilter = useCallback((f: Filter) => {
    setFilter(f);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <Header search={search} setSearch={setSearch} />
      <main>
        <Hero />
        <Marquee />
        <Categories onSelect={goFilter} />
        <Shop filter={filter} setFilter={setFilter} search={search} sort={sort} setSort={setSort} onQuick={setQuick} />
        <SaleBanner onSelect={goFilter} />
        <WhyUs />
        <Reviews />
        <Contact />
        <Newsletter />
      </main>
      <Footer />
      <QuickView product={quick} onClose={() => setQuick(null)} />
      <CartDrawer />
    </>
  );
}

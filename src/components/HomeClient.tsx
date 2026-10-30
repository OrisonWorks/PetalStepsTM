"use client";
import { useCallback, useEffect, useState } from "react";
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

  // Deep-link shop state: ?cat / ?size / ?sort / ?q survive refresh and can be shared.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const cat = q.get("cat");
    if (cat && ["all", "matte", "glossy", "statement", "red-bottom", "low"].includes(cat)) setFilter(cat as Filter);
    const s = Number(q.get("size"));
    if (s >= 35 && s <= 45) setSize(s);
    if (["featured", "low", "high", "name"].includes(q.get("sort") || "")) setSort(q.get("sort")!);
    if (q.get("q")) setSearch(q.get("q")!);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (filter !== "all") q.set("cat", filter);
    if (size !== null) q.set("size", String(size));
    if (sort !== "featured") q.set("sort", sort);
    if (search) q.set("q", search);
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [filter, size, sort, search]);

  return (
    <>
      <Header search={search} setSearch={setSearch} />
      <main id="main" tabIndex={-1}>
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

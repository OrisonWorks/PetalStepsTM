"use client";
import { useState } from "react";
import Image from "next/image";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/cart-context";

export function Header({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const { count, setOpen } = useCart();
  const [showSearch, setShowSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const links = [["Shop", "#shop"], ["Categories", "#categories"], ["Why Us", "#why"], ["Reviews", "#reviews"], ["Contact", "#contact"]] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-rose-100 bg-[#fffafc]/90 backdrop-blur">
      <div className="bg-gradient-to-r from-[#c084fc] to-rose-500 px-4 py-1.5 text-center text-[13px] font-semibold text-white">
        Women&apos;s heels K450–K650 · EU 35–45 · Official orders only: +260 760 732 751
      </div>
      <nav className="mx-auto flex w-[min(1180px,92%)] items-center gap-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <Image src="/brand/logo-mark.png" alt="Petal Steps by Thandiwe Mwaba" width={1013} height={552} priority className="h-11 w-auto" />
        </a>
        <button className="ml-auto md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
        <ul className={`gap-6 text-sm font-semibold md:ml-auto md:flex ${menu ? "absolute inset-x-0 top-full flex flex-col bg-white p-4 shadow-lg" : "hidden"}`}>
          {links.map(([label, href]) => (
            <li key={href}><a className="hover:text-rose-500" href={href} onClick={() => setMenu(false)}>{label}</a></li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setShowSearch(!showSearch)} aria-label="Search"><Search /></Button>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
            <ShoppingBag /> <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-extrabold text-white">{count}</span>
          </Button>
        </div>
      </nav>
      {showSearch && (
        <div className="mx-auto w-[min(1180px,92%)] pb-3">
          <Input
            autoFocus
            aria-label="Search heels"
            type="search"
            placeholder="Search heels by colour or style… e.g. pink, red bottom"
            value={search}
            onChange={(e) => {
              const v = e.target.value;
              // First keystroke takes you to the results grid so the search
              // doesn't look dead while the page stays at the hero.
              if (v && !search) document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              setSearch(v);
            }}
            className="rounded-full"
          />
        </div>
      )}
    </header>
  );
}

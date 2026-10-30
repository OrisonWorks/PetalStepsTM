import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = (n: number) => "K" + n.toLocaleString("en-ZM");
export const FB_URL =
  "https://www.facebook.com/p/Petal-Steps-by-TM-61586015481553/";
export const WA_NUMBER = "260760732751";
export const WA_DISPLAY = "+260 760 732 751";
export const waLink = (text: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

// Digits-only WhatsApp recipient for wa.me: a local Zambian number like
// 0971234567 becomes 260971234567; already-international input passes through.
export const waNumber = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "260" + d.slice(1);
  return d;
};
export const SHOP_ADDRESS = "Munali Rd 4774, Block 1 Shop B, Thompson Park, Lusaka";
export const BRAND = "Petal Steps by Thandiwe Mwaba";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = (n: number) => "R " + n.toLocaleString("en-ZA");
export const FB_URL =
  "https://www.facebook.com/p/Petal-Steps-by-TM-61586015481553/";
export const FREE_DELIVERY = 800;
export const DELIVERY_FEE = 80;

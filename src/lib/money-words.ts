const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(ONES[Math.floor(n / 100)] + " hundred");
    n %= 100;
    if (n) parts.push("and " + (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "")));
  } else if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

// 450 → "Four hundred and fifty Kwacha" — fills the receipt's "Sum of (Amount
// in words)" line. Kwacha-only; receipts are whole-kwacha amounts.
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const n = Math.floor(amount);
  const chunks: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) chunks.push(under1000(millions) + " million");
  if (thousands) chunks.push(under1000(thousands) + " thousand");
  if (rest) chunks.push(under1000(rest));
  const s = chunks.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1) + " Kwacha";
}

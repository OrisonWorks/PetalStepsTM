import { HomeClient } from "@/components/HomeClient";
import { getProducts } from "@/lib/sheet-products";

export const revalidate = 300;

export default async function Home() {
  const { products } = await getProducts();
  return <HomeClient products={products} />;
}

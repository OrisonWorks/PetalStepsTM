"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";

/** dotLottie wrapper that renders nothing under prefers-reduced-motion. */
export function Lottie({ src, className, loop = true, autoplay = true, speed = 1 }: {
  src: string; className?: string; loop?: boolean; autoplay?: boolean; speed?: number;
}) {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  if (reduce !== false) return null;
  return <DotLottieReact src={src} autoplay={autoplay} loop={loop} speed={speed} className={className} />;
}

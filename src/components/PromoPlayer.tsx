"use client";
import dynamic from "next/dynamic";
import { PetalPromo, PROMO } from "@/remotion/PetalPromo";

const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-3xl bg-rose-100" />,
});

export function PromoPlayer() {
  return (
    <div className="overflow-hidden rounded-3xl shadow-2xl shadow-rose-500/20 ring-1 ring-rose-100">
      <Player
        component={PetalPromo}
        durationInFrames={PROMO.durationInFrames}
        compositionWidth={PROMO.width}
        compositionHeight={PROMO.height}
        fps={PROMO.fps}
        style={{ width: "100%", aspectRatio: "1/1" }}
        controls
        loop
        autoPlay
        clickToPlay
      />
    </div>
  );
}

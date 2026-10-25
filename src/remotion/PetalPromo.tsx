import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const SHOE_1 = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80&auto=format&fit=crop";
const SHOE_2 = "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=80&auto=format&fit=crop";
const SHOE_3 = "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=900&q=80&auto=format&fit=crop";

const PETALS = ["🌸", "🌺", "🌷", "💮", "🌸", "🌺", "🌷", "🌸"];

function FallingPetals() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {PETALS.map((p, i) => {
        const speed = 1.1 + (i % 4) * 0.35;
        const y = ((frame * speed + i * 170) % 1200) - 120;
        const x = 60 + i * 130 + Math.sin((frame + i * 40) / 22) * 36;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, fontSize: 34 + (i % 3) * 10, opacity: 0.75, transform: `rotate(${frame * (i % 2 ? 1 : -1)}deg)` }}>
            {p}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function Scene({ children, bg }: { children: ReactNode; bg: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{ opacity, transform: `scale(${0.92 + s * 0.08}) translateY(${(1 - s) * 30}px)`, textAlign: "center", width: "100%" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

const title: CSSProperties = { fontFamily: "Georgia, serif", fontSize: 84, fontWeight: 700, color: "#2b1a22", lineHeight: 1.05, margin: 0 };
const sub: CSSProperties = { fontFamily: "Arial, sans-serif", fontSize: 30, color: "#7a6570", marginTop: 18 };
const pink: CSSProperties = { color: "#e75480", fontStyle: "italic" };

export function PetalPromo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fff0f5" }}>
      <FallingPetals />
      <Sequence from={0} durationInFrames={75}>
        <Scene bg="linear-gradient(135deg,#fff0f5,#ffffff)">
          <div style={{ fontSize: 72 }}>🌸</div>
          <h1 style={title}>Petal Steps<br /><span style={pink}>by TM</span></h1>
          <p style={sub}>Every step blooms with style</p>
        </Scene>
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <Scene bg="#ffffff">
          <Img src={SHOE_1} style={{ width: 620, height: 400, objectFit: "cover", borderRadius: 28, margin: "0 auto", boxShadow: "0 24px 50px rgba(231,84,128,.25)" }} />
          <h2 style={{ ...title, fontSize: 56, marginTop: 28 }}>Bloom Runner Sneakers</h2>
          <p style={{ ...sub, color: "#c73e68", fontWeight: 700 }}>Now R 899 · was R 1 199</p>
        </Scene>
      </Sequence>
      <Sequence from={150} durationInFrames={75}>
        <Scene bg="linear-gradient(135deg,#ffffff,#fff0f5)">
          <div style={{ display: "flex", gap: 22, justifyContent: "center" }}>
            <Img src={SHOE_2} style={{ width: 300, height: 340, objectFit: "cover", borderRadius: 24 }} />
            <Img src={SHOE_3} style={{ width: 300, height: 340, objectFit: "cover", borderRadius: 24 }} />
          </div>
          <h2 style={{ ...title, fontSize: 54, marginTop: 28 }}>Women · Men · Kids</h2>
          <p style={sub}>Heels, sneakers, sandals, boots &amp; more</p>
        </Scene>
      </Sequence>
      <Sequence from={225} durationInFrames={75}>
        <Scene bg="linear-gradient(120deg,#e75480,#f78fb0)">
          <h2 style={{ ...title, color: "#fff", fontSize: 68 }}>Up to 40% OFF</h2>
          <p style={{ ...sub, color: "#ffe3ee" }}>Free delivery on orders over R800</p>
          <div style={{ marginTop: 34, display: "inline-block", background: "#fff", color: "#c73e68", fontFamily: "Arial", fontWeight: 800, fontSize: 28, padding: "16px 38px", borderRadius: 99 }}>
            Shop Petal Steps by TM 🌸
          </div>
        </Scene>
      </Sequence>
    </AbsoluteFill>
  );
}

export const PROMO = { id: "PetalPromo", width: 1080, height: 1080, fps: 30, durationInFrames: 300 };

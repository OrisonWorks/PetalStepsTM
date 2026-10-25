import { Composition } from "remotion";
import { PetalPromo, PROMO } from "./PetalPromo";

export function RemotionRoot() {
  return (
    <Composition
      id={PROMO.id}
      component={PetalPromo}
      durationInFrames={PROMO.durationInFrames}
      fps={PROMO.fps}
      width={PROMO.width}
      height={PROMO.height}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { drawHero } from "@/game/art";

/** ゲームと同じ主人公を canvas で描画（アイドル/たまに攻撃） */
export default function HeroAvatar({ scale = 5 }: { scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(10, 46, 36, 2);
      const phase = t % 4;
      drawHero(ctx, 28, 46, { dir: 1, moving: false, air: false, t, atk: phase > 3.2 ? (phase - 3.2) / 0.8 : -1 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} width={56} height={52} className="pixelated" style={{ width: 56 * scale, height: 52 * scale }} />;
}

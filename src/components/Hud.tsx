"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { HudState } from "@/game/types";
import { coinPal, coinRows, heartEmpty, heartFull, heartRows, PixelArt, type Palette } from "./PixelArt";

interface Props {
  hud: HudState;
  damageTick: number;
  muted: boolean;
  onToggleMute: () => void;
  onHelp: () => void;
}

/* 도트 아이콘 (흰색 = 1, 빨강 = 2) */
const SPEAKER_ON = ["....1.....", "...11...1.", "1111.1...1", "1111.1...1", "1111.1...1", "1111.1...1", "...11...1.", "....1....."];
const SPEAKER_OFF = ["....1.....", "...11.....", "1111..1..2", "1111...22.", "1111...22.", "1111..2..2", "...11.....", "....1....."];
const QUESTION = [".1111.", "11..11", "....11", "...11.", "..11..", "......", "..11.."];
const ICON_PAL: Palette = { "1": "#ffffff", "2": "#ff6b6b" };

export default function Hud({ hud, damageTick, muted, onToggleMute, onHelp }: Props) {
  const heartsRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const expRef = useRef<HTMLDivElement>(null);
  const prevCoins = useRef(hud.coins);
  const prevHp = useRef(hud.hp);

  useEffect(() => {
    if (damageTick === 0) return;
    gsap.fromTo(heartsRef.current, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.2)" });
  }, [damageTick]);

  useLayoutEffect(() => {
    if (hud.coins !== prevCoins.current) {
      gsap.fromTo(coinRef.current, { scale: 1.6, color: "#ff8a1e" }, { scale: 1, color: "#6b4430", duration: 0.35, ease: "back.out(3)" });
      prevCoins.current = hud.coins;
    }
  }, [hud.coins]);

  useLayoutEffect(() => {
    if (hud.hp > prevHp.current) {
      gsap.fromTo(heartsRef.current, { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    }
    prevHp.current = hud.hp;
  }, [hud.hp]);

  useLayoutEffect(() => {
    // 도트 느낌으로 칸 단위(steps)로 차오르게
    gsap.to(expRef.current, { width: `${Math.min(100, (hud.exp / hud.expNext) * 100)}%`, duration: 0.5, ease: "steps(8)" });
  }, [hud.exp, hud.expNext]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 sm:p-4">
      {/* 좌측: 레벨 / 하트 / 경험치 */}
      <div className="pxl-box flex items-center gap-3 py-1.5 pl-1.5 pr-3">
        <div className="pxl-box pxl-gold flex h-11 w-11 shrink-0 flex-col items-center justify-center leading-none">
          <span className="text-[8px] tracking-wider">LV</span>
          <span className="text-base font-bold">{hud.level}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div ref={heartsRef} className="flex gap-1">
            {Array.from({ length: hud.maxHp }).map((_, i) => (
              <PixelArt key={i} rows={heartRows} palette={i < hud.hp ? heartFull : heartEmpty} size={3} />
            ))}
          </div>
          <div className="pxl-bar h-3 w-24 sm:w-32">
            <div ref={expRef} className="pxl-bar-fill h-full" style={{ width: 0 }} />
          </div>
        </div>
      </div>

      {/* 우측: 코인 / 소리 / 도움말 */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="pxl-box flex items-center gap-2 px-3 py-1.5 text-sm">
          <PixelArt rows={coinRows} palette={coinPal} size={2.5} />
          <span ref={coinRef} className="inline-block min-w-[2ch] font-bold text-[#6b4430]">
            {hud.coins}
          </span>
        </div>
        <button className="pxl-btn" onClick={onToggleMute} aria-label="소리 켜기/끄기 (M)" title="소리 (M)">
          <PixelArt rows={muted ? SPEAKER_OFF : SPEAKER_ON} palette={ICON_PAL} size={2.5} />
        </button>
        <button className="pxl-btn" onClick={onHelp} aria-label="조작법" title="조작법">
          <PixelArt rows={QUESTION} palette={ICON_PAL} size={2.5} />
        </button>
      </div>
    </div>
  );
}

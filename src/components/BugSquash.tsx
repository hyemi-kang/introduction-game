"use client";

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Sfx } from "@/game/audio";
import Overlay from "./Overlay";
import { bombPal, bombRows, bugPal, bugRows, coinPal, coinRows, goldBugPal, PixelArt } from "./PixelArt";

type BugType = "bug" | "gold" | "bomb";
interface Slot {
  id: number;
  type: BugType;
  life: number;
}
interface Pop {
  id: number;
  idx: number;
  text: string;
  color: string;
}

const DURATION = 20;
const KEYS: Record<string, number> = {
  KeyQ: 0, KeyW: 1, KeyE: 2,
  KeyA: 3, KeyS: 4, KeyD: 5,
  KeyZ: 6, KeyX: 7, KeyC: 8,
  Numpad7: 0, Numpad8: 1, Numpad9: 2,
  Numpad4: 3, Numpad5: 4, Numpad6: 5,
  Numpad1: 6, Numpad2: 7, Numpad3: 8,
};
const KEY_LABEL = ["Q", "W", "E", "A", "S", "D", "Z", "X", "C"];
const BEST_KEY = "pixel-village:bugsquash-best";

function Sprite({ type }: { type: BugType }) {
  if (type === "bomb") return <PixelArt rows={bombRows} palette={bombPal} size={6} />;
  return <PixelArt rows={bugRows} palette={type === "gold" ? goldBugPal : bugPal} size={6} />;
}

function Cell({
  idx,
  slot,
  onHit,
  onExpire,
  onResolved,
  pops,
  onPopDone,
  active,
}: {
  idx: number;
  slot: Slot | null;
  onHit: (idx: number, slot: Slot) => void;
  onExpire: (idx: number, id: number) => void;
  onResolved: (idx: number, id: number) => void;
  pops: Pop[];
  onPopDone: (id: number) => void;
  active: boolean;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const hit = useRef(false);

  useLayoutEffect(() => {
    if (!slot) return;
    hit.current = false;
    const el = inner.current!;
    gsap.set(el, { yPercent: 115, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 });
    const t = gsap
      .timeline()
      .to(el, { yPercent: 0, duration: 0.16, ease: "back.out(2.4)" })
      .to(el, { rotation: slot.type === "gold" ? 8 : 4, duration: 0.09, yoyo: true, repeat: Math.floor(slot.life / 0.09) }, "<0.1")
      .to(el, { yPercent: 115, duration: 0.14, ease: "power2.in" }, `>-0.02`)
      .call(() => onExpire(idx, slot.id));
    tl.current = t;
    return () => {
      t.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.id]);

  const click = () => {
    if (!slot || hit.current || !active) return;
    hit.current = true;
    tl.current?.kill();
    onHit(idx, slot);
    gsap
      .timeline({ onComplete: () => onResolved(idx, slot.id) })
      .to(inner.current, { scaleX: 1.5, scaleY: 0.25, rotation: 0, duration: 0.07 })
      .to(inner.current, { yPercent: 130, opacity: 0.2, duration: 0.14 });
  };

  return (
    <button
      onPointerDown={click}
      className="px-box relative aspect-square min-w-0 overflow-hidden border-0 p-0"
      style={{ ["--bg" as string]: "#4a3b2a", ["--bd" as string]: "#2a1d10" }}
      aria-label={`구멍 ${KEY_LABEL[idx]}`}
    >
      <span className="absolute left-1.5 top-1 z-20 text-[10px] text-white/40">{KEY_LABEL[idx]}</span>
      <div className="absolute inset-x-3 bottom-3 top-3 overflow-hidden">
        <div ref={inner} className="absolute inset-0 flex items-end justify-center pb-2">
          {slot && <Sprite type={slot.type} />}
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-2 z-10 h-4 bg-[#2a1d10]" style={{ boxShadow: "inset 0 4px #6b4a2a" }} />
      {pops.map((p) => (
        <PopText key={p.id} pop={p} onDone={onPopDone} />
      ))}
    </button>
  );
}

function PopText({ pop, onDone }: { pop: Pop; onDone: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    gsap.fromTo(
      ref.current,
      { y: 0, opacity: 1, scale: 0.6 },
      { y: -38, opacity: 0, scale: 1.3, duration: 0.7, ease: "power2.out", onComplete: () => onDone(pop.id) },
    );
  }, [pop.id, onDone]);
  return (
    <span ref={ref} className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 text-xl font-bold" style={{ color: pop.color, textShadow: "2px 2px 0 #000" }}>
      {pop.text}
    </span>
  );
}

export default function BugSquash({ sfx, onReward, onClose }: { sfx: Sfx; onReward: (coins: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<"ready" | "count" | "play" | "over">("ready");
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [slots, setSlots] = useState<(Slot | null)[]>(Array(9).fill(null));
  const [pops, setPops] = useState<Pop[]>([]);
  const [best, setBest] = useState(0);
  const [reward, setReward] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const idRef = useRef(1);
  const slotsRef = useRef<(Slot | null)[]>(Array(9).fill(null));
  const clock = useRef({ v: DURATION });
  const spawner = useRef<gsap.core.Tween | null>(null);
  const clockTween = useRef<gsap.core.Tween | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const playing = phase === "play";

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  const setSlot = (idx: number, v: Slot | null) => {
    slotsRef.current = slotsRef.current.map((s, i) => (i === idx ? v : s));
    setSlots(slotsRef.current);
  };

  const addPop = (idx: number, text: string, color: string) => setPops((p) => [...p, { id: idRef.current++, idx, text, color }]);
  const onPopDone = useCallback((id: number) => setPops((p) => p.filter((x) => x.id !== id)), []);

  const end = useCallback(() => {
    spawner.current?.kill();
    clockTween.current?.kill();
    slotsRef.current = Array(9).fill(null);
    setSlots(slotsRef.current);
    const s = scoreRef.current;
    const bonus = s > best && s > 0;
    const coins = Math.floor(s / 2) + (bonus ? 5 : 0);
    if (bonus) {
      try {
        localStorage.setItem(BEST_KEY, String(s));
      } catch {
        /* ignore */
      }
      setBest(s);
    }
    setNewBest(bonus);
    setReward(coins);
    if (coins > 0) onReward(coins);
    setPhase("over");
    sfx.play("levelup");
  }, [best, onReward, sfx]);

  const spawn = useCallback(() => {
    const elapsed = DURATION - clock.current.v;
    const free = slotsRef.current.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    if (free.length) {
      const idx = free[Math.floor(Math.random() * free.length)];
      const r = Math.random();
      const type: BugType = r < 0.14 ? "gold" : r < 0.34 ? "bomb" : "bug";
      const base = type === "gold" ? 0.65 : 1.15;
      setSlot(idx, { id: idRef.current++, type, life: Math.max(0.45, base - elapsed * 0.025) });
    }
    spawner.current = gsap.delayedCall(Math.max(0.28, 0.75 - elapsed * 0.025), spawn);
  }, []);

  const startPlay = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    clock.current.v = DURATION;
    setTime(DURATION);
    setPhase("play");
    gsap.fromTo(barRef.current, { scaleX: 1 }, { scaleX: 0, duration: DURATION, ease: "none" });
    clockTween.current = gsap.to(clock.current, {
      v: 0,
      duration: DURATION,
      ease: "none",
      onUpdate: () => setTime((t) => (Math.ceil(clock.current.v) !== t ? Math.ceil(clock.current.v) : t)),
      onComplete: end,
    });
    spawner.current = gsap.delayedCall(0.4, spawn);
  }, [end, spawn]);

  const begin = useCallback(() => {
    if (phase === "count" || phase === "play") return;
    sfx.play("select");
    setPhase("count");
    setCount(3);
    gsap.killTweensOf(barRef.current);
    gsap.set(barRef.current, { scaleX: 1 });
    const c = { n: 3 };
    gsap.to(c, {
      n: 0,
      duration: 3,
      ease: "none",
      onUpdate: () => {
        const v = Math.ceil(c.n);
        setCount((o) => {
          if (o !== v && v > 0) sfx.play("select");
          return v;
        });
      },
      onComplete: startPlay,
    });
  }, [phase, sfx, startPlay]);

  const onHit = (idx: number, slot: Slot) => {
    if (slot.type === "bomb") {
      scoreRef.current = Math.max(0, scoreRef.current - 3);
      comboRef.current = 0;
      sfx.play("bomb");
      addPop(idx, "-3", "#ef4444");
      gsap.fromTo(rootRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.15)" });
      gsap.fromTo("[data-flash]", { opacity: 0.55 }, { opacity: 0, duration: 0.4 });
    } else {
      comboRef.current += 1;
      const mult = comboRef.current >= 10 ? 3 : comboRef.current >= 5 ? 2 : 1;
      const gain = (slot.type === "gold" ? 5 : 1) * mult;
      scoreRef.current += gain;
      sfx.play(slot.type === "gold" ? "coin" : "squash");
      addPop(idx, `+${gain}`, slot.type === "gold" ? "#fde047" : "#bef264");
    }
    setScore(scoreRef.current);
    setCombo(comboRef.current);
  };

  const onExpire = (idx: number, id: number) => {
    if (slotsRef.current[idx]?.id !== id) return;
    // 逃した虫はコンボ途切れ（爆弾は除く）
    if (slotsRef.current[idx]?.type !== "bomb" && comboRef.current > 0) {
      comboRef.current = 0;
      setCombo(0);
    }
    setSlot(idx, null);
  };

  const onResolved = (idx: number, id: number) => {
    if (slotsRef.current[idx]?.id === id) setSlot(idx, null);
  };

  // キーボード
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Enter" || (e.code === "Space" && (phase === "ready" || phase === "over"))) {
        e.preventDefault();
        if (phase === "ready" || phase === "over") begin();
        return;
      }
      const idx = KEYS[e.code];
      if (idx === undefined || !playing || e.repeat) return;
      e.preventDefault();
      const s = slotsRef.current[idx];
      if (s) document.querySelectorAll<HTMLButtonElement>("[data-grid] button")[idx]?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, playing, begin]);

  useEffect(
    () => () => {
      spawner.current?.kill();
      clockTween.current?.kill();
    },
    [],
  );

  const mult = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  return (
    <Overlay title="BUG SQUASH — 버그를 잡아라!" onClose={onClose} bg="#3f7fd0" width="min(560px, 96vw)">
      <div ref={rootRef} className="relative flex flex-col gap-4 p-4 sm:p-6">
        <div data-flash className="pointer-events-none absolute inset-0 z-40 bg-red-600 opacity-0" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <PixelArt rows={coinRows} palette={coinPal} size={3} />
            SCORE <b className="text-xl text-yellow-300">{score}</b>
          </div>
          <div className="text-center">
            {combo >= 3 && (
              <span className="text-xs text-orange-300">
                {combo} COMBO{mult > 1 ? ` ×${mult}` : ""}
              </span>
            )}
          </div>
          <div>
            TIME <b className={`text-xl ${time <= 5 ? "text-red-400" : "text-cyan-300"}`}>{time}</b>
          </div>
        </div>

        <div className="h-3 bg-black/50 p-[2px] outline outline-2 outline-black">
          <div ref={barRef} className="h-full origin-left bg-cyan-400" />
        </div>

        <div data-grid className="relative grid grid-cols-3 gap-3 sm:gap-4">
          {slots.map((s, i) => (
            <Cell
              key={i}
              idx={i}
              slot={s}
              onHit={onHit}
              onExpire={onExpire}
              onResolved={onResolved}
              pops={pops.filter((p) => p.idx === i)}
              onPopDone={onPopDone}
              active={playing}
            />
          ))}

          {phase !== "play" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#2f6fc4]/90 p-4 text-center">
              {phase === "ready" && (
                <>
                  <p className="text-lg text-yellow-300">20초 안에 버그를 잡자!</p>
                  <ul className="flex flex-col items-center gap-1 text-xs text-white/80">
                    <li className="flex items-center gap-2"><PixelArt rows={bugRows} palette={bugPal} size={2} /> +1</li>
                    <li className="flex items-center gap-2"><PixelArt rows={bugRows} palette={goldBugPal} size={2} /> 황금 버그 +5</li>
                    <li className="flex items-center gap-2"><PixelArt rows={bombRows} palette={bombPal} size={2} /> 폭탄 −3 (건드리지 말 것!)</li>
                    <li className="text-white/50">클릭/탭 또는 키보드 Q W E / A S D / Z X C</li>
                  </ul>
                  <p className="text-xs text-white/50">BEST {best}</p>
                  <button className="px-btn" onClick={begin}>
                    ▶ START (Enter)
                  </button>
                </>
              )}
              {phase === "count" && <p className="text-6xl text-yellow-300">{count}</p>}
              {phase === "over" && (
                <>
                  <p className="text-sm text-white/70">TIME UP!</p>
                  <p className="text-4xl text-yellow-300">{score}</p>
                  {newBest && <p className="blink text-sm text-orange-300">★ NEW RECORD ★</p>}
                  <p className="flex items-center gap-2 text-sm">
                    <PixelArt rows={coinRows} palette={coinPal} size={3} /> +{reward} 코인 획득
                  </p>
                  <p className="text-xs text-white/50">BEST {best}</p>
                  <div className="flex gap-2">
                    <button className="px-btn" onClick={begin}>
                      ↻ RETRY
                    </button>
                    <button className="px-btn ghost" onClick={onClose}>
                      나가기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

"use client";

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sfx } from "@/game/audio";
import { Game } from "@/game/engine";
import { HudState, OverlayId, SceneId, VIEW_H, VIEW_W } from "@/game/types";
import BugSquash from "./BugSquash";
import GuildBoard from "./GuildBoard";
import Hud from "./Hud";
import JourneyMap from "./JourneyMap";
import Overlay from "./Overlay";
import ProfilePanel from "./ProfilePanel";
import ControlHint, { CONTROLS } from "./ControlHint";
import TouchControls from "./TouchControls";

type Open = OverlayId | "help" | null;

const INITIAL_HUD: HudState = { hp: 5, maxHp: 5, coins: 0, level: 1, exp: 0, expNext: 30 };

function Banner({ text, tick }: { text: string; tick: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!tick) return;
    const tl = gsap
      .timeline()
      .fromTo(ref.current, { xPercent: -120, opacity: 1 }, { xPercent: 0, duration: 0.5, ease: "back.out(1.6)" })
      .to(ref.current, { xPercent: 120, opacity: 0, duration: 0.45, ease: "power2.in" }, "+=1.4");
    return () => {
      tl.kill();
    };
  }, [tick]);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[22%] z-10 flex justify-center overflow-hidden">
      <div ref={ref} className="px-box mp-pill px-8 py-2 text-lg tracking-[0.15em] sm:text-2xl" style={{ opacity: 0 }}>
        {text}
      </div>
    </div>
  );
}

function Prompt({ label }: { label: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string>("");
  if (label) last.current = label;
  useLayoutEffect(() => {
    gsap.to(ref.current, { opacity: label ? 1 : 0, y: label ? 0 : 10, duration: 0.18, overwrite: true });
  }, [label]);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center sm:bottom-8">
      <div ref={ref} className="px-box mp-pill px-4 py-1.5 text-sm" style={{ opacity: 0 }}>
        <span className="keycap mr-2 !border-[#e0a24a] !bg-[#ffd36b] !text-[#6b3f1d] !shadow-[0_2px_0_#c9822c]">↑</span>
        {last.current}
      </div>
    </div>
  );
}

export default function GameRoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const seenHome = useRef(false);

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [banner, setBanner] = useState({ text: "", tick: 0 });
  const [damageTick, setDamageTick] = useState(0);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hint, setHint] = useState(true);
  const startedRef = useRef(false);

  const hideHint = useCallback(() => setHint(false), []);
  const showBanner = useCallback((text: string) => setBanner((b) => ({ text, tick: b.tick + 1 })), []);

  /* ゲーム生成 */
  useEffect(() => {
    let cancelled = false;
    let offFont: (() => void) | undefined;
    const sfx = new Sfx();
    sfxRef.current = sfx;
    setTouch(window.matchMedia("(pointer: coarse)").matches);

    // ピクセルフォント(Galmuri)は描画をブロックしないよう JS から後読みする。
    // CDN に届かない環境でも、ページとゲームはフォントなしで動く。
    if (!document.getElementById("galmuri-css")) {
      const link = document.createElement("link");
      link.id = "galmuri-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css";
      document.head.appendChild(link);
    }

    (async () => {
      // フォントは待たずに即開始（届いたら下で文字だけ描き直す）
      if (cancelled || !canvasRef.current) return;
      const game = new Game(
        canvasRef.current,
        {
          onHud: setHud,
          onOverlay: (id) => setOpen(id),
          onPrompt: setPrompt,
          onDamage: () => setDamageTick((n) => n + 1),
          onLevelUp: (lv) => showBanner(`LEVEL UP!  Lv.${lv}`),
          onScene: (id: SceneId, title: string) => {
            if (!startedRef.current) return;
            showBanner(title);
            if (id === "home" && !seenHome.current) {
              seenHome.current = true;
              // 家に入ったら自動でプロフィールを表示
              gsap.delayedCall(1.1, () => {
                if (cancelled) return;
                game.setPaused(true);
                setOpen("profile");
              });
            }
          },
        },
        sfx,
      );
      gameRef.current = game;
      game.setPaused(true);
      game.start();
      setReady(true);
      // ピクセルフォントが後から読み込まれたら、看板などの文字を新しいフォントで描き直す
      const onFont = () => game.refreshScenes();
      document.fonts.addEventListener("loadingdone", onFont);
      offFont = () => document.fonts.removeEventListener("loadingdone", onFont);
    })();

    return () => {
      cancelled = true;
      offFont?.();
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [showBanner]);

  /* M キーでミュート */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && startedRef.current) {
        const m = sfxRef.current?.toggleMute();
        if (m !== undefined) setMuted(m);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* 読み込みが終わったらそのまま開始（タイトル画面なし） */
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    gameRef.current?.setPaused(false);
    showBanner("HEMI VILLAGE");
  }, [ready, showBanner]);

  /* ブラウザの制約で音は最初の操作で初期化する */
  useEffect(() => {
    const unlock = () => {
      sfxRef.current?.init();
      sfxRef.current?.startBgm();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  const closeOverlay = useCallback(() => {
    setOpen(null);
    gameRef.current?.setPaused(false);
  }, []);

  const toggleMute = () => {
    const m = sfxRef.current?.toggleMute();
    if (m !== undefined) setMuted(m);
  };

  const openHelp = () => {
    gameRef.current?.setPaused(true);
    setOpen("help");
  };

  const onReward = useCallback((n: number) => gameRef.current?.addCoins(n), []);

  return (
    <main className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-[linear-gradient(#9ddcff,#d9f3ff)]">
      <div
        className="relative overflow-hidden rounded-[10px]"
        style={{ width: `min(100vw, calc(100dvh * ${VIEW_W} / ${VIEW_H}))`, aspectRatio: `${VIEW_W} / ${VIEW_H}`, boxShadow: "0 0 0 4px #fff1cf, 0 0 0 6px #e8a556, 0 14px 40px rgba(20,25,60,.45)" }}
      >
        <canvas ref={canvasRef} className="pixelated block h-full w-full" width={VIEW_W} height={VIEW_H} />

        {started && (
          <>
            <Hud hud={hud} damageTick={damageTick} muted={muted} onToggleMute={toggleMute} onHelp={openHelp} />
            <Banner text={banner.text} tick={banner.tick} />
            <Prompt label={prompt} />
            {hint && !touch && <ControlHint onDone={hideHint} />}
            {touch && gameRef.current && <TouchControls input={gameRef.current.input} />}
          </>
        )}
      </div>

      {open === "profile" && <ProfilePanel initialTab="status" onClose={closeOverlay} />}
      {open === "skills" && <ProfilePanel initialTab="skills" onClose={closeOverlay} />}
      {open === "journey" && <JourneyMap onClose={closeOverlay} />}
      {open === "board" && <GuildBoard onClose={closeOverlay} />}
      {open === "bugs" && sfxRef.current && <BugSquash sfx={sfxRef.current} onReward={onReward} onClose={closeOverlay} />}
      {open === "help" && (
        <Overlay title="HOW TO PLAY — 조작법" onClose={closeOverlay} width="min(460px, 94vw)">
          <div className="flex flex-col gap-1 p-5 text-sm">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6">
                <span className="text-yellow-300">{k}</span>
                <span className="text-white/80">{v}</span>
              </div>
            ))}
            <p className="mt-3 text-xs text-white/50">슬라임을 처치하면 코인과 경험치를 얻어요. 집 · 길드 · 아케이드의 문 앞에서 ↑ 를 눌러보세요!</p>
          </div>
        </Overlay>
      )}
    </main>
  );
}

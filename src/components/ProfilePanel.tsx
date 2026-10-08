"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { profile, skills } from "@/data/profile";
import HeroAvatar from "./HeroAvatar";
import Overlay from "./Overlay";

type Tab = "status" | "skills";

export default function ProfilePanel({ initialTab, onClose }: { initialTab: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const bodyRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(bodyRef);
      gsap.from(q("[data-in]"), { y: 18, opacity: 0, duration: 0.4, stagger: 0.07, ease: "power2.out", delay: 0.25 });

      // ステータスバー: ステップ状に伸ばす
      gsap.fromTo(
        q("[data-bar]"),
        { width: "0%" },
        {
          width: (_i: number, el: Element) => `${(el as HTMLElement).dataset.bar}%`,
          duration: 1,
          delay: 0.5,
          ease: "steps(16)",
          stagger: 0.12,
        },
      );
      gsap.fromTo(
        q("[data-pip]"),
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(3)", stagger: 0.04, delay: 0.5 },
      );

      // 自己紹介のタイプライター
      if (introRef.current) {
        const full = profile.intro;
        const o = { n: 0 };
        introRef.current.textContent = "";
        gsap.to(o, {
          n: full.length,
          duration: full.length * 0.025,
          delay: 0.6,
          ease: "none",
          onUpdate: () => {
            if (introRef.current) introRef.current.textContent = full.slice(0, Math.floor(o.n));
          },
        });
      }
    }, bodyRef);
    return () => ctx.revert();
  }, [tab]);

  return (
    <Overlay title={tab === "status" ? "STATUS — 내 정보" : "BOOKSHELF — 스킬"} onClose={onClose}>
      <div className="flex gap-2 px-4 pt-4">
        {(["status", "skills"] as Tab[]).map((t) => (
          <button key={t} className={`px-btn ${tab === t ? "" : "ghost"}`} onClick={() => setTab(t)}>
            {t === "status" ? "STATUS" : "SKILLS"}
          </button>
        ))}
      </div>

      <div ref={bodyRef} className="p-4 sm:p-6">
        {tab === "status" ? (
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div data-in className="flex flex-col items-center gap-3">
              <div className="px-box --bg flex items-center justify-center" style={{ ["--bg" as string]: "#86c8f5", padding: 4 }}>
                <HeroAvatar scale={5} />
              </div>
              <div className="px-box px-3 py-1 text-center text-xs" style={{ ["--bg" as string]: "#35507a" }}>
                <span className="text-yellow-300">Lv.{profile.level}</span> {profile.title}
              </div>
              <div className="flex flex-col gap-1 text-xs text-sky-200">
                {profile.contacts.map((c) => (
                  <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="hover:text-yellow-300">
                    ▸ {c.label}: {c.value}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div data-in>
                <h3 className="text-2xl text-yellow-300">
                  {profile.name} <span className="text-sm text-white/60">&quot;{profile.nickname}&quot;</span>
                </h3>
                <p className="mt-1 text-xs text-white/60">
                  Guild: {profile.guild} · {profile.location}
                </p>
              </div>

              <div data-in className="px-box p-3" style={{ ["--bg" as string]: "#35507a" }}>
                <p ref={introRef} className="min-h-[4.5em] text-sm leading-relaxed" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {profile.stats.map((s) => (
                  <div key={s.label} data-in>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>
                        <b style={{ color: s.color }}>{s.label}</b> {s.name}
                      </span>
                      <span>{s.value}</span>
                    </div>
                    <div className="h-4 bg-black/50 p-[2px] outline outline-2 outline-black">
                      <div
                        data-bar={s.value}
                        className="h-full"
                        style={{
                          background: `repeating-linear-gradient(90deg, ${s.color} 0 6px, color-mix(in srgb, ${s.color} 70%, black) 6px 8px)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <dl data-in className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                {profile.info.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-yellow-300">▸ {k}</dt>
                    <dd className="mb-1 sm:mb-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {skills.map((g) => (
              <section key={g.group} data-in className="px-box p-3" style={{ ["--bg" as string]: "#35507a" }}>
                <h3 className="mb-3 text-sm text-yellow-300">
                  {g.icon} {g.group}
                </h3>
                <ul className="flex flex-col gap-3">
                  {g.items.map((it) => (
                    <li key={it.name} className="text-sm">
                      <div className="mb-1 flex justify-between">
                        <span>{it.name}</span>
                        <span className="text-xs text-white/60">Lv.{it.lv}</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            data-pip
                            className="h-3 flex-1"
                            style={{ background: i < it.lv ? "#fbbf24" : "#6aa3e8", boxShadow: "inset 0 -3px rgba(0,0,0,.3)" }}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}

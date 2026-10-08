"use client";

import type { Action, Input } from "@/game/input";

function Btn({ input, action, label, className = "" }: { input: Input; action: Action; label: string; className?: string }) {
  return (
    <button
      className={`px-btn ghost select-none ${className}`}
      style={{ touchAction: "none", width: 56, height: 56, fontSize: 18, opacity: 0.85 }}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        input.press(action);
      }}
      onPointerUp={() => input.release(action)}
      onPointerCancel={() => input.release(action)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function TouchControls({ input }: { input: Input }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-3 [&>div]:pointer-events-auto">
      <div className="flex gap-2">
        <Btn input={input} action="left" label="◀" />
        <Btn input={input} action="right" label="▶" />
      </div>
      <div className="flex items-end gap-2">
        <Btn input={input} action="interact" label="↑" />
        <Btn input={input} action="attack" label="⚔" className="red" />
        <Btn input={input} action="jump" label="⤒" />
      </div>
    </div>
  );
}

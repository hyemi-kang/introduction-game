export type SceneId = "village" | "home" | "guild" | "arcade";
export type OverlayId = "profile" | "skills" | "journey" | "board" | "bugs";

export const VIEW_W = 480;
export const VIEW_H = 270;

export interface HudState {
  hp: number;
  maxHp: number;
  coins: number;
  level: number;
  exp: number;
  expNext: number;
}

export interface GameEvents {
  onHud(s: HudState): void;
  onOverlay(id: OverlayId): void;
  onPrompt(label: string | null): void;
  onScene(id: SceneId, title: string): void;
  onDamage(): void;
  onLevelUp(level: number): void;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  /** 下キー+ジャンプで降りられる足場 */
  oneWay: boolean;
}

export interface Interactable {
  id: string;
  x: number; // 中心X
  w: number;
  label: string;
  /** プロンプト吹き出しのY */
  hintY: number;
  to?: { scene: SceneId; x: number };
  overlay?: OverlayId;
}

export interface EnemySpawn {
  kind: "slime" | "dummy";
  x: number;
  range: number;
}

export interface Pickup {
  x: number;
  y: number;
}

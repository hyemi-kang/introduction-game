export type Action = "left" | "right" | "jump" | "attack" | "interact" | "down";

const KEYMAP: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyC: "jump",
  KeyZ: "attack",
  KeyX: "attack",
  KeyJ: "attack",
  ArrowUp: "interact",
  KeyW: "interact",
  KeyE: "interact",
  ArrowDown: "down",
  KeyS: "down",
};

export class Input {
  private held = new Set<Action>();
  private edge = new Set<Action>();
  enabled = true;

  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a || !this.enabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat && !this.held.has(a)) this.edge.add(a);
    this.held.add(a);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (a) this.held.delete(a);
  };

  private onBlur = () => this.clear();

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  /** タッチ操作用 */
  press(a: Action) {
    if (!this.enabled) return;
    if (!this.held.has(a)) this.edge.add(a);
    this.held.add(a);
  }
  release(a: Action) {
    this.held.delete(a);
  }

  isDown(a: Action) {
    return this.held.has(a);
  }
  /** このフレームで押された（エッジ） */
  pressed(a: Action) {
    return this.edge.has(a);
  }
  endFrame() {
    this.edge.clear();
  }
  clear() {
    this.held.clear();
    this.edge.clear();
  }
}

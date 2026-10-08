import gsap from "gsap";
import { Sfx } from "./audio";
import { drawCoin, drawDummy, drawHero, drawSlash, drawSlime, text } from "./art";
import { Input } from "./input";
import { createScene, drawArrow, Scene } from "./scenes";
import { GameEvents, HudState, Interactable, SceneId, VIEW_H, VIEW_W } from "./types";

const GRAVITY = 950;
const MAX_FALL = 480;
const RUN = 112;
const JUMP_V = 330;

interface Enemy {
  kind: "slime" | "dummy";
  homeX: number;
  range: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  alive: boolean;
  hurt: number;
  timer: number;
  dir: 1 | -1;
  onGround: boolean;
  respawn: number;
  wob: number;
  squash: number;
}

interface CoinE {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
  age: number;
  taken: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Floater {
  x: number;
  y: number;
  life: number;
  str: string;
  color: string;
}

export class Game {
  readonly input = new Input();
  private ctx: CanvasRenderingContext2D;
  private scenes = new Map<SceneId, Scene>();
  private scene!: Scene;
  private enemies: Enemy[] = [];
  private coins: CoinE[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private cam = 0;
  private t = 0;
  private hitstop = 0;
  private shake = 0;
  private fade = { v: 0, cx: VIEW_W / 2, cy: VIEW_H / 2 };
  private locked = false;
  private paused = false;
  /** オーバーレイを閉じた直後の誤入力で出口に入らないための猶予(秒) */
  private interactLock = 0;
  private running = false;
  private lastPrompt: string | null = null;

  private p = {
    x: 150,
    y: 224,
    vx: 0,
    vy: 0,
    dir: 1 as 1 | -1,
    onGround: true,
    coyote: 0,
    jumpBuf: 0,
    dropT: 0,
    atkT: -1,
    atkCd: 0,
    invuln: 0,
    hp: 5,
    maxHp: 5,
    anim: 0,
  };
  private hitSet = new Set<Enemy>();
  private hud: HudState = { hp: 5, maxHp: 5, coins: 0, level: 1, exp: 0, expNext: 30 };

  constructor(
    private canvas: HTMLCanvasElement,
    private ev: GameEvents,
    readonly sfx: Sfx,
  ) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
  }

  /* ---------- lifecycle ---------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.input.attach();
    this.setScene("village", 150, false);
    this.emitHud();
    gsap.ticker.add(this.tick);
  }

  /** 背景キャッシュを作り直す（フォント読み込み完了後などに文字を描き直すため）。ゲーム状態は変えない */
  refreshScenes() {
    if (!this.scene) return;
    const id = this.scene.id;
    this.scenes.clear();
    this.scene = this.getScene(id);
  }

  destroy() {
    this.running = false;
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf(this.fade);
    this.input.detach();
    this.sfx.stopBgm();
  }

  setPaused(v: boolean) {
    this.paused = v;
    if (!v) this.interactLock = 0.4;
    this.input.enabled = !v;
    if (v) this.input.clear();
  }

  addCoins(n: number) {
    this.hud.coins += n;
    this.emitHud();
  }

  getHud() {
    return this.hud;
  }

  private emitHud() {
    this.hud.hp = this.p.hp;
    this.hud.maxHp = this.p.maxHp;
    this.ev.onHud({ ...this.hud });
  }

  /* ---------- scene ---------- */

  private getScene(id: SceneId) {
    let s = this.scenes.get(id);
    if (!s) {
      s = createScene(id);
      this.scenes.set(id, s);
    }
    return s;
  }

  private setScene(id: SceneId, x: number, announce = true) {
    this.scene = this.getScene(id);
    const p = this.p;
    p.x = x;
    p.y = this.scene.ground;
    p.vx = p.vy = 0;
    p.onGround = true;
    p.atkT = -1;
    this.enemies = this.scene.enemies.map((s) => ({
      kind: s.kind,
      homeX: s.x,
      range: s.range,
      x: s.x,
      y: this.scene.ground,
      vx: 0,
      vy: 0,
      hp: s.kind === "dummy" ? 9999 : 3,
      alive: true,
      hurt: 0,
      timer: 0.5 + Math.random(),
      dir: Math.random() < 0.5 ? 1 : -1,
      onGround: true,
      respawn: 0,
      wob: 0,
      squash: 0,
    }));
    this.coins = this.scene.pickups.map((pk) => ({ x: pk.x, y: pk.y, vx: 0, vy: 0, fixed: true, age: 1, taken: false }));
    this.particles = [];
    this.floaters = [];
    this.cam = this.camTarget();
    this.sfx.setTheme(this.scene.theme);
    this.lastPrompt = null;
    if (announce) this.ev.onScene(id, this.scene.title);
    else this.ev.onScene(id, this.scene.title);
  }

  private camTarget() {
    return Math.max(0, Math.min(this.scene.width - VIEW_W, this.p.x - VIEW_W / 2));
  }

  private transition(cb: () => void, fadeIn = true) {
    this.locked = true;
    this.fade.cx = Math.round(this.p.x - this.cam);
    this.fade.cy = Math.round(this.p.y - 14);
    gsap.killTweensOf(this.fade);
    gsap.to(this.fade, {
      v: 1,
      duration: 0.45,
      ease: "power2.in",
      onComplete: () => {
        cb();
        this.fade.cx = Math.round(this.p.x - this.cam);
        this.fade.cy = Math.round(this.p.y - 14);
        if (fadeIn)
          gsap.to(this.fade, {
            v: 0,
            duration: 0.55,
            ease: "power2.out",
            onComplete: () => {
              this.locked = false;
            },
          });
      },
    });
  }

  private enter(id: SceneId, x: number) {
    this.sfx.play("enter");
    this.transition(() => this.setScene(id, x));
  }

  /* ---------- update ---------- */

  private tick = (_time: number, deltaMs: number) => {
    if (!this.running) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.t += dt;
    try {
      if (!this.paused) this.update(dt);
      this.render();
    } catch (err) {
      // 描画エラーを握りつぶさず、画面にも表示して原因を特定しやすくする
      if (!this.errored) {
        this.errored = true;
        console.error("[game] frame error:", err);
      }
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#1b1230";
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.fillStyle = "#fca5a5";
      c.font = "10px monospace";
      c.textAlign = "left";
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      for (let i = 0; i < msg.length; i += 70) c.fillText(msg.slice(i, i + 70), 8, 20 + (i / 70) * 12);
    }
    this.input.endFrame();
  };
  private errored = false;

  private update(dt: number) {
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    const p = this.p;
    const inp = this.input;
    const sc = this.scene;
    const canAct = !this.locked;

    // 入力
    const ax = canAct ? (inp.isDown("right") ? 1 : 0) - (inp.isDown("left") ? 1 : 0) : 0;
    if (canAct && inp.pressed("jump")) p.jumpBuf = 0.12;
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.coyote = p.onGround ? 0.09 : Math.max(0, p.coyote - dt);
    p.dropT = Math.max(0, p.dropT - dt);
    p.atkCd = Math.max(0, p.atkCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);

    // 攻撃
    if (canAct && inp.pressed("attack") && p.atkCd <= 0) {
      p.atkT = 0;
      p.atkCd = 0.34;
      this.hitSet.clear();
      this.sfx.play("attack");
    }
    if (p.atkT >= 0) {
      p.atkT += dt;
      if (p.atkT > 0.07 && p.atkT < 0.2) this.attackHit();
      if (p.atkT >= 0.3) p.atkT = -1;
    }

    // 水平移動
    const attacking = p.atkT >= 0;
    const target = ax * RUN * (attacking && p.onGround ? 0.45 : 1);
    const acc = (p.onGround ? 1100 : 700) * dt;
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - acc);
    if (ax !== 0 && !attacking) p.dir = ax as 1 | -1;

    // ジャンプ
    if (p.jumpBuf > 0 && p.coyote > 0) {
      const plat = this.standingPlatform();
      if (inp.isDown("down") && plat?.oneWay) {
        p.dropT = 0.22;
        p.y += 2;
        p.onGround = false;
      } else {
        p.vy = -JUMP_V;
        p.onGround = false;
        this.sfx.play("jump");
        this.puff(p.x, p.y, 4);
      }
      p.jumpBuf = 0;
      p.coyote = 0;
    }
    if (!inp.isDown("jump") && p.vy < -130) p.vy = -130;

    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    p.x = Math.max(8, Math.min(sc.width - 8, p.x + p.vx * dt));
    const prevY = p.y;
    p.y += p.vy * dt;
    p.onGround = false;
    if (p.vy >= 0) {
      const land = this.findLanding(prevY);
      if (land !== null) {
        if (p.vy > 200) this.puff(p.x, land, 5);
        p.y = land;
        p.vy = 0;
        p.onGround = true;
      }
    }
    p.anim += dt;

    // 入口 / オブジェクト
    const near = canAct ? this.nearInteractable() : undefined;
    const label = near ? near.label : null;
    if (label !== this.lastPrompt) {
      this.lastPrompt = label;
      this.ev.onPrompt(label);
    }
    this.interactLock = Math.max(0, this.interactLock - dt);
    if (near && this.interactLock <= 0 && inp.pressed("interact")) this.activate(near);

    // 敵
    for (const e of this.enemies) this.updateEnemy(e, dt);

    // コイン
    for (const c of this.coins) {
      if (c.taken) continue;
      c.age += dt;
      if (!c.fixed) {
        c.vy += GRAVITY * 0.7 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > sc.ground - 5) {
          c.y = sc.ground - 5;
          c.vy *= -0.45;
          c.vx *= 0.7;
          if (Math.abs(c.vy) < 20) c.vy = 0;
        }
      }
      const dx = p.x - c.x;
      const dy = p.y - 10 - c.y;
      const d = Math.hypot(dx, dy);
      if (c.age > 0.35 && d < 44) {
        c.fixed = false;
        c.vx = (dx / d) * 220;
        c.vy = (dy / d) * 220;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
      if (c.age > 0.25 && d < 11) {
        c.taken = true;
        this.hud.coins += 1;
        this.sfx.play("coin");
        this.spark(c.x, c.y, "#fde047", 3);
        this.emitHud();
      }
    }
    this.coins = this.coins.filter((c) => !c.taken);

    // パーティクル等
    for (const q of this.particles) {
      q.life -= dt;
      q.vy += 400 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 22 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.shake = Math.max(0, this.shake - dt);

    // カメラ
    const target2 = this.camTarget();
    this.cam += (target2 - this.cam) * Math.min(1, dt * 8);
  }

  private standingPlatform() {
    const p = this.p;
    for (const pl of this.scene.platforms) {
      if (Math.abs(p.y - pl.y) < 1.5 && p.x + 4 > pl.x && p.x - 4 < pl.x + pl.w) return pl;
    }
    return undefined;
  }

  private findLanding(prevY: number): number | null {
    const p = this.p;
    let best: number | null = null;
    if (prevY <= this.scene.ground + 0.01 && p.y >= this.scene.ground) best = this.scene.ground;
    if (p.dropT <= 0) {
      for (const pl of this.scene.platforms) {
        if (prevY <= pl.y + 0.01 && p.y >= pl.y && p.x + 4 > pl.x && p.x - 4 < pl.x + pl.w) {
          if (best === null || pl.y < best) best = pl.y;
        }
      }
    }
    return best;
  }

  private nearInteractable(): Interactable | undefined {
    const p = this.p;
    return this.scene.interactables.find((i) => Math.abs(p.x - i.x) < i.w / 2 + 3 && p.y > this.scene.ground - 4);
  }

  private activate(it: Interactable) {
    if (it.to) {
      this.enter(it.to.scene, it.to.x);
    } else if (it.overlay) {
      this.sfx.play("select");
      this.p.vx = 0;
      this.setPaused(true);
      this.ev.onOverlay(it.overlay);
    }
  }

  private attackHit() {
    const p = this.p;
    const x0 = p.dir > 0 ? p.x + 1 : p.x - 1 - 30;
    const hb = { x: x0, y: p.y - 28, w: 30, h: 26 };
    const dmg = 1 + Math.floor((this.hud.level - 1) / 3);
    for (const e of this.enemies) {
      if (!e.alive || this.hitSet.has(e)) continue;
      const w = e.kind === "dummy" ? 18 : 18;
      const h = e.kind === "dummy" ? 36 : 12;
      if (e.x + w / 2 > hb.x && e.x - w / 2 < hb.x + hb.w && e.y > hb.y && e.y - h < hb.y + hb.h) {
        this.hitSet.add(e);
        this.damageEnemy(e, dmg);
      }
    }
  }

  private damageEnemy(e: Enemy, dmg: number) {
    const p = this.p;
    e.hurt = 0.22;
    e.hp -= dmg;
    this.hitstop = 0.05;
    this.shake = 0.12;
    this.sfx.play("hit");
    this.floaters.push({ x: e.x, y: e.y - (e.kind === "dummy" ? 40 : 18), life: 0.7, str: String(dmg), color: "#fff" });
    this.spark(e.x, e.y - 8, "#ffffff", 4);
    if (e.kind === "dummy") {
      e.wob = 0.35 * p.dir;
      return;
    }
    e.vx = p.dir * 130;
    e.vy = -130;
    e.onGround = false;
    if (e.hp <= 0) {
      e.alive = false;
      e.respawn = 12;
      this.sfx.play("kill");
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: e.x,
          y: e.y - 6,
          vx: (Math.random() - 0.5) * 150,
          vy: -60 - Math.random() * 120,
          life: 0.6 + Math.random() * 0.3,
          max: 0.9,
          color: i % 2 ? "#6ee7a0" : "#2f9e63",
          size: 2 + Math.floor(Math.random() * 2),
        });
      }
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        this.coins.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 110, vy: -150 - Math.random() * 60, fixed: false, age: 0, taken: false });
      }
      this.gainExp(12);
    }
  }

  private gainExp(n: number) {
    this.hud.exp += n;
    while (this.hud.exp >= this.hud.expNext) {
      this.hud.exp -= this.hud.expNext;
      this.hud.level += 1;
      this.hud.expNext = Math.round(this.hud.expNext * 1.5);
      this.p.maxHp = Math.min(8, this.p.maxHp + (this.hud.level % 2 === 0 ? 1 : 0));
      this.p.hp = this.p.maxHp;
      this.sfx.play("levelup");
      this.ev.onLevelUp(this.hud.level);
      this.floaters.push({ x: this.p.x, y: this.p.y - 36, life: 1.4, str: "LEVEL UP!", color: "#fde047" });
      this.spark(this.p.x, this.p.y - 12, "#fde047", 16);
    }
    this.emitHud();
  }

  private updateEnemy(e: Enemy, dt: number) {
    const p = this.p;
    const sc = this.scene;
    e.hurt = Math.max(0, e.hurt - dt);
    if (e.kind === "dummy") {
      e.wob *= Math.pow(0.02, dt);
      return;
    }
    if (!e.alive) {
      e.respawn -= dt;
      if (e.respawn <= 0 && Math.abs(p.x - e.homeX) > 160) {
        e.alive = true;
        e.hp = 3;
        e.x = e.homeX;
        e.y = sc.ground;
        e.vx = e.vy = 0;
        this.spark(e.x, e.y - 6, "#6ee7a0", 6);
      }
      return;
    }
    e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.y >= sc.ground) {
      if (!e.onGround && e.vy > 60) e.squash = 1;
      e.y = sc.ground;
      e.vy = 0;
      e.onGround = true;
      e.vx *= Math.pow(0.0005, dt);
      if (e.hurt <= 0 && Math.abs(e.vx) < 8) e.vx = 0;
    }
    e.squash = Math.max(0, e.squash - dt * 5);
    if (e.onGround && e.hurt <= 0) {
      e.timer -= dt;
      if (e.timer <= 0) {
        const near = Math.abs(p.x - e.x) < 100 && Math.abs(p.y - e.y) < 30;
        if (near) e.dir = p.x > e.x ? 1 : -1;
        else if (e.x > e.homeX + e.range) e.dir = -1;
        else if (e.x < e.homeX - e.range) e.dir = 1;
        else if (Math.random() < 0.3) e.dir = (e.dir * -1) as 1 | -1;
        e.vx = e.dir * (near ? 62 : 38);
        e.vy = -150;
        e.onGround = false;
        e.squash = -0.6;
        e.timer = near ? 0.55 : 0.9 + Math.random() * 0.9;
      }
    }
    // 接触ダメージ
    if (!this.locked && p.invuln <= 0 && Math.abs(p.x - e.x) < 11 && p.y > e.y - 12 && p.y - 20 < e.y) {
      this.hurtPlayer(e.x < p.x ? 1 : -1);
    }
  }

  private hurtPlayer(fromDir: 1 | -1) {
    const p = this.p;
    p.hp -= 1;
    p.invuln = 1.2;
    p.vx = fromDir * 150;
    p.vy = -170;
    p.onGround = false;
    p.atkT = -1;
    this.shake = 0.25;
    this.sfx.play("hurt");
    this.ev.onDamage();
    this.emitHud();
    if (p.hp <= 0) {
      this.locked = true;
      this.floaters.push({ x: p.x, y: p.y - 36, life: 1.4, str: "K.O.", color: "#fca5a5" });
      gsap.delayedCall(0.7, () => {
        this.transition(() => {
          p.hp = p.maxHp;
          p.invuln = 1.5;
          this.setScene(this.scene.id, this.scene.spawn, false);
          this.emitHud();
        });
      });
    }
  }

  private puff(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 1,
        vx: (Math.random() - 0.5) * 60,
        vy: -10 - Math.random() * 25,
        life: 0.25,
        max: 0.25,
        color: "#f1f5f9",
        size: 2,
      });
    }
  }

  private spark(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 80;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.3 + Math.random() * 0.2, max: 0.5, color, size: 2 });
    }
  }

  /* ---------- render ---------- */

  private render() {
    const ctx = this.ctx;
    const sc = this.scene;
    const cam = Math.round(this.cam);
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
    sc.draw(ctx, cam, this.t);

    // 入口ヒント
    const near = this.nearInteractable();
    for (const it of sc.interactables) {
      const bob = Math.round(Math.sin(this.t * 4 + it.x) * 2);
      drawArrow(ctx, Math.round(it.x - cam), it.hintY + bob, it === near);
    }

    // コイン
    for (const c of this.coins) drawCoin(ctx, Math.round(c.x - cam), Math.round(c.y), this.t + c.x * 0.01);

    // 敵
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const sx = Math.round(e.x - cam);
      if (e.kind === "slime") {
        px_shadow(ctx, sx, e.y, 16);
        drawSlime(ctx, sx, e.y, e.squash, e.hurt > 0 && Math.floor(this.t * 40) % 2 === 0, this.t);
      } else {
        px_shadow(ctx, sx, e.y, 18);
        drawDummy(ctx, sx, e.y, e.wob * Math.sin(this.t * 18), e.hurt > 0);
      }
    }

    // プレイヤー
    const p = this.p;
    const blink = p.invuln > 0 && Math.floor(this.t * 20) % 2 === 0;
    if (!blink && !(p.hp <= 0 && this.locked && this.fade.v > 0.6)) {
      const sx = Math.round(p.x - cam);
      px_shadow(ctx, sx, this.groundUnder(), 12);
      const atkP = p.atkT >= 0 ? Math.min(1, p.atkT / 0.28) : -1;
      drawHero(ctx, sx, p.y, {
        dir: p.dir,
        moving: Math.abs(p.vx) > 15,
        air: !p.onGround,
        t: this.t,
        atk: atkP,
        vy: p.vy > 20 ? 1 : p.vy < -20 ? -1 : 0,
      });
      if (atkP >= 0) drawSlash(ctx, sx, p.y, p.dir, atkP);
    }

    // パーティクル
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life / q.max));
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      text(ctx, f.str, Math.round(f.x - cam), Math.round(f.y), f.color, 8, "center", "#35507a");
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // アイリスワイプ
    if (this.fade.v > 0.001) {
      const maxR = Math.hypot(VIEW_W, VIEW_H);
      const r = Math.max(0, (1 - this.fade.v) * maxR);
      const step = 6; // ピクセルっぽく段階化
      const rr = Math.floor(r / step) * step;
      ctx.save();
      ctx.fillStyle = "#cdeeff";
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, VIEW_H);
      if (rr > 0) ctx.arc(this.fade.cx, this.fade.cy, rr, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();
    }
  }

  private groundUnder() {
    const p = this.p;
    let g = this.scene.ground;
    for (const pl of this.scene.platforms) {
      if (p.y <= pl.y + 1 && p.x + 4 > pl.x && p.x - 4 < pl.x + pl.w && pl.y < g) g = pl.y;
    }
    return g;
  }
}

function px_shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - 1), w, 2);
}

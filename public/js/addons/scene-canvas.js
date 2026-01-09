/* /public/js/addons/scene-canvas.js */
(() => {
  const CANVAS_ID = "sceneCanvas";
  const MANIFEST_URL = "/art/_manifest.json";

  // Utilities
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();

  function lerp(a, b, t) { return a + (b - a) * t; }

  function parseKey(id, pose) {
    // allow passing full key like "char-nova-neutral"
    if (pose && id && !id.includes("-" + pose)) return `${id}-${pose}`;
    return id;
  }

  function fitCover(srcW, srcH, dstW, dstH) {
    const s = Math.max(dstW / srcW, dstH / srcH);
    const w = srcW * s;
    const h = srcH * s;
    return { w, h, x: (dstW - w) / 2, y: (dstH - h) / 2, s };
  }

  class SceneCanvas {
    constructor() {
      this.canvas = document.getElementById(CANVAS_ID);
      if (!this.canvas) {
        console.warn(`[SceneCanvas] Missing <canvas id="${CANVAS_ID}">`);
        return;
      }
      this.ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true });

      this.dpr = Math.max(1, window.devicePixelRatio || 1);
      this.w = 0;
      this.h = 0;

      this.manifest = null;
      this.imageCache = new Map(); // key -> HTMLImageElement
      this.pendingLoads = new Map(); // key -> Promise<img>

      this.activeSceneSig = "";
      this.fromScene = null;
      this.toScene = null;

      this.fadeMs = 220;
      this.animId = null;

      this._onResize = () => this.resize(true);
      window.addEventListener("resize", this._onResize, { passive: true });

      this.resize(true);
    }

    async init() {
      if (this.manifest) return;
      try {
        const res = await fetch(MANIFEST_URL, { cache: "force-cache" });
        this.manifest = await res.json();
      } catch (e) {
        console.warn("[SceneCanvas] Failed to load manifest:", e);
        this.manifest = {};
      }
    }

    resize(redraw = false) {
      const rect = this.canvas.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width || window.innerWidth));
      const cssH = Math.max(1, Math.floor(rect.height || window.innerHeight));

      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const pxW = Math.floor(cssW * dpr);
      const pxH = Math.floor(cssH * dpr);

      if (pxW !== this.canvas.width || pxH !== this.canvas.height) {
        this.canvas.width = pxW;
        this.canvas.height = pxH;
      }
      this.w = pxW;
      this.h = pxH;
      this.dpr = dpr;

      if (redraw) this.drawImmediate();
    }

    resolveAsset(key) {
      if (!key) return null;
      if (this.manifest && this.manifest[key]) return this.manifest[key];

      // allow passing direct URLs too
      if (typeof key === "string" && (key.startsWith("/") || key.startsWith("http"))) return key;

      return null;
    }

    loadImage(key) {
      const url = this.resolveAsset(key);
      if (!url) return Promise.resolve(null);

      if (this.imageCache.has(key)) return Promise.resolve(this.imageCache.get(key));
      if (this.pendingLoads.has(key)) return this.pendingLoads.get(key);

      const p = new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          this.imageCache.set(key, img);
          this.pendingLoads.delete(key);
          resolve(img);
        };
        img.onerror = () => {
          console.warn("[SceneCanvas] Image failed:", key, url);
          this.pendingLoads.delete(key);
          resolve(null);
        };
        img.src = url;
      });

      this.pendingLoads.set(key, p);
      return p;
    }

    // Build signature so we only transition when something truly changes
    sceneSignature(scene) {
      if (!scene) return "";
      const L = scene.left ? `${scene.left.id || ""}:${scene.left.pose || ""}:${scene.left.x ?? ""}:${scene.left.y ?? ""}:${scene.left.scale ?? ""}:${scene.left.alpha ?? ""}` : "";
      const R = scene.right ? `${scene.right.id || ""}:${scene.right.pose || ""}:${scene.right.x ?? ""}:${scene.right.y ?? ""}:${scene.right.scale ?? ""}:${scene.right.alpha ?? ""}` : "";
      return [
        scene.bg || "",
        scene.overlay || "",
        scene.blurBg ? "b1" : "b0",
        scene.vignette ? "v1" : "v0",
        L,
        R
      ].join("|");
    }

    async apply(scene, opts = {}) {
      await this.init();

      const fadeMs = Number.isFinite(opts.fadeMs) ? opts.fadeMs : this.fadeMs;
      this.fadeMs = clamp(fadeMs, 0, 2000);

      // Normalize + allow id/pose composition
      const norm = (s) => {
        if (!s) return null;
        const out = { ...s };
        if (out.left?.id) out.left = { ...out.left, key: parseKey(out.left.id, out.left.pose) };
        if (out.right?.id) out.right = { ...out.right, key: parseKey(out.right.id, out.right.pose) };
        if (out.bg) out.bgKey = out.bg;
        if (out.overlay) out.overlayKey = out.overlay;
        return out;
      };

      const target = norm(scene);
      const sig = this.sceneSignature(target);

      if (sig === this.activeSceneSig) return;
      this.activeSceneSig = sig;

      // Preload required images
      const jobs = [];
      if (target?.bgKey) jobs.push(this.loadImage(target.bgKey));
      if (target?.overlayKey) jobs.push(this.loadImage(target.overlayKey));
      if (target?.left?.key) jobs.push(this.loadImage(target.left.key));
      if (target?.right?.key) jobs.push(this.loadImage(target.right.key));
      await Promise.all(jobs);

      // Transition
      if (this.fadeMs <= 0 || !this.toScene) {
        this.fromScene = null;
        this.toScene = target;
        this.drawImmediate();
        return;
      }

      this.fromScene = this.toScene;
      this.toScene = target;

      this.startFade();
    }

    startFade() {
      if (this.animId) cancelAnimationFrame(this.animId);
      const t0 = now();
      const dur = this.fadeMs;

      const step = () => {
        const t = clamp((now() - t0) / dur, 0, 1);
        this.drawBlend(t);
        if (t < 1) this.animId = requestAnimationFrame(step);
        else this.animId = null;
      };

      this.animId = requestAnimationFrame(step);
    }

    clear() {
      this.ctx.clearRect(0, 0, this.w, this.h);
    }

    drawImmediate() {
      this.clear();
      if (this.toScene) this.drawScene(this.toScene, 1);
    }

    drawBlend(t) {
      this.clear();
      // Smoothstep for nicer fade
      const s = t * t * (3 - 2 * t);
      if (this.fromScene) this.drawScene(this.fromScene, 1 - s);
      if (this.toScene) this.drawScene(this.toScene, s);
    }

    drawScene(scene, alpha = 1) {
      if (!scene) return;

      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);

      // Background
      const bgImg = scene.bgKey ? this.imageCache.get(scene.bgKey) : null;
      if (bgImg) {
        const cover = fitCover(bgImg.naturalWidth, bgImg.naturalHeight, this.w, this.h);
        ctx.drawImage(bgImg, cover.x, cover.y, cover.w, cover.h);
      } else {
        // fallback subtle dark fill
        ctx.fillStyle = "rgba(10,12,16,1)";
        ctx.fillRect(0, 0, this.w, this.h);
      }

      // Optional soft vignette without asset
      if (scene.vignette) {
        const r = Math.max(this.w, this.h) * 0.75;
        const g = ctx.createRadialGradient(this.w / 2, this.h / 2, r * 0.2, this.w / 2, this.h / 2, r);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
      }

      // Characters
      this.drawChar(scene.left, "left");
      this.drawChar(scene.right, "right");

      // Overlay image (fx)
      const fxImg = scene.overlayKey ? this.imageCache.get(scene.overlayKey) : null;
      if (fxImg) {
        const coverFx = fitCover(fxImg.naturalWidth, fxImg.naturalHeight, this.w, this.h);
        ctx.drawImage(fxImg, coverFx.x, coverFx.y, coverFx.w, coverFx.h);
      }

      ctx.restore();
    }

    drawChar(charSpec, side) {
      if (!charSpec || !charSpec.key) return;
      const img = this.imageCache.get(charSpec.key);
      if (!img) return;

      const ctx = this.ctx;

      const xN = Number.isFinite(charSpec.x) ? charSpec.x : (side === "left" ? 0.24 : 0.76);
      const yN = Number.isFinite(charSpec.y) ? charSpec.y : 1.0; // anchor bottom
      const scale = Number.isFinite(charSpec.scale) ? charSpec.scale : 1.0;
      const a = Number.isFinite(charSpec.alpha) ? clamp(charSpec.alpha, 0, 1) : 1.0;

      // Base “character height” relative to screen; tweak to taste
      const targetH = this.h * 0.92 * scale;
      const s = targetH / img.naturalHeight;
      const drawW = img.naturalWidth * s;
      const drawH = img.naturalHeight * s;

      const x = (this.w * xN) - drawW / 2;
      const y = (this.h * yN) - drawH;

      ctx.save();
      ctx.globalAlpha *= a;

      // tiny soft shadow for “photo cutout” feel
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = Math.max(6, this.w * 0.006);
      ctx.shadowOffsetY = Math.max(2, this.h * 0.004);

      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
    }
  }

  // Expose globally
  window.SceneCanvas = window.SceneCanvas || new SceneCanvas();
})();

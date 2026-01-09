/* /public/js/addons/scene-canvas.js
   Amorvia Scene Canvas (backgrounds + characters)
   - Manifest-based asset lookup: /art/_manifest.json
   - Draws full-viewport background (cover-fit) + optional left/right characters + optional overlay
   - Safe against missing/corrupt images (0-byte / 1-byte / decode errors)
*/
(() => {
  const CANVAS_ID = "sceneCanvas";
  const MANIFEST_URL = "/art/_manifest.json";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();

  function fitCover(srcW, srcH, dstW, dstH) {
    if (!srcW || !srcH) return null;
    const s = Math.max(dstW / srcW, dstH / srcH);
    const w = srcW * s;
    const h = srcH * s;
    return { w, h, x: (dstW - w) / 2, y: (dstH - h) / 2 };
  }

  function parseKey(id, pose) {
    if (!id) return null;
    if (pose && !id.includes("-" + pose)) return `${id}-${pose}`;
    return id;
  }

  class SceneCanvas {
    constructor() {
      this.canvas = document.getElementById(CANVAS_ID);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true });
      this.dpr = Math.max(1, window.devicePixelRatio || 1);
      this.w = 0;
      this.h = 0;

      this.manifest = null;
      this.cache = new Map();      // key -> Image
      this.pending = new Map();    // key -> Promise<Image|null>

      this.activeSig = "";
      this.fromScene = null;
      this.toScene = null;
      this.fadeMs = 220;
      this.animId = null;

      this._onResize = () => this.resize(true);
      window.addEventListener("resize", this._onResize, { passive: true });

      this.resize(true);
    }
   updateAutoContrastClass() {
  try {
    const ctx = this.ctx;
    if (!ctx || this.w < 10 || this.h < 10) return;

    // Uzmi mali uzorak iz sredine ekrana (gdje je najbitnije za čitljivost)
    const sw = 64, sh = 36;
    const sx = Math.floor(this.w * 0.5 - sw/2);
    const sy = Math.floor(this.h * 0.45 - sh/2);

    const img = ctx.getImageData(sx, sy, sw, sh).data;

    let sum = 0;
    for (let i = 0; i < img.length; i += 4) {
      // luminance approx
      const r = img[i], g = img[i+1], b = img[i+2];
      sum += (0.2126*r + 0.7152*g + 0.0722*b);
    }
    const avg = sum / (img.length / 4); // 0..255

    const body = document.body;
    body.classList.toggle("bg-bright", avg > 110);
    body.classList.toggle("bg-dark", avg <= 110);
  } catch (e) {}
}

    async init() {
      if (this.manifest) return;
      try {
        const res = await fetch(MANIFEST_URL, { cache: "no-store", headers: { "Cache-Control": "no-store" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.manifest = await res.json();
      } catch (e) {
        console.warn("[SceneCanvas] Manifest load failed:", e);
        this.manifest = {};
      }
    }

    resize(redraw = false) {
      const cssW = Math.max(1, Math.floor(window.innerWidth));
      const cssH = Math.max(1, Math.floor(window.innerHeight));
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const pxW = Math.floor(cssW * dpr);
      const pxH = Math.floor(cssH * dpr);

      if (this.canvas.width !== pxW) this.canvas.width = pxW;
      if (this.canvas.height !== pxH) this.canvas.height = pxH;

      this.w = pxW; this.h = pxH; this.dpr = dpr;

      if (redraw) this.drawImmediate();
    }

    resolveAsset(key) {
      if (!key) return null;
      if (this.manifest && this.manifest[key]) return this.manifest[key];
      if (typeof key === "string" && (key.startsWith("/") || key.startsWith("http"))) return key;
      return null;
    }

    loadImage(key) {
      const url = this.resolveAsset(key);
      if (!url) return Promise.resolve(null);

      if (this.cache.has(key)) return Promise.resolve(this.cache.get(key));
      if (this.pending.has(key)) return this.pending.get(key);

      const p = new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "eager";
        img.onload = () => {
          // Guard: some "broken" images can report 0x0
          if (!img.naturalWidth || !img.naturalHeight) {
            console.warn("[SceneCanvas] Image decoded but has 0 size:", key, url);
            this.pending.delete(key);
            resolve(null);
            return;
          }
          this.cache.set(key, img);
          this.pending.delete(key);
          resolve(img);
        };
        img.onerror = () => {
          console.warn("[SceneCanvas] Image failed:", key, url);
          this.pending.delete(key);
          resolve(null);
        };
        // Bust SW caches for assets during development
        img.src = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
      });

      this.pending.set(key, p);
      return p;
    }

    signature(scene) {
      if (!scene) return "";
      const L = scene.left ? `${scene.left.id||""}:${scene.left.pose||""}:${scene.left.x??""}:${scene.left.y??""}:${scene.left.scale??""}:${scene.left.alpha??""}` : "";
      const R = scene.right ? `${scene.right.id||""}:${scene.right.pose||""}:${scene.right.x??""}:${scene.right.y??""}:${scene.right.scale??""}:${scene.right.alpha??""}` : "";
      return [scene.bg||"", scene.overlay||"", scene.vignette ? "v1":"v0", L, R].join("|");
    }

    async apply(scene, opts = {}) {
      await this.init();
      if (!this.canvas) return;

      const fadeMs = Number.isFinite(opts.fadeMs) ? opts.fadeMs : this.fadeMs;
      this.fadeMs = clamp(fadeMs, 0, 2000);

      // Normalize
      const target = scene ? { ...scene } : null;
      if (target?.left?.id) target.left = { ...target.left, key: parseKey(target.left.id, target.left.pose) };
      if (target?.right?.id) target.right = { ...target.right, key: parseKey(target.right.id, target.right.pose) };
      if (target?.bg) target.bgKey = target.bg;
      if (target?.overlay) target.overlayKey = target.overlay;

      const sig = this.signature(target);
      if (sig === this.activeSig) return;
      this.activeSig = sig;

      // Preload
      const jobs = [];
      if (target?.bgKey) jobs.push(this.loadImage(target.bgKey));
      if (target?.overlayKey) jobs.push(this.loadImage(target.overlayKey));
      if (target?.left?.key) jobs.push(this.loadImage(target.left.key));
      if (target?.right?.key) jobs.push(this.loadImage(target.right.key));
      await Promise.all(jobs);

      // Transition
      if (!this.toScene || this.fadeMs <= 0) {
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
        const s = t * t * (3 - 2 * t);
        this.drawBlend(s);
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
      else {
        // subtle fallback
        this.ctx.fillStyle = "rgba(10,12,16,1)";
        this.ctx.fillRect(0,0,this.w,this.h);
      }
   // 👉 AUTO-CONTRAST (nakon što je scena nacrtana)
  this.updateAutoContrastClass();
}
    }

    drawBlend(t) {
      this.clear();
      if (this.fromScene) this.drawScene(this.fromScene, 1 - t);
      if (this.toScene) this.drawScene(this.toScene, t);
    }

    drawScene(scene, alpha) {
      if (!scene) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);

      // BG
      const bgImg = scene.bgKey ? this.cache.get(scene.bgKey) : null;
      if (bgImg) {
        const cover = fitCover(bgImg.naturalWidth, bgImg.naturalHeight, this.w, this.h);
        if (cover) ctx.drawImage(bgImg, cover.x, cover.y, cover.w, cover.h);
      } else {
        ctx.fillStyle = "rgba(10,12,16,1)";
        ctx.fillRect(0,0,this.w,this.h);
      }

      // Vignette (procedural)
      if (scene.vignette) {
        const r = Math.max(this.w, this.h) * 0.8;
        const g = ctx.createRadialGradient(this.w/2, this.h/2, r*0.25, this.w/2, this.h/2, r);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = g;
        ctx.fillRect(0,0,this.w,this.h);
      }

      // Characters
      this.drawChar(scene.left, "left");
      this.drawChar(scene.right, "right");

      // Overlay
      const fx = scene.overlayKey ? this.cache.get(scene.overlayKey) : null;
      if (fx) {
        const coverFx = fitCover(fx.naturalWidth, fx.naturalHeight, this.w, this.h);
        if (coverFx) ctx.drawImage(fx, coverFx.x, coverFx.y, coverFx.w, coverFx.h);
      }

      ctx.restore();
    }

    drawChar(spec, side) {
      if (!spec || !spec.key) return;
      const img = this.cache.get(spec.key);
      if (!img) return;

      const ctx = this.ctx;
      const xN = Number.isFinite(spec.x) ? spec.x : (side === "left" ? 0.24 : 0.76);
      const yN = Number.isFinite(spec.y) ? spec.y : 1.0;
      const scale = Number.isFinite(spec.scale) ? spec.scale : 1.0;
      const a = Number.isFinite(spec.alpha) ? clamp(spec.alpha, 0, 1) : 1.0;

      const targetH = this.h * 0.92 * scale;
      const s = targetH / img.naturalHeight;
      const drawW = img.naturalWidth * s;
      const drawH = img.naturalHeight * s;

      const x = (this.w * xN) - drawW / 2;
      const y = (this.h * yN) - drawH;

      ctx.save();
      ctx.globalAlpha *= a;
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = Math.max(6, this.w * 0.006);
      ctx.shadowOffsetY = Math.max(2, this.h * 0.004);
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
    }
  }

  window.SceneCanvas = window.SceneCanvas || new SceneCanvas();
})();

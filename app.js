/* Sebastián Montalvo — efecto de cromo, menú, correo, cifras y la frase de "sobre mí" */
const $ = s => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Nav ---------- */
const nav = $(".nav"), menuBtn = $("#menuBtn");
const solid = () => nav.classList.toggle("solid", scrollY > 10);
addEventListener("scroll", solid, { passive: true }); solid();
function closeMenu() { nav.classList.remove("menu-open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.querySelector(".sr").textContent = "Abrir menú"; }
menuBtn.addEventListener("click", () => {
  const open = !nav.classList.contains("menu-open");
  nav.classList.toggle("menu-open", open);
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.querySelector(".sr").textContent = open ? "Cerrar menú" : "Abrir menú";
});
document.querySelectorAll("#menu a").forEach(a => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

/* ---------- Efecto del hero: cromo líquido (blobs que se mezclan; el CSS los difumina) ---------- */
const cv = $("#fx"), ctx = cv.getContext("2d");
const blobs = [
  { x: .78, y: .32, r: .34, c: [224, 72, 90], a: .55, sx: .00011, sy: .00008, p: 0 },
  { x: .62, y: .70, r: .30, c: [200, 205, 214], a: .22, sx: .00009, sy: .00012, p: 1.7 },
  { x: .92, y: .62, r: .26, c: [120, 28, 44], a: .65, sx: .00013, sy: .0001, p: 3.1 },
  { x: .40, y: .20, r: .22, c: [150, 156, 168], a: .14, sx: .00007, sy: .00011, p: 4.4 },
];
let W = 0, H = 0, running = !reduce, raf = 0, t0 = performance.now(), tAcc = 0;
function size() {
  const s = .35; // resolución baja: el blur del CSS hace el resto y cuesta poco
  W = cv.width = Math.max(1, Math.round(cv.clientWidth * s));
  H = cv.height = Math.max(1, Math.round(cv.clientHeight * s));
}
function draw(t) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  const m = Math.max(W, H);
  for (const b of blobs) {
    const x = (b.x + Math.sin(t * b.sx + b.p) * .08) * W;
    const y = (b.y + Math.cos(t * b.sy + b.p) * .1) * H;
    const r = b.r * m * (1 + Math.sin(t * .0003 + b.p) * .08);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${b.c},${b.a})`);
    g.addColorStop(1, `rgba(${b.c},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = "source-over";
}
function loop(now) { tAcc += now - t0; t0 = now; draw(tAcc); raf = running ? requestAnimationFrame(loop) : 0; }
size(); draw(0);
addEventListener("resize", () => { size(); draw(tAcc); });
const pauseBtn = $("#fxPause");
function setRunning(on) {
  running = on;
  document.body.classList.toggle("paused", !on);
  pauseBtn.setAttribute("aria-pressed", on ? "false" : "true");
  pauseBtn.textContent = on ? "Pausar animaciones" : "Reanudar animaciones";
  if (on && !raf) { t0 = performance.now(); raf = requestAnimationFrame(loop); }
}
pauseBtn.addEventListener("click", () => setRunning(!running));
// solo anima mientras el hero se ve y la pestaña está visible
if (!reduce) {
  let visible = true, userPaused = false;
  pauseBtn.addEventListener("click", () => { userPaused = !running; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!userPaused) { running = visible; if (running && !raf) { t0 = performance.now(); raf = requestAnimationFrame(loop); } } }).observe($(".hero"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) running = false; else if (visible && !userPaused) { running = true; if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(loop); } } });
  setRunning(true);
}

/* ---------- Copiar correo ---------- */
const toastEl = $("#toast"); let tt;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("show"), 2200); }
$("#copyMail").addEventListener("click", async () => {
  const mail = $("#mailTxt").textContent.trim();
  try { await navigator.clipboard.writeText(mail); toast("Correo copiado"); }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents($("#mailTxt"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    toast("Selecciona y copia: " + mail);
  }
});

/* ---------- Cifras: conteo una vez al llegar ---------- */
const counts = [...document.querySelectorAll("[data-count]")];
if (!reduce && "IntersectionObserver" in window) {
  const fmt = (n, sep) => sep ? n.toLocaleString("es-EC").replace(/,/g, ".") : String(n);
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io2.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, sep = el.hasAttribute("data-sep"), t0 = performance.now(), dur = 1200;
    const step = now => { const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(end * k), sep); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  counts.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) io2.observe(el); });
}

/* ---------- Sobre mí: las palabras se encienden con el avance ---------- */
const say = $("#say");
if (say && !reduce) {
  say.innerHTML = say.textContent.split(" ").map(w => `<span class="w">${w}</span>`).join(" ");
  const ws = [...say.querySelectorAll(".w")]; say.classList.add("armed");
  let tk = false;
  const paint = () => { tk = false; const r = say.getBoundingClientRect(), vh = innerHeight; const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .3))); const n = Math.round(p * ws.length); ws.forEach((w, i) => w.classList.toggle("on", i < n)); };
  addEventListener("scroll", () => { if (!tk) { tk = true; requestAnimationFrame(paint); } }, { passive: true }); paint();
}


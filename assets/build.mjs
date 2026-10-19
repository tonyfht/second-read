// Generates the README images (logo and loop diagram, light and dark, EN/ES).
//   node assets/build.mjs
// Plain SVG, system fonts, no dependencies. Edit the tokens or copy below.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const THEMES = {
  light: {
    paper: "#FBF8F3", sheet: "#FFFFFF", sheetBack: "#F1ECE4", ink: "#1F1D1A", muted: "#6B6560",
    rule: "#E2DBD0", line: "#D9D1C4", red: "#C43D2B", green: "#2E7A4C", card: "#FFFFFF", cardEdge: "#E2DBD0",
  },
  dark: {
    paper: "#191816", sheet: "#26241F", sheetBack: "#201E1B", ink: "#F3EFE8", muted: "#A79F95",
    rule: "#3A3631", line: "#4A453E", red: "#F0745F", green: "#6CC08B", card: "#22201C", cardEdge: "#3A3631",
  },
};

const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Two stacked sheets: the first read behind, the second read in front, with
// an editor's strike, a caret and a check.
function mark(t, x, y, s = 1) {
  return `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="18" y="6" width="150" height="196" rx="10" fill="${t.sheetBack}" stroke="${t.rule}" stroke-width="2" transform="rotate(-7 93 104)"/>
    <rect x="0" y="0" width="150" height="196" rx="10" fill="${t.sheet}" stroke="${t.rule}" stroke-width="2"/>
    <rect x="22" y="30" width="96" height="9" rx="4.5" fill="${t.ink}" opacity="0.85"/>
    <rect x="22" y="58" width="106" height="7" rx="3.5" fill="${t.line}"/>
    <rect x="22" y="78" width="88" height="7" rx="3.5" fill="${t.line}"/>
    <path d="M18 82 L114 82" stroke="${t.red}" stroke-width="4" stroke-linecap="round"/>
    <rect x="22" y="98" width="100" height="7" rx="3.5" fill="${t.line}"/>
    <path d="M52 124 l9 -12 l9 12" fill="none" stroke="${t.red}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="22" y="128" width="64" height="7" rx="3.5" fill="${t.line}"/>
    <rect x="22" y="148" width="92" height="7" rx="3.5" fill="${t.line}"/>
    <circle cx="140" cy="186" r="30" fill="${t.green}"/>
    <path d="M127 186 l9 9 l17 -19" fill="none" stroke="${t.paper}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

const LOGO_COPY = {
  en: { eyebrow: "AN AGENT SKILL FOR CLAUDE", tagline: "An editor's second read before you publish." },
  es: { eyebrow: "UNA AGENT SKILL PARA CLAUDE", tagline: "La segunda lectura de un editor antes de publicar." },
};

function logo(t, c = LOGO_COPY.en) {
  const W = 1200, H = 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Second Read</title>
  <desc id="desc">${esc(c.tagline)}</desc>
  <rect width="${W}" height="${H}" rx="28" fill="${t.paper}"/>
  ${mark(t, 96, 70)}
  <text x="330" y="118" font-family="${SANS}" font-size="19" font-weight="600" letter-spacing="4" fill="${t.red}">${esc(c.eyebrow)}</text>
  <text x="326" y="214" font-family="${SERIF}" font-size="104" fill="${t.ink}" textLength="352" lengthAdjust="spacing">Second</text>
  <text x="706" y="214" font-family="${SERIF}" font-size="104" font-style="italic" fill="${t.ink}" textLength="228" lengthAdjust="spacing">Read</text>
  <path d="M708 236 q 14 -10 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0" fill="none" stroke="${t.red}" stroke-width="4" stroke-linecap="round"/>
  <text x="330" y="292" font-family="${SANS}" font-size="27" fill="${t.muted}">${esc(c.tagline)}</text>
</svg>
`;
}

const COPY = {
  en: {
    title: "How Second Read works",
    desc: "Write, judge with closed questions, let code decide, rewrite at most twice, deliver the best version with a report.",
    steps: [
      ["1", "Write", "Claude drafts it,", "or you paste yours"],
      ["2", "Judge", "Closed questions,", "answered as JSON"],
      ["3", "Decide", "Code and thresholds,", "not the judge's mood"],
      ["4", "Deliver", "Best version", "+ short report"],
    ],
    loop: "rewrite with the judge's fixes · max 2",
    accept: "accept",
    stop: "or stop",
    note: "A fresh judge every round · the text is data, never instructions",
  },
  es: {
    title: "Cómo funciona Second Read",
    desc: "Escribir, juzgar con preguntas cerradas, que decida el código, reescribir como mucho dos veces y entregar la mejor versión con un informe.",
    steps: [
      ["1", "Escribir", "Claude lo redacta", "o pegas el tuyo"],
      ["2", "Juzgar", "Preguntas cerradas,", "respondidas en JSON"],
      ["3", "Decidir", "Código y umbrales,", "no el humor del juez"],
      ["4", "Entregar", "Mejor versión", "+ informe breve"],
    ],
    loop: "reescribir con las correcciones del juez · máx. 2",
    accept: "aceptar",
    stop: "o parar",
    note: "Un juez nuevo en cada ronda · el texto es dato, nunca instrucciones",
  },
};

function diagram(t, c) {
  const W = 1200, H = 400;
  const cardW = 222, cardH = 150, gap = 76, x0 = 42, y0 = 70;
  const xs = c.steps.map((_, i) => x0 + i * (cardW + gap));
  const cards = c.steps.map(([n, name, l1, l2], i) => {
    const x = xs[i];
    const last = i === 3;
    const accent = last ? t.green : i === 1 ? t.red : t.ink;
    return `
  <g>
    <rect x="${x}" y="${y0}" width="${cardW}" height="${cardH}" rx="18" fill="${t.card}" stroke="${last ? t.green : t.cardEdge}" stroke-width="${last ? 3 : 2}"/>
    <circle cx="${x + 36}" cy="${y0 + 38}" r="17" fill="${accent}"/>
    <text x="${x + 36}" y="${y0 + 44}" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="700" fill="${t.paper}">${n}</text>
    <text x="${x + 64}" y="${y0 + 47}" font-family="${SERIF}" font-size="30" fill="${t.ink}">${esc(name)}</text>
    <text x="${x + 24}" y="${y0 + 95}" font-family="${SANS}" font-size="19" fill="${t.muted}">${esc(l1)}</text>
    <text x="${x + 24}" y="${y0 + 120}" font-family="${SANS}" font-size="19" fill="${t.muted}">${esc(l2)}</text>
  </g>`;
  }).join("");
  const arrow = (x1, x2, y, color, label) => `
  <path d="M${x1 + 8} ${y} H${x2 - 12}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <path d="M${x2 - 18} ${y - 7} L${x2 - 8} ${y} L${x2 - 18} ${y + 7}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${label ? `<text x="${(x1 + x2) / 2}" y="${y - 12}" text-anchor="middle" font-family="${SANS}" font-size="16" font-weight="600" fill="${color}">${esc(label)}</text>` : ""}`;
  const mid = y0 + cardH / 2;
  const arrows = [
    arrow(xs[0] + cardW, xs[1], mid, t.muted),
    arrow(xs[1] + cardW, xs[2], mid, t.muted),
    arrow(xs[2] + cardW, xs[3], mid - 10, t.green, c.accept),
    `<text x="${(xs[2] + cardW + xs[3]) / 2}" y="${mid + 22}" text-anchor="middle" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(c.stop)}</text>`,
  ].join("");
  const loopY = y0 + cardH + 70;
  const fromX = xs[2] + cardW / 2, toX = xs[0] + cardW / 2;
  const loop = `
  <path d="M${fromX} ${y0 + cardH + 6} V${loopY - 18} q0 18 -18 18 H${toX + 18} q-18 0 -18 -18 V${y0 + cardH + 16}" fill="none" stroke="${t.red}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
  <path d="M${toX - 7} ${y0 + cardH + 20} L${toX} ${y0 + cardH + 9} L${toX + 7} ${y0 + cardH + 20}" fill="none" stroke="${t.red}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${(fromX + toX) / 2 - 230}" y="${loopY - 19}" width="460" height="38" rx="19" fill="${t.paper}" stroke="${t.red}" stroke-width="2"/>
  <text x="${(fromX + toX) / 2}" y="${loopY + 6}" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="600" fill="${t.red}">${esc(c.loop)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(c.title)}</title>
  <desc id="desc">${esc(c.desc)}</desc>
  <rect width="${W}" height="${H}" rx="28" fill="${t.paper}"/>
  <text x="${W / 2}" y="44" text-anchor="middle" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${t.muted}">EVALUATOR-OPTIMIZER</text>
  ${cards}
  ${arrows}
  ${loop}
  <text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-family="${SANS}" font-size="17" fill="${t.muted}">${esc(c.note)}</text>
</svg>
`;
}

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(here, `logo-${name}.svg`), logo(t, LOGO_COPY.en));
  writeFileSync(join(here, `logo-es-${name}.svg`), logo(t, LOGO_COPY.es));
  for (const [lang, c] of Object.entries(COPY)) {
    writeFileSync(join(here, `loop-${lang}-${name}.svg`), diagram(t, c));
  }
}
console.log("assets written");

/**
 * Raster icons, rendered from the one SVG that defines the mark.
 *
 * `app/icon.svg` is the source. Everything else here is generated from it, so
 * the simplified mark cannot drift from its fallbacks — the failure this
 * avoids is a browser that will not take an SVG favicon quietly falling back
 * to a completely different, far more detailed image.
 *
 * Rendered through headless Chrome rather than ImageMagick, whose built-in SVG
 * renderer is approximate about strokes and corner radii and is exactly the
 * wrong tool for something judged at sixteen pixels.
 *
 * Needs Chrome listening on the debugging port. Run with `bun run icons`.
 *
 * Uses node:fs rather than Bun's own file helpers so the Next build, which
 * typechecks this directory, does not need Bun's globals declared for a script
 * it never runs.
 */
import { readFileSync, writeFileSync } from "node:fs";
const PORT = 9333;
const ROOT = new URL("..", import.meta.url).pathname;

const source = readFileSync(`${ROOT}app/icon.svg`, "utf8");

const targets = [
  {
    /* The fallback favicon. 48 rather than 16, so a browser choosing this over
       the SVG still has pixels to downscale from. */
    file: "app/icon.png",
    size: 48,
    svg: source,
    transparent: true,
  },
  {
    /* iOS applies its own rounded mask, so this one is full-bleed and square:
       a radius of our own would show as rounded corners inside theirs. Opaque,
       because iOS composites transparency onto black and would put hard black
       inside its mask. */
    file: "app/apple-icon.png",
    size: 180,
    svg: source.replace('rx="7.5"', 'rx="0"'),
    transparent: false,
  },
];

const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const page = list.find((t: { type: string }) => t.type === "page");
if (!page) throw new Error("No Chrome page on the debugging port.");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map<number, (v: unknown) => void>();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data as string);
  if (m.id && pending.has(m.id)) pending.get(m.id)!(m.result);
};
const send = (method: string, params: unknown = {}) =>
  new Promise<{ data: string }>((res) => {
    const n = ++id;
    pending.set(n, res as (v: unknown) => void);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");

for (const target of targets) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: target.size,
    height: target.size,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: target.transparent ? 0 : 1 },
  });

  const html = `<body style="margin:0"><div style="width:${target.size}px;height:${target.size}px">${target.svg}</div></body>`;
  await send("Page.navigate", {
    url: "data:text/html;charset=utf-8," + encodeURIComponent(html),
  });
  await wait(500);

  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(`${ROOT}${target.file}`, Buffer.from(data, "base64"));
  console.log(`  ${target.file} ${target.size}×${target.size}`);
}

ws.close();

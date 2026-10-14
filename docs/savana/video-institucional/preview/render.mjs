// Renderiza quadros do motor de preview (scene.html) com o Chromium pré-instalado.
// Uso: node render.mjs <pastaSaida> <inicioSeg> <fimSeg> [fps] [--still t1,t2,...] [--guides]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const [outDir, startArg = "0", endArg = "10", fpsArg = "30", ...rest] = process.argv.slice(2);
if (!outDir) throw new Error("informe a pasta de saída");
const stillsIdx = rest.indexOf("--still");
const stills = stillsIdx >= 0 ? rest[stillsIdx + 1].split(",").map(Number) : null;
const guides = rest.includes("--guides");
const material = rest.includes("--material");

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "scene.html")).href);
await page.evaluate(() => window.ready);
const canvas = page.locator("#c");

const shoot = async (t, file, opts) => {
  await page.evaluate(([tt, o]) => window.drawFrame(tt, o), [t, opts]);
  await canvas.screenshot({ path: file });
};

if (stills) {
  for (const t of stills) {
    const opts = { guides, materialSample: material ? t : 0 };
    await shoot(t, path.join(outDir, `still_${t.toFixed(2)}s.png`), opts);
  }
} else {
  const fps = Number(fpsArg);
  const first = Math.round(Number(startArg) * fps);
  const last = Math.round(Number(endArg) * fps);
  for (let f = first; f < last; f++) {
    await shoot(f / fps, path.join(outDir, `f_${String(f - first).padStart(4, "0")}.png`), {});
  }
}
await browser.close();

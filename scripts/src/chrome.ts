import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
];

function onPath(command: string): string | null {
  try {
    return execFileSync("which", [command], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

export function findChrome(): string {
  for (const candidate of [process.env.CHROME, ...CANDIDATES]) {
    if (!candidate) continue;

    const path = candidate.startsWith("/")
      ? existsSync(candidate)
        ? candidate
        : null
      : onPath(candidate);
    if (path) return path;
  }

  throw new Error("Chrome or Chromium not found. Set CHROME to its binary.");
}

function run(chrome: string, args: string[]): void {
  execFileSync(
    chrome,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", ...args],
    { stdio: "ignore" },
  );
}

export function printToPdf(chrome: string, page: string, out: string): void {
  run(chrome, ["--no-pdf-header-footer", `--print-to-pdf=${out}`, pathToFileURL(page).href]);
}

export function screenshot(chrome: string, page: string, out: string): void {
  run(chrome, [
    "--window-size=794,1123",
    "--force-device-scale-factor=2",
    `--screenshot=${out}`,
    pathToFileURL(page).href,
  ]);
}

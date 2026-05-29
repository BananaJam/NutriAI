import { spawn } from "node:child_process";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright-core";

const defaultPort = process.env.SHOWCASE_PORT || "3001";
const baseUrl =
  process.env.SHOWCASE_BASE_URL || `http://localhost:${defaultPort}`;
const outputDir = process.env.SHOWCASE_OUTPUT_DIR
  ? join(process.cwd(), process.env.SHOWCASE_OUTPUT_DIR)
  : join(process.cwd(), "report", "assets", "videos");
const webmOutputFile = join(outputDir, "nutriai-showcase.webm");
const mp4OutputFile = join(outputDir, "nutriai-showcase.mp4");
const temporaryVideoDir = join(outputDir, ".tmp");
const chromePath =
  process.env.SHOWCASE_CHROME_PATH ||
  process.env.REPORT_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appPort = String(new URL(baseUrl).port || "3000");

const demoCredentials = {
  email: "demo.report@example.com",
  password: "ReportDemo123!",
};

type CursorPoint = {
  x: number;
  y: number;
};

let cursorPosition: CursorPoint = {
  x: 120,
  y: 120,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnCommand(
  command: string,
  args: string[],
  env?: Record<string, string | undefined>,
) {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const processHandle = spawnCommand(command, args);

    processHandle.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} exited with code ${code}`),
      );
    });
  });
}

async function waitForHealth(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(1_000);
  }

  throw new Error("Timed out while waiting for the local app server.");
}

async function prepareDemoData() {
  console.log("[showcase] Seeding demo data...");
  await new Promise<void>((resolve, reject) => {
    const processHandle = spawnCommand("bun", ["run", "report:seed"], {
      ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
    });

    processHandle.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`report:seed exited with code ${code}`));
    });
  });
}

async function startServerIfNeeded() {
  try {
    await waitForHealth(3_000);
    console.log("[showcase] Reusing existing local app server.");
    return null;
  } catch {
    console.log("[showcase] Starting local dev server...");
    const server = spawnCommand("bun", ["run", "dev"], {
      ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
      PORT: appPort,
    });
    await waitForHealth();
    console.log("[showcase] Local dev server is ready.");
    return server;
  }
}

async function prewarmRoutes() {
  const routes = [
    "/",
    "/log",
    "/plans",
    "/progress",
    "/foods",
    "/goals",
    "/assistant",
    "/assistant/lab",
  ];

  console.log("[showcase] Prewarming app routes...");
  await Promise.all(
    routes.map(async (route) => {
      await fetch(`${baseUrl}${route}`).catch(() => {
        // Auth-aware client routes still compile even when the fetch redirects.
      });
    }),
  );
}

async function signInWithUi(page: Page) {
  await page.goto(`${baseUrl}/sign-in`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {
    // Hydration is the important part here; dev mode can keep requests open.
  });
  await delay(1_000);
  await page.locator("#email").fill(demoCredentials.email);
  await page.locator("#password").fill(demoCredentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), {
    timeout: 20_000,
  });
}

async function signIn(page: Page) {
  console.log("[showcase] Signing in with demo account...");
  await signInWithUi(page);
  await page
    .getByRole("heading", { name: "Dashboard" })
    .waitFor({ timeout: 30_000 });
  await delay(1_500);
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {
    // Dev mode can keep background requests open.
  });

  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('[data-slot="skeleton"], .animate-pulse')
          .length === 0,
      { timeout: 20_000 },
    )
    .catch(() => {
      // Route-specific waits still guard the visible showcase state.
    });

  await delay(900);
}

async function prepareCurrentPage(page: Page, visibleText: string) {
  await installCursor(page);
  await page.waitForSelector(`text=${visibleText}`, { timeout: 20_000 });
  await waitForPageReady(page);
  await moveCursor(page, { x: 180, y: 170 }, 550);
}

async function navigateByLink(
  page: Page,
  linkName: string | RegExp,
  visibleText: string,
) {
  const link = page.getByRole("link", { name: linkName }).first();
  await moveToLocator(page, link);
  await clickCursor(page);
  await link.click();
  await prepareCurrentPage(page, visibleText);
}

async function installCursor(page: Page) {
  await page.evaluate(({ x, y }) => {
    if (document.querySelector("[data-showcase-cursor]")) {
      const existingCursor = document.querySelector(
        "[data-showcase-cursor]",
      ) as HTMLElement;
      existingCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      return;
    }

    const style = document.createElement("style");
    style.dataset.showcaseCursorStyle = "true";
    style.textContent = `
      [data-showcase-cursor] {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483647;
        width: 28px;
        height: 28px;
        pointer-events: none;
        transform: translate3d(${x}px, ${y}px, 0);
        filter: drop-shadow(0 3px 7px rgba(15, 23, 42, 0.32));
      }

      [data-showcase-cursor-ring] {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 2147483646;
        width: 32px;
        height: 32px;
        margin-left: -11px;
        margin-top: -11px;
        border: 2px solid rgba(34, 197, 94, 0.75);
        border-radius: 999px;
        opacity: 0;
        pointer-events: none;
        transform: translate3d(${x}px, ${y}px, 0) scale(0.55);
      }

      [data-showcase-cursor-ring].is-clicking {
        animation: showcase-click 420ms ease-out;
      }

      @keyframes showcase-click {
        0% {
          opacity: 0.9;
          transform: var(--showcase-cursor-transform) scale(0.4);
        }
        100% {
          opacity: 0;
          transform: var(--showcase-cursor-transform) scale(1.4);
        }
      }
    `;

    const cursor = document.createElement("div");
    cursor.dataset.showcaseCursor = "true";
    cursor.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M5.3 3.2L22.2 15.6L14.6 16.8L18.8 24.1L15.1 26.1L10.9 18.8L5.3 24.1V3.2Z"
          fill="white"
          stroke="#111827"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    `;
    const ring = document.createElement("div");
    ring.dataset.showcaseCursorRing = "true";

    document.head.append(style);
    document.body.append(ring, cursor);
  }, cursorPosition);
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

async function setCursorPosition(page: Page, point: CursorPoint) {
  cursorPosition = point;
  await page.evaluate(({ x, y }) => {
    const transform = `translate3d(${x}px, ${y}px, 0)`;
    const cursor = document.querySelector(
      "[data-showcase-cursor]",
    ) as HTMLElement | null;
    const ring = document.querySelector(
      "[data-showcase-cursor-ring]",
    ) as HTMLElement | null;

    if (cursor) {
      cursor.style.transform = transform;
    }

    if (ring) {
      ring.style.transform = transform;
      ring.style.setProperty("--showcase-cursor-transform", transform);
    }
  }, point);
}

async function moveCursor(page: Page, target: CursorPoint, durationMs = 700) {
  await installCursor(page);

  const start = cursorPosition;
  const steps = Math.max(14, Math.round(durationMs / 16));

  for (let index = 1; index <= steps; index += 1) {
    const progress = easeInOutCubic(index / steps);
    const wobble = Math.sin(progress * Math.PI) * 5;
    const point = {
      x: start.x + (target.x - start.x) * progress + wobble,
      y: start.y + (target.y - start.y) * progress - wobble * 0.35,
    };

    await page.mouse.move(point.x, point.y);
    await setCursorPosition(page, point);
    await delay(durationMs / steps);
  }

  await page.mouse.move(target.x, target.y);
  await setCursorPosition(page, target);
}

async function clickCursor(page: Page) {
  await page.evaluate(() => {
    const ring = document.querySelector(
      "[data-showcase-cursor-ring]",
    ) as HTMLElement | null;
    if (!ring) return;
    ring.classList.remove("is-clicking");
    void ring.offsetWidth;
    ring.classList.add("is-clicking");
  });
  await delay(140);
}

async function moveToLocator(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) {
    return false;
  }

  await moveCursor(
    page,
    {
      x: box.x + box.width / 2,
      y: box.y + Math.min(box.height / 2, 22),
    },
    650,
  );

  return true;
}

async function panPage(page: Page) {
  await moveCursor(page, { x: 1180, y: 160 }, 850);
  await delay(500);
  await page.mouse.wheel(0, 520);
  await delay(900);
  await page.mouse.wheel(0, -520);
  await delay(700);
}

async function safeClick(page: Page, name: string | RegExp, pauseMs = 900) {
  const button = page.getByRole("button", { name }).first();
  if ((await button.count()) === 0) {
    return false;
  }

  if (!(await button.isEnabled().catch(() => false))) {
    return false;
  }

  await moveToLocator(page, button);
  await clickCursor(page);
  await button.click();
  await delay(pauseMs);
  return true;
}

async function clickLocator(page: Page, locator: Locator, pauseMs = 900) {
  if ((await locator.count()) === 0) {
    return false;
  }

  const target = locator.first();
  if (!(await target.isEnabled().catch(() => false))) {
    return false;
  }

  await moveToLocator(page, target);
  await clickCursor(page);
  await target.click();
  await delay(pauseMs);
  return true;
}

async function convertVideoToMp4(webmPath: string) {
  console.log("[showcase] Converting video to MP4...");
  await rm(mp4OutputFile, { force: true });
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    webmPath,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-preset",
    "medium",
    "-crf",
    "22",
    mp4OutputFile,
  ]);
}

async function fillInput(page: Page, locator: Locator, value: string) {
  await moveToLocator(page, locator);
  await clickCursor(page);
  await locator.click();
  const chunkDelay = Number(process.env.SHOWCASE_TYPING_DELAY_MS || "18");
  await locator.fill("");
  await locator.pressSequentially(value, { delay: chunkDelay });
  await delay(500);
}

async function fillNativeInput(page: Page, locator: Locator, value: string) {
  await moveToLocator(page, locator);
  await clickCursor(page);
  await locator.click();
  await locator.fill(value);
  await delay(500);
}

async function waitForVisibleTextOutsideOptions(page: Page, text: string) {
  await page.waitForFunction(
    (expectedText) =>
      Array.from(document.querySelectorAll("body *")).some((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        return (
          element.tagName !== "OPTION" &&
          element.offsetParent !== null &&
          element.textContent?.includes(expectedText) === true
        );
      }),
    text,
    { timeout: 10_000 },
  );
}

async function selectOption(page: Page, locator: Locator, value: string) {
  await moveToLocator(page, locator);
  await clickCursor(page);
  await locator.selectOption(value);
  await delay(350);
}

async function chooseFoodFromDialog(page: Page, foodName: string) {
  await fillInput(page, page.getByPlaceholder("Search foods..."), foodName);
  await safeClick(page, "Search", 1_000);
  await clickLocator(
    page,
    page.locator('[role="dialog"] button').filter({ hasText: foodName }),
    700,
  );
  await page.waitForSelector("text=Confirm Food Entry", { timeout: 10_000 });
}

async function demonstrateFoodLog(page: Page) {
  console.log("[showcase] Demonstrating food logging...");
  await navigateByLink(page, "Food Log", "Food Log");

  await safeClick(page, /^Add Food$/);
  await page.waitForSelector("text=Add Food to Log", { timeout: 10_000 });
  await chooseFoodFromDialog(page, "Greek Yogurt");

  await selectOption(
    page,
    page.locator('[role="dialog"] select').first(),
    "SNACK",
  );
  await fillInput(page, page.getByLabel(/Servings/), "1.5");
  await fillInput(page, page.getByLabel(/Notes/), "Demo post-workout snack");
  await safeClick(page, "Add to Log", 1_500);
  await page.waitForSelector("text=Greek Yogurt", { timeout: 10_000 });

  await panPage(page);
}

async function demonstrateMealPlan(page: Page) {
  console.log("[showcase] Demonstrating meal planning...");
  await navigateByLink(page, "Meal Plans", "Meal Plans");
  await safeClick(page, /^Shopping list$/, 900);
  await safeClick(page, "Copy list", 900);
  await safeClick(page, /^Planner$/, 900);
  await safeClick(
    page,
    /Apply (Monday|Tuesday|Wednesday|Thursday|Friday)/,
    1_500,
  );
  await panPage(page);
}

async function demonstrateFoodCatalog(page: Page) {
  console.log("[showcase] Demonstrating food catalog actions...");
  await navigateByLink(page, "Foods", "Food database");
  await fillInput(
    page,
    page.getByPlaceholder("Search by name or brand"),
    "chicken",
  );
  await safeClick(page, "Search", 1_200);
  await safeClick(page, "Compare", 900);
  await safeClick(page, "Add to log", 900);
  await page
    .waitForSelector("text=Add to food log", { timeout: 10_000 })
    .catch(() => {});
  await selectOption(
    page,
    page.locator('[role="dialog"] select').first(),
    "DINNER",
  );
  await fillInput(page, page.getByLabel(/Servings/), "0.8");
  await fillInput(page, page.getByLabel(/Notes/), "Demo lean protein dinner");
  await safeClick(page, "Add to log", 1_500);
  await page.waitForSelector("text=Comparison tray", { timeout: 10_000 });
}

async function demonstrateGoalCreation(page: Page) {
  console.log("[showcase] Demonstrating goal creation...");
  await navigateByLink(page, "Goals", "Goals");
  await safeClick(page, "New goal");
  await page.waitForSelector("text=Create Goal", { timeout: 10_000 });
  await selectOption(
    page,
    page.locator('[role="dialog"] select').first(),
    "WATER_INTAKE",
  );
  await fillInput(page, page.getByLabel(/Target Value/), "2.5");
  await fillNativeInput(page, page.getByLabel(/End Date/), "2026-06-30");
  await safeClick(page, "Create Goal", 1_500);
  await waitForVisibleTextOutsideOptions(page, "Water intake");
  await panPage(page);
}

async function demonstrateAssistant(page: Page) {
  console.log("[showcase] Demonstrating assistant chat...");
  await navigateByLink(page, "AI Assistant", "Nutrition Assistant");
  await fillInput(
    page,
    page.getByPlaceholder(
      "Ask about nutrition, log food, or build a meal plan...",
    ),
    "Summarize today's nutrition and suggest one improvement",
  );
  await clickLocator(
    page,
    page.locator('form button[type="submit"]').last(),
    1_200,
  );
  await page.waitForSelector("text=Summarize today's nutrition", {
    timeout: 10_000,
  });
  await delay(4_000);
}

async function demonstrateAssistantLab(page: Page) {
  console.log("[showcase] Demonstrating assistant lab comparison...");
  await navigateByLink(page, "Open SDK Lab", "Agent SDK Lab");
  await page.waitForSelector("text=Live benchmark summary", {
    timeout: 20_000,
  });
  await clickLocator(
    page,
    page.locator("button").filter({ hasText: "Weekly Nutrition Review" }),
    900,
  );
  await safeClick(page, "Refresh runs", 1_200);
  await panPage(page);
}

async function runShowcaseTour(page: Page) {
  console.log("[showcase] Recording dashboard...");
  await prepareCurrentPage(page, "Dashboard");
  await panPage(page);

  await demonstrateFoodLog(page);
  await demonstrateMealPlan(page);

  console.log("[showcase] Recording progress analytics...");
  await navigateByLink(page, "Progress", "Progress");
  await panPage(page);

  await demonstrateFoodCatalog(page);
  await demonstrateGoalCreation(page);
  await demonstrateAssistant(page);
  await demonstrateAssistantLab(page);
}

async function main() {
  if (process.env.SHOWCASE_SKIP_SEED === "true") {
    console.log("[showcase] Skipping demo data seed.");
  } else {
    await prepareDemoData();
  }

  const server = await startServerIfNeeded();
  await prewarmRoutes();
  console.log("[showcase] Launching headless browser...");

  await rm(temporaryVideoDir, { recursive: true, force: true });
  await mkdir(temporaryVideoDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  let videoPath: string | null = null;

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900,
      },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: temporaryVideoDir,
        size: {
          width: 1440,
          height: 900,
        },
      },
    });

    const page = await context.newPage();
    await signIn(page);
    await runShowcaseTour(page);

    const video = page.video();
    await context.close();
    videoPath = video ? await video.path() : null;
  } finally {
    await browser.close();

    if (server) {
      server.kill("SIGTERM");
    }
  }

  if (!videoPath) {
    throw new Error("Playwright did not produce a video file.");
  }

  await rm(webmOutputFile, { force: true });
  await rename(videoPath, webmOutputFile);
  await convertVideoToMp4(webmOutputFile);
  await rm(temporaryVideoDir, { recursive: true, force: true });
  console.log(`[showcase] WebM video saved to ${webmOutputFile}`);
  console.log(`[showcase] MP4 video saved to ${mp4OutputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

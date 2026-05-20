import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright-core";

const baseUrl = process.env.REPORT_BASE_URL || "http://localhost:3000";
const outputDir = join(process.cwd(), "report", "assets", "screenshots");
const chromePath =
  process.env.REPORT_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appPort = String(new URL(baseUrl).port || "3000");

const demoCredentials = {
  email: "demo.report@example.com",
  password: "ReportDemo123!",
};

const pages = [
  {
    path: "/",
    file: "dashboard.png",
    waitFor: async (page: Page) => {
      await page.waitForSelector("text=Calories today", { timeout: 20_000 });
      await page.waitForSelector("text=Range trends", { timeout: 20_000 });
      await page.waitForSelector("text=Recent calorie trend", {
        timeout: 20_000,
      });
    },
  },
  {
    path: "/log",
    file: "food-log.png",
  },
  {
    path: "/plans",
    file: "meal-plans.png",
  },
  {
    path: "/foods",
    file: "foods.png",
  },
  {
    path: "/goals",
    file: "goals.png",
  },
  {
    path: "/profile",
    file: "profile.png",
  },
  {
    path: "/assistant",
    file: "assistant.png",
  },
  {
    path: "/assistant/lab",
    file: "assistant-lab.png",
    waitFor: async (page: Page) => {
      await page.waitForSelector("text=Agent SDK Lab", { timeout: 15_000 });
      await page.waitForSelector("text=High-Protein Breakfast", {
        timeout: 15_000,
      });
      await page.waitForSelector("text=Vercel AI SDK", { timeout: 15_000 });
    },
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {
    // Some pages keep lightweight background requests open in dev mode.
  });

  await page
    .waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll(
          '[data-slot="skeleton"], .animate-pulse',
        );
        return loadingElements.length === 0;
      },
      { timeout: 20_000 },
    )
    .catch(() => {
      // Route-specific waits below still guard the important screenshot state.
    });

  await delay(1_000);
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

async function prepareDemoData() {
  console.log("[report] Seeding demo data...");
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
    console.log("[report] Reusing existing local app server.");
    return null;
  } catch {
    console.log("[report] Starting local dev server...");
    const server = spawnCommand("bun", ["run", "dev"], {
      ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_ENABLE_AGENT_SDK_LAB: "true",
      NEXT_PUBLIC_APP_URL: baseUrl,
      PORT: appPort,
    });
    await waitForHealth();
    console.log("[report] Local dev server is ready.");
    return server;
  }
}

async function signInWithApi(context: BrowserContext) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      ...demoCredentials,
      callbackURL: "/",
    }),
  });

  if (!response.ok) {
    throw new Error(`Sign-in failed with status ${response.status}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Sign-in response did not include a session cookie.");
  }

  const [cookiePair] = setCookie.split(";");
  const separatorIndex = cookiePair.indexOf("=");
  const name = cookiePair.slice(0, separatorIndex);
  const value = cookiePair.slice(separatorIndex + 1);

  await context.addCookies([
    {
      name,
      value,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function signInWithUi(page: Page) {
  await page.goto(`${baseUrl}/sign-in`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#email").fill(demoCredentials.email);
  await page.locator("#password").fill(demoCredentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"), {
    timeout: 20_000,
  });
}

async function signIn(context: BrowserContext, page: Page) {
  console.log("[report] Creating auth session...");

  try {
    await signInWithApi(context);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  } catch (error) {
    console.warn(
      `[report] API sign-in failed, falling back to UI flow: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    await signInWithUi(page);
  }

  await delay(2_000);
  console.log(`[report] Signed in, current URL: ${page.url()}`);
}

async function capturePages(page: Page) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const item of pages) {
    console.log(`[report] Capturing ${item.file}...`);
    await page.goto(`${baseUrl}${item.path}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageReady(page);
    if ("waitFor" in item && item.waitFor) {
      await item.waitFor(page);
    }
    await waitForPageReady(page);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await delay(1_500);

    await page.screenshot({
      path: join(outputDir, item.file),
      fullPage: true,
      type: "png",
    });
  }
}

async function main() {
  await prepareDemoData();
  const server = await startServerIfNeeded();
  console.log("[report] Launching headless browser...");

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 1200,
      },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    await signIn(context, page);
    await capturePages(page);
    await context.close();
    console.log("[report] Screenshots captured successfully.");
  } finally {
    await browser.close();

    if (server) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

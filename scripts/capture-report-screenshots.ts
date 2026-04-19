import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright-core";

const baseUrl = process.env.REPORT_BASE_URL || "http://localhost:3000";
const outputDir = join(process.cwd(), "report", "assets", "screenshots");
const chromePath =
  process.env.REPORT_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const demoCredentials = {
  email: "demo.report@example.com",
  password: "ReportDemo123!",
};

const pages = [
  {
    path: "/",
    file: "dashboard.png",
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
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  env?: NodeJS.ProcessEnv,
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
      NEXT_PUBLIC_APP_URL: baseUrl,
    });
    await waitForHealth();
    console.log("[report] Local dev server is ready.");
    return server;
  }
}

async function signIn(context: BrowserContext, page: Page) {
  console.log("[report] Creating auth session...");
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(demoCredentials),
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

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await delay(2_000);
  console.log(`[report] Session cookie installed, current URL: ${page.url()}`);
}

async function capturePages(page: Page) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const item of pages) {
    console.log(`[report] Capturing ${item.file}...`);
    await page.goto(`${baseUrl}${item.path}`, {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await delay(3_500);

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

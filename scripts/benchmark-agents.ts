import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AGENT_LAB_SCENARIOS, AGENT_SDK_IDS } from "../lib/agent-lab";
import {
  executeAgentLabRun,
  toPrismaScenarioId,
  toPrismaSdk,
  toPrismaToolEvents,
  toStoredTrace,
} from "../server/lib/agent-lab";
import { prisma } from "../server/lib/prisma";

const benchmarkRuns = Number(process.env.BENCHMARK_RUNS ?? "3");
const benchmarkUserEmail =
  process.env.BENCHMARK_USER_EMAIL ?? "demo.report@example.com";
const outputDir = join(process.cwd(), "report", "assets", "benchmarks");

type BenchmarkRow = {
  sdk: string;
  scenarioId: string;
  scenarioTitle: string;
  repetition: number;
  status: "completed" | "failed";
  latencyMs: number | null;
  responseLength: number;
  toolEventCount: number;
  expectedToolCoverage: string;
  error: string | null;
  runId: string;
  createdAt: string;
};

type BenchmarkSummaryRow = {
  sdk: string;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  averageLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  totalToolEvents: number;
};

function getBenchmarkProvider() {
  return process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
}

function requireBenchmarkApiKey() {
  const provider = getBenchmarkProvider();

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Run `AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... bun run report:benchmarks`.",
    );
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required. Run `OPENAI_API_KEY=... bun run report:benchmarks`.",
    );
  }
}

function serializeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function csvCell(value: string | number | null) {
  if (value == null) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildSummary(rows: BenchmarkRow[]): BenchmarkSummaryRow[] {
  return AGENT_SDK_IDS.map((sdk) => {
    const sdkRows = rows.filter((row) => row.sdk === sdk);
    const completedRows = sdkRows.filter(
      (row) => row.status === "completed" && row.latencyMs != null,
    );
    const latencies = completedRows.map((row) => row.latencyMs as number);
    const averageLatencyMs = latencies.length
      ? Math.round(
          latencies.reduce((sum, latency) => sum + latency, 0) /
            latencies.length,
        )
      : null;

    return {
      sdk,
      completedRuns: completedRows.length,
      failedRuns: sdkRows.filter((row) => row.status === "failed").length,
      successRate: sdkRows.length ? completedRows.length / sdkRows.length : 0,
      averageLatencyMs,
      minLatencyMs: latencies.length ? Math.min(...latencies) : null,
      maxLatencyMs: latencies.length ? Math.max(...latencies) : null,
      totalToolEvents: sdkRows.reduce(
        (sum, row) => sum + row.toolEventCount,
        0,
      ),
    };
  });
}

function formatMs(value: number | null) {
  return value == null ? "n/a" : `${value} ms`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function writeArtifacts(rows: BenchmarkRow[]) {
  await mkdir(outputDir, { recursive: true });

  const csvHeaders = [
    "sdk",
    "scenarioId",
    "scenarioTitle",
    "repetition",
    "status",
    "latencyMs",
    "responseLength",
    "toolEventCount",
    "expectedToolCoverage",
    "error",
    "runId",
    "createdAt",
  ];
  const csvRows = rows.map((row) =>
    csvHeaders
      .map((header) => csvCell(row[header as keyof BenchmarkRow]))
      .join(","),
  );

  await writeFile(
    join(outputDir, "agent-sdk-results.csv"),
    `${csvHeaders.join(",")}\n${csvRows.join("\n")}\n`,
  );
}

async function main() {
  requireBenchmarkApiKey();

  if (!Number.isInteger(benchmarkRuns) || benchmarkRuns < 1) {
    throw new Error("BENCHMARK_RUNS must be a positive integer.");
  }

  console.log("Starting live AI SDK benchmarks...");
  console.log(`Provider: ${getBenchmarkProvider()}`);
  console.log(`Repetitions per SDK/scenario: ${benchmarkRuns}`);

  const user = await prisma.user.findUnique({
    where: { email: benchmarkUserEmail },
  });

  if (!user) {
    throw new Error(
      `Benchmark user ${benchmarkUserEmail} not found. Run \`bun run report:seed\` first.`,
    );
  }

  const rows: BenchmarkRow[] = [];

  await prisma.agentLabRun.deleteMany({
    where: {
      userId: user.id,
      conversationId: {
        startsWith: "benchmark-",
      },
    },
  });

  for (const sdk of AGENT_SDK_IDS) {
    console.log(`\nBenchmarking SDK: ${sdk}`);

    for (const scenario of AGENT_LAB_SCENARIOS) {
      console.log(`  Scenario: ${scenario.id}`);

      for (let repetition = 1; repetition <= benchmarkRuns; repetition++) {
        const conversationId = `benchmark-${sdk}-${scenario.id}-${Date.now()}-${repetition}`;
        const run = await prisma.agentLabRun.create({
          data: {
            userId: user.id,
            sdk: toPrismaSdk(sdk),
            scenarioId: toPrismaScenarioId(scenario.id),
            conversationId,
            prompt: scenario.prompt,
            status: "RUNNING",
            rawTrace: toStoredTrace({
              source: "live-benchmark",
              repetition,
            }),
          },
          include: {
            toolEvents: true,
          },
        });

        try {
          process.stdout.write(`    Run ${repetition}/${benchmarkRuns}... `);
          const executed = await executeAgentLabRun({
            sdk,
            scenarioId: scenario.id,
            userId: user.id,
            conversationId: sdk === "openai-agents" ? null : conversationId,
          });
          const updatedRun = await prisma.agentLabRun.update({
            where: { id: run.id },
            data: {
              prompt: executed.prompt,
              response: executed.response,
              status: "COMPLETED",
              latencyMs: executed.latencyMs,
              rawTrace: toStoredTrace({
                source: "live-benchmark",
                repetition,
                trace: executed.rawTrace,
              }),
              toolEvents: {
                createMany: {
                  data: toPrismaToolEvents(executed.toolEvents),
                },
              },
            },
            include: {
              toolEvents: {
                orderBy: { position: "asc" },
              },
            },
          });
          const usedTools = new Set(
            executed.toolEvents.map((event) => event.toolName),
          );
          const coveredTools = scenario.expectedTools.filter((toolName) =>
            usedTools.has(toolName),
          );

          rows.push({
            sdk,
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            repetition,
            status: "completed",
            latencyMs: updatedRun.latencyMs,
            responseLength: updatedRun.response?.length ?? 0,
            toolEventCount: updatedRun.toolEvents.length,
            expectedToolCoverage: `${coveredTools.length}/${scenario.expectedTools.length}`,
            error: null,
            runId: updatedRun.id,
            createdAt: updatedRun.createdAt.toISOString(),
          });
          console.log(`${updatedRun.latencyMs ?? "n/a"} ms`);
        } catch (error) {
          const message = serializeError(error);
          const updatedRun = await prisma.agentLabRun.update({
            where: { id: run.id },
            data: {
              status: "FAILED",
              error: message,
              rawTrace: toStoredTrace({
                source: "live-benchmark",
                repetition,
                error: message,
              }),
            },
            include: {
              toolEvents: {
                orderBy: { position: "asc" },
              },
            },
          });

          rows.push({
            sdk,
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            repetition,
            status: "failed",
            latencyMs: null,
            responseLength: 0,
            toolEventCount: updatedRun.toolEvents.length,
            expectedToolCoverage: `0/${scenario.expectedTools.length}`,
            error: message,
            runId: updatedRun.id,
            createdAt: updatedRun.createdAt.toISOString(),
          });
          console.log(`failed: ${message}`);
        }
      }
    }
  }

  await writeArtifacts(rows);

  console.log("\nBenchmark summary");
  console.table(
    buildSummary(rows).map((row) => ({
      SDK: row.sdk,
      "Completed runs": row.completedRuns,
      "Failed runs": row.failedRuns,
      "Success rate": formatPercent(row.successRate),
      "Average latency": formatMs(row.averageLatencyMs),
      "Min latency": formatMs(row.minLatencyMs),
      "Max latency": formatMs(row.maxLatencyMs),
      "Tool events": row.totalToolEvents,
    })),
  );
  console.log(`Artifacts written to ${outputDir}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

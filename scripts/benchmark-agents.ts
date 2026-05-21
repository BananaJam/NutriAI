import { executeAgentLabRun } from "../server/lib/agent-lab";
import { AGENT_LAB_SCENARIOS, AGENT_SDK_IDS } from "../lib/agent-lab";
import { prisma } from "../server/lib/prisma";

async function main() {
  console.log("Starting AI SDK benchmarks...");
  const userId = "demo-user";

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error("Demo user not found. Please run 'bun run db:seed' first.");
    process.exit(1);
  }

  const results: Record<string, Record<string, number[]>> = {};

  for (const sdk of AGENT_SDK_IDS) {
    results[sdk] = {};
    console.log(`\nBenchmarking SDK: ${sdk}`);
    
    for (const scenario of AGENT_LAB_SCENARIOS) {
      results[sdk][scenario.id] = [];
      console.log(`  Scenario: ${scenario.id}`);
      
      // Run 3 times for averaging
      for (let i = 0; i < 3; i++) {
        try {
          process.stdout.write(`    Run ${i + 1}/3... `);
          const start = Date.now();
          const run = await executeAgentLabRun({
            sdk,
            scenarioId: scenario.id,
            userId,
          });
          const duration = Date.now() - start;
          results[sdk][scenario.id].push(duration);
          console.log(`${duration}ms`);
        } catch (error) {
          console.log(`Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("BENCHMARK RESULTS (Averages)");
  console.log("=".repeat(50));

  const tableData: any[] = [];

  for (const sdk of AGENT_SDK_IDS) {
    const sdkResults: Record<string, string> = { SDK: sdk };
    let sdkTotal = 0;
    let sdkCount = 0;

    for (const scenario of AGENT_LAB_SCENARIOS) {
      const times = results[sdk][scenario.id];
      if (times.length > 0) {
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        sdkResults[scenario.id] = `${avg}ms`;
        sdkTotal += avg;
        sdkCount++;
      } else {
        sdkResults[scenario.id] = "N/A";
      }
    }
    
    if (sdkCount > 0) {
      sdkResults["AVERAGE"] = `${Math.round(sdkTotal / sdkCount)}ms`;
    }
    
    tableData.push(sdkResults);
  }

  console.table(tableData);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

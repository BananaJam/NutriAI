import { Elysia, t } from "elysia";
import { AGENT_LAB_SCENARIOS, AGENT_SDK_IDS } from "@/lib/agent-lab";
import { isAgentLabEnabled } from "@/lib/feature-flags";
import {
  executeAgentLabRun,
  normalizeAgentLabRun,
  toPrismaScenarioId,
  toPrismaSdk,
  toPrismaToolEvents,
  toStoredTrace,
} from "../lib/agent-lab";
import { prisma } from "../lib/prisma";
import { requireRequestSession } from "../lib/session";

const sdkEnum = AGENT_SDK_IDS.map((sdk) => t.Literal(sdk));
const scenarioEnum = AGENT_LAB_SCENARIOS.map((scenario) =>
  t.Literal(scenario.id),
);

export const chatLabRoutes = new Elysia({ prefix: "/chat-lab" })
  .get(
    "/runs",
    async ({ query, request, set }) => {
      if (!isAgentLabEnabled()) {
        set.status = 404;
        return { message: "Not found" };
      }

      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const runs = await prisma.agentLabRun.findMany({
        where: {
          userId: session.user.id,
          sdk: query.sdk ? toPrismaSdk(query.sdk) : undefined,
          scenarioId: query.scenarioId
            ? toPrismaScenarioId(query.scenarioId)
            : undefined,
        },
        include: {
          toolEvents: {
            orderBy: { position: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
      });

      return {
        runs: runs.map(normalizeAgentLabRun),
      };
    },
    {
      query: t.Object({
        sdk: t.Optional(t.Union(sdkEnum)),
        scenarioId: t.Optional(t.Union(scenarioEnum)),
      }),
    },
  )
  .get(
    "/runs/:id",
    async ({ params, request, set }) => {
      if (!isAgentLabEnabled()) {
        set.status = 404;
        return { message: "Not found" };
      }

      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const run = await prisma.agentLabRun.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
        },
        include: {
          toolEvents: {
            orderBy: { position: "asc" },
          },
        },
      });

      if (!run) {
        set.status = 404;
        return { message: "Run not found" };
      }

      return {
        run: normalizeAgentLabRun(run),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/runs",
    async ({ body, request, set }) => {
      if (!isAgentLabEnabled()) {
        set.status = 404;
        return { message: "Not found" };
      }

      const session = await requireRequestSession(request, set);
      if (!session) return { message: "Unauthorized" };

      const run = await prisma.agentLabRun.create({
        data: {
          userId: session.user.id,
          sdk: toPrismaSdk(body.sdk),
          scenarioId: toPrismaScenarioId(body.scenarioId),
          conversationId: body.conversationId ?? null,
          prompt:
            AGENT_LAB_SCENARIOS.find(
              (scenario) => scenario.id === body.scenarioId,
            )?.prompt ?? "",
          status: "RUNNING",
        },
        include: {
          toolEvents: true,
        },
      });

      try {
        const executed = await executeAgentLabRun({
          sdk: body.sdk,
          scenarioId: body.scenarioId,
          userId: session.user.id,
          conversationId: body.conversationId ?? null,
        });

        const updatedRun = await prisma.agentLabRun.update({
          where: { id: run.id },
          data: {
            prompt: executed.prompt,
            response: executed.response,
            status: "COMPLETED",
            latencyMs: executed.latencyMs,
            rawTrace: toStoredTrace(executed.rawTrace),
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

        return {
          run: normalizeAgentLabRun(updatedRun),
        };
      } catch (error) {
        const updatedRun = await prisma.agentLabRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Run failed",
          },
          include: {
            toolEvents: {
              orderBy: { position: "asc" },
            },
          },
        });

        return {
          run: normalizeAgentLabRun(updatedRun),
        };
      }
    },
    {
      body: t.Object({
        sdk: t.Union(sdkEnum),
        scenarioId: t.Union(scenarioEnum),
        conversationId: t.Optional(t.String()),
      }),
    },
  );

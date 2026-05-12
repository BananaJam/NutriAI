"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Microscope, RefreshCcw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AGENT_LAB_SCENARIOS,
  AGENT_SDK_IDS,
  type AgentLabRun,
  type AgentLabRunListResponse,
  type AgentLabRunResponse,
  type AgentLabScenarioId,
  type AgentSdkId,
} from "@/lib/agent-lab";

const sdkNotes: Record<
  AgentSdkId,
  {
    title: string;
    implementationFit: string;
    capabilityNote: string;
  }
> = {
  "vercel-ai": {
    title: "Vercel AI SDK",
    implementationFit:
      "Closest to the current app and lowest-integration baseline.",
    capabilityNote:
      "Good for tool loops and streaming, lighter on orchestration primitives.",
  },
  "openai-agents": {
    title: "OpenAI Agents SDK",
    implementationFit:
      "Fastest serious alternative when OpenAI-native orchestration is acceptable.",
    capabilityNote:
      "Adds agent abstractions, sessions, tracing, and handoff-oriented runtime features.",
  },
  langgraph: {
    title: "LangGraph",
    implementationFit: "More setup and more moving parts than the other two.",
    capabilityNote:
      "Best fit when durable state and explicit control-flow matter more than integration speed.",
  },
};

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(
      "message" in (data as object)
        ? String((data as { message?: unknown }).message)
        : "Request failed",
    );
  }

  return data;
}

function getStatusTone(status: AgentLabRun["status"]) {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatSdkLabel(sdk: AgentSdkId) {
  return sdkNotes[sdk].title;
}

function renderValue(value: unknown) {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

export function AssistantLab() {
  const queryClient = useQueryClient();
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<AgentLabScenarioId>(AGENT_LAB_SCENARIOS[0].id);

  const selectedScenario = useMemo(
    () =>
      AGENT_LAB_SCENARIOS.find(
        (scenario) => scenario.id === selectedScenarioId,
      ) ?? AGENT_LAB_SCENARIOS[0],
    [selectedScenarioId],
  );

  const runsQuery = useQuery({
    queryKey: ["agentLabRuns"],
    queryFn: async () =>
      fetchJson<AgentLabRunListResponse>("/api/chat-lab/runs"),
  });

  const compareMutation = useMutation({
    mutationFn: async (scenarioId: AgentLabScenarioId) => {
      const conversationId = crypto.randomUUID();

      return Promise.all(
        AGENT_SDK_IDS.map(async (sdk) => {
          const result = await fetchJson<AgentLabRunResponse>(
            "/api/chat-lab/runs",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sdk,
                scenarioId,
                conversationId,
              }),
            },
          );

          return result.run;
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentLabRuns"] });
    },
  });

  const visibleRuns = useMemo(() => {
    if (compareMutation.data?.length) {
      return compareMutation.data;
    }

    const grouped = new Map<AgentSdkId, AgentLabRun>();

    for (const run of runsQuery.data?.runs ?? []) {
      if (run.scenarioId !== selectedScenarioId) {
        continue;
      }

      if (!grouped.has(run.sdk)) {
        grouped.set(run.sdk, run);
      }
    }

    return AGENT_SDK_IDS.map((sdk) => grouped.get(sdk)).filter(
      (run): run is AgentLabRun => Boolean(run),
    );
  }, [compareMutation.data, runsQuery.data?.runs, selectedScenarioId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation"
        title="Agent SDK Lab"
        description="Run the same nutrition tasks through three agent stacks and compare implementation fit, tool activity, latency, and response quality."
        actions={
          <Button
            onClick={() => compareMutation.mutate(selectedScenarioId)}
            disabled={compareMutation.isPending}
            className="rounded-xl"
          >
            {compareMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running comparison
              </>
            ) : (
              <>
                <Microscope className="mr-2 h-4 w-4" />
                Run all SDKs
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {AGENT_LAB_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id;

          return (
            <button
              key={scenario.id}
              type="button"
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
              onClick={() => setSelectedScenarioId(scenario.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{scenario.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {scenario.summary}
                  </p>
                </div>
                {scenario.mutatesData ? (
                  <Badge variant="secondary">Writes data</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {scenario.expectedTools.map((toolName) => (
                  <Badge key={toolName} variant="outline">
                    {toolName}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {AGENT_SDK_IDS.map((sdk) => (
          <Card key={sdk} className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{sdkNotes[sdk].title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{sdkNotes[sdk].implementationFit}</p>
              <p>{sdkNotes[sdk].capabilityNote}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {runsQuery.isError ? (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4" />
            Failed to load previous lab runs.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{selectedScenario.title}</p>
          <p className="text-sm text-muted-foreground">
            {selectedScenario.prompt}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => runsQuery.refetch()}
          disabled={runsQuery.isFetching}
          className="rounded-xl"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh runs
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {AGENT_SDK_IDS.map((sdk) => {
          const run = visibleRuns.find((candidate) => candidate.sdk === sdk);

          return (
            <Card key={sdk} className="rounded-2xl">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {formatSdkLabel(sdk)}
                  </CardTitle>
                  <Badge variant={getStatusTone(run?.status ?? "pending")}>
                    {run?.status ?? "no run"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    Latency:{" "}
                    {run?.latencyMs != null ? `${run.latencyMs} ms` : "n/a"}
                  </span>
                  <span>Tools: {run?.toolEvents.length ?? 0}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {run ? (
                  <>
                    {run.error ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {run.error}
                      </div>
                    ) : null}

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Response
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {run.response || "No response captured."}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/10 p-3">
                      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Tool Trace
                      </p>
                      {run.toolEvents.length ? (
                        <div className="space-y-2">
                          {run.toolEvents.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-lg border bg-background/80 p-2"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-medium">
                                  {event.toolName}
                                </span>
                                <Badge variant="outline">{event.state}</Badge>
                              </div>
                              <details className="mt-2 text-xs text-muted-foreground">
                                <summary className="cursor-pointer">
                                  Payload
                                </summary>
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                  {renderValue(
                                    event.state === "call"
                                      ? event.args
                                      : event.result,
                                  )}
                                </pre>
                              </details>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No tool activity recorded.
                        </p>
                      )}
                    </div>

                    <details className="rounded-xl border bg-muted/10 p-3">
                      <summary className="cursor-pointer text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Raw trace
                      </summary>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">
                        {renderValue(run.rawTrace)}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    {runsQuery.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading run history...
                      </>
                    ) : (
                      "No run captured for this SDK and scenario yet."
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

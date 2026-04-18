"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Chat } from "@/components/features/chat";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const timeOfDayStarters = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) {
    return [
      "Plan today's meals",
      "What should I eat for breakfast?",
      "Help me hit my protein target today",
      "Suggest a high-fiber morning meal",
    ];
  }
  if (hour >= 11 && hour < 17) {
    return [
      "Am I on track for today's calories?",
      "Log my lunch",
      "Suggest a high-protein lunch option",
      "Compare two foods for me",
    ];
  }
  return [
    "Summarize today's nutrition",
    "What can I eat for dinner to hit my goals?",
    "Analyze my progress this week",
    "Help me plan meals for tomorrow",
  ];
};

const universalStarters = [
  "Calculate my recommended macros",
  "Help me build a meal plan for the week",
  "Explain my progress this week",
  "Find a high-fiber breakfast option",
];

function AssistantPageInner() {
  const searchParams = useSearchParams();
  const seedPrompt = searchParams.get("prompt") ?? "";
  const [activePrompt, setActivePrompt] = useState(seedPrompt);
  const starters = timeOfDayStarters();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Assistant"
        title="Nutrition Assistant"
        description="Ask questions, get meal suggestions, analyze your nutrition, and navigate your goals — all from one place."
        actions={
          <Link href="/log">
            <Button variant="outline" className="rounded-xl">
              View today's log
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...starters, ...universalStarters.slice(0, 4 - starters.length)].map(
          (prompt) => (
            <Card
              key={prompt}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setActivePrompt(prompt)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-snug">
                  {prompt}
                </CardTitle>
              </CardHeader>
            </Card>
          ),
        )}
      </div>

      <Chat initialInput={activePrompt} />
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantPageInner />
    </Suspense>
  );
}

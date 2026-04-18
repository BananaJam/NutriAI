import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NextStepCardProps {
  icon: LucideIcon;
  message: string;
  cta: string;
  href: string;
  variant?: "default" | "subtle";
}

export function NextStepCard({
  icon: Icon,
  message,
  cta,
  href,
  variant = "default",
}: NextStepCardProps) {
  return (
    <Card
      className={
        variant === "subtle"
          ? "border-dashed bg-muted/30"
          : "border-primary/20 bg-primary/5"
      }
    >
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-medium">{message}</p>
        </div>
        <Button
          asChild
          size="sm"
          variant={variant === "subtle" ? "outline" : "default"}
          className="shrink-0 rounded-xl"
        >
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

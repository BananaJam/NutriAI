"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
  children: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  footerText,
  footerHref,
  footerLinkLabel,
  children,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <Link
              href={footerHref}
              className="text-primary underline-offset-4 hover:underline"
            >
              {footerLinkLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

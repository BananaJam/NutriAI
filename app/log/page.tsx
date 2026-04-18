import Link from "next/link";
import { FoodLog } from "@/components/features/food-log";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";

export default function FoodLogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily Tracking"
        title="Food Log"
        description="Record every meal and snack to see how your daily intake stacks up against your nutrition targets."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/plans">
              <Button variant="outline" className="rounded-xl">
                View meal plans
              </Button>
            </Link>
            <Link href="/assistant?prompt=Help+me+plan+what+to+eat+today">
              <Button variant="outline" className="rounded-xl">
                Ask the assistant
              </Button>
            </Link>
          </div>
        }
      />
      <FoodLog />
    </div>
  );
}

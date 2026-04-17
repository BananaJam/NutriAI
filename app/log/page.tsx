import { FoodLog } from "@/components/features/food-log";

export default function FoodLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Food Log</h2>
        <p className="text-muted-foreground">
          Track your daily food intake and nutrition
        </p>
      </div>
      <FoodLog />
    </div>
  );
}

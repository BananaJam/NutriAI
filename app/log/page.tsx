import { FoodLog } from "@/components/features/food-log";

export default function FoodLogPage() {
  // In a real app, get userId from auth session
  const userId = "demo-user";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Food Log</h2>
        <p className="text-muted-foreground">
          Track your daily food intake and nutrition
        </p>
      </div>
      <FoodLog userId={userId} />
    </div>
  );
}

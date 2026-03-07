import { Chat } from "@/components/features/chat";

export default function AssistantPage() {
  // In a real app, get userId from auth session
  const userId = "demo-user";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
        <p className="text-muted-foreground">
          Chat with your personal nutrition AI assistant
        </p>
      </div>
      <Chat userId={userId} />
    </div>
  );
}

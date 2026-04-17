import { Chat } from "@/components/features/chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
        <p className="text-muted-foreground">
          Chat with your personal nutrition AI assistant
        </p>
      </div>
      <Chat />
    </div>
  );
}

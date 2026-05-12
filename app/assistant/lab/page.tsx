import { notFound } from "next/navigation";
import { AssistantLab } from "@/components/features/assistant-lab";
import { isAgentLabEnabled } from "@/lib/feature-flags";

export default function AssistantLabPage() {
  if (!isAgentLabEnabled()) {
    notFound();
  }

  return <AssistantLab />;
}

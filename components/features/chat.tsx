"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message, ToolInvocation } from "ai";
import { useChat } from "ai/react";
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  api,
  type ChatConversationDetail,
  type ChatToolInvocation,
  normalizeChatConversationResponse,
  normalizeChatConversationsResponse,
} from "@/lib/api";

const starterPrompts = [
  "Find a high-protein breakfast from my saved foods",
  "Add one of my recent lunches to today",
  "Compare my saved yogurts by protein and calories",
];

const TOOL_COPY: Record<
  string,
  {
    label: string;
    pendingLabel: string;
  }
> = {
  searchFoods: {
    label: "Checked foods",
    pendingLabel: "Checking foods",
  },
  logFood: {
    label: "Logged meal",
    pendingLabel: "Logging meal",
  },
  getDailyLog: {
    label: "Read daily log",
    pendingLabel: "Reading daily log",
  },
  getUserProfile: {
    label: "Reviewed profile",
    pendingLabel: "Reviewing profile",
  },
  getUserStats: {
    label: "Reviewed stats",
    pendingLabel: "Reviewing stats",
  },
  getActiveGoals: {
    label: "Checked goals",
    pendingLabel: "Checking goals",
  },
  calculateMacros: {
    label: "Calculated macros",
    pendingLabel: "Calculating macros",
  },
};

type RenderToolInvocation = ToolInvocation;
type ChatUiMessage = Pick<
  Message,
  "id" | "role" | "content" | "toolInvocations"
>;

export function Chat({ initialInput }: { initialInput?: string } = {}) {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery(
    {
      queryKey: ["chatConversations"],
      queryFn: async () => {
        const result = await api.api.chat.conversations.get();
        if (result.error) throw new Error("Failed to load conversations");
        return normalizeChatConversationsResponse(result.data);
      },
    },
  );

  const createConversation = useMutation({
    mutationFn: async () => {
      const result = await api.api.chat.conversations.post({});
      if (result.error) throw new Error("Failed to create conversation");
      return result.data as {
        conversation: {
          id: string;
        };
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
      setSelectedConversationId(data.conversation.id);
    },
  });

  const renameConversation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const result = await api.api.chat.conversations({ id }).patch({ title });
      if (result.error) throw new Error("Failed to rename conversation");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
      queryClient.invalidateQueries({ queryKey: ["chatConversation"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api.chat.conversations({ id }).delete();
      if (result.error) throw new Error("Failed to delete conversation");
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
      queryClient.removeQueries({ queryKey: ["chatConversation", id] });

      if (selectedConversationId === id) {
        const remaining = (conversationsData?.conversations ?? []).filter(
          (conversation) => conversation.id !== id,
        );
        setSelectedConversationId(remaining[0]?.id ?? null);
      }
    },
  });

  useEffect(() => {
    if (
      selectedConversationId ||
      conversationsLoading ||
      createConversation.isPending
    ) {
      return;
    }

    const firstConversation = conversationsData?.conversations?.[0];

    if (firstConversation) {
      setSelectedConversationId(firstConversation.id);
      return;
    }

    if (conversationsData && !conversationsData.conversations.length) {
      createConversation.mutate();
    }
  }, [
    conversationsData,
    conversationsLoading,
    createConversation,
    selectedConversationId,
  ]);

  return (
    <div className="grid min-h-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="min-h-0 overflow-hidden">
        <CardContent className="flex min-h-0 flex-col gap-4 p-4">
          <Button
            className="w-full"
            onClick={() => createConversation.mutate()}
            disabled={createConversation.isPending}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>

          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {(conversationsData?.conversations ?? []).map((conversation) => (
              <div
                key={conversation.id}
                className={`rounded-lg border transition-colors ${
                  selectedConversationId === conversation.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-2 p-3">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <p className="truncate text-sm font-medium">
                      {conversation.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {conversation.preview || "No messages yet"}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Conversation actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const title = window.prompt(
                            "Rename conversation",
                            conversation.title,
                          );
                          if (title?.trim()) {
                            renameConversation.mutate({
                              id: conversation.id,
                              title: title.trim(),
                            });
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          deleteConversation.mutate(conversation.id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedConversationId ? (
        <ConversationPane
          key={selectedConversationId}
          conversationId={selectedConversationId}
          initialInput={initialInput}
          onConversationTouched={() => {
            queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
            queryClient.invalidateQueries({
              queryKey: ["chatConversation", selectedConversationId],
            });
          }}
        />
      ) : (
        <div className="flex min-h-[32rem] items-center justify-center rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation...
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationPane({
  conversationId,
  initialInput,
  onConversationTouched,
}: {
  conversationId: string;
  initialInput?: string;
  onConversationTouched: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["chatConversation", conversationId],
    queryFn: async () => {
      const result = await api.api.chat
        .conversations({ id: conversationId })
        .get();
      if (result.error) throw new Error("Failed to load conversation");
      return normalizeChatConversationResponse(result.data);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <ConversationSession
      conversationId={conversationId}
      conversation={data.conversation}
      initialInput={initialInput}
      onConversationTouched={onConversationTouched}
    />
  );
}

function ConversationSession({
  conversationId,
  conversation,
  initialInput,
  onConversationTouched,
}: {
  conversationId: string;
  conversation: ChatConversationDetail;
  initialInput?: string;
  onConversationTouched: () => void;
}) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [showPendingIndicator, setShowPendingIndicator] = useState(false);
  const initialMessages = useMemo<ChatUiMessage[]>(
    () =>
      conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        toolInvocations: normalizeToolInvocations(message.toolInvocations),
      })),
    [conversation.messages],
  );

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    isLoading: isChatLoading,
  } = useChat({
    api: "/api/chat",
    id: conversationId,
    body: { conversationId },
    initialMessages,
    onFinish: () => {
      onConversationTouched();
    },
  });

  const normalizedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        toolInvocations: normalizeToolInvocations(message.toolInvocations),
      })),
    [messages],
  );

  const lastAssistantMessage = [...normalizedMessages]
    .reverse()
    .find((message) => message.role === "assistant");
  const lastAssistantHasVisibleContent = Boolean(
    lastAssistantMessage &&
      (lastAssistantMessage.content.trim().length > 0 ||
        lastAssistantMessage.toolInvocations.length > 0),
  );

  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
    }
  }, [initialInput, setInput]);

  useEffect(() => {
    if (!isChatLoading || lastAssistantHasVisibleContent) {
      setShowPendingIndicator(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowPendingIndicator(true);
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isChatLoading, lastAssistantHasVisibleContent]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const content = messagesContentRef.current;
    if (!container || !content) return;

    const isNearBottom = () =>
      container.scrollHeight - container.scrollTop - container.clientHeight <
      96;

    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    };

    scrollToBottom();

    const handleScroll = () => {
      shouldStickToBottomRef.current = isNearBottom();
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom();
      }
    });

    observer.observe(content);

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="flex min-h-[32rem] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-lg border p-3 sm:p-3.5">
      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2"
      >
        <div ref={messagesContentRef} className="space-y-2.5">
          {normalizedMessages.length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-green-100">
                    <Bot className="h-4.5 w-4.5 text-green-600" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-semibold">
                    Welcome to your AI nutrition assistant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use the assistant for meal logging, target review, and
                    weekly planning.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      void append({ role: "user", content: prompt });
                    }}
                    disabled={isChatLoading}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {normalizedMessages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}

          {showPendingIndicator ? (
            <PendingAssistantRow
              label={getPendingActivityLabel(lastAssistantMessage)}
            />
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about nutrition, log food, or build a meal plan..."
          disabled={isChatLoading}
          className="h-10 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setInput(starterPrompts[0])}
          disabled={isChatLoading}
          className="h-10"
        >
          Prompt
        </Button>
        <Button
          type="submit"
          disabled={isChatLoading || !input.trim()}
          className="h-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function MessageRow({ message }: { message: ChatUiMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-green-100">
            <Bot className="h-4 w-4 text-green-600" />
          </AvatarFallback>
        </Avatar>
      ) : null}

      <Card
        className={`max-w-[min(82%,46rem)] gap-0 py-0.5 shadow-none ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted/80"
        }`}
      >
        <CardContent className="px-3 py-1.5">
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-[1.35]">
              {message.content}
            </p>
          ) : (
            <AssistantMessageContent message={message} />
          )}
        </CardContent>
      </Card>

      {isUser ? (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary">
            <User className="h-4 w-4 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function AssistantMessageContent({ message }: { message: ChatUiMessage }) {
  const toolInvocations = normalizeToolInvocations(message.toolInvocations);
  const hasText = message.content.trim().length > 0;

  return (
    <div className="space-y-1.5">
      {hasText ? (
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      ) : null}
      {toolInvocations.length > 0 ? (
        <AssistantToolActivity toolInvocations={toolInvocations} />
      ) : null}
    </div>
  );
}

function AssistantToolActivity({
  toolInvocations,
}: {
  toolInvocations: RenderToolInvocation[];
}) {
  const labels = Array.from(
    new Set(toolInvocations.map((invocation) => getToolLabel(invocation))),
  );
  const summaryLabel =
    labels.length === 1 ? labels[0] : `${labels.length} assistant actions`;

  return (
    <details className="group rounded-xl border border-border/70 bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-foreground">
          {summaryLabel}
        </span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1.5 space-y-1.5 border-t border-border/70 pt-1.5">
        {toolInvocations.map((invocation) => {
          const summary = summarizeToolInvocation(invocation);

          return (
            <div key={getToolInvocationKey(invocation)} className="space-y-0.5">
              <p className="text-[11px] font-medium text-foreground">
                {getToolLabel(invocation)}
              </p>
              <p className="leading-[1.35] text-muted-foreground">{summary}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function PendingAssistantRow({ label }: { label: string }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-green-100">
          <Bot className="h-4 w-4 text-green-600" />
        </AvatarFallback>
      </Avatar>
      <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function normalizeToolInvocations(
  toolInvocations:
    | Message["toolInvocations"]
    | ChatToolInvocation[]
    | undefined,
): RenderToolInvocation[] {
  if (!Array.isArray(toolInvocations)) {
    return [];
  }

  return toolInvocations.reduce<RenderToolInvocation[]>(
    (normalizedInvocations, invocation, index) => {
      if (!invocation || typeof invocation.toolName !== "string") {
        return normalizedInvocations;
      }

      const toolCallId =
        invocation.toolCallId ?? `${invocation.toolName}-${index}`;
      const state = invocation.state ?? "call";

      if (state === "result") {
        normalizedInvocations.push({
          state: "result",
          toolCallId,
          toolName: invocation.toolName,
          args: invocation.args,
          result: "result" in invocation ? invocation.result : undefined,
        });

        return normalizedInvocations;
      }

      if (state === "partial-call") {
        normalizedInvocations.push({
          state: "partial-call",
          toolCallId,
          toolName: invocation.toolName,
          args: invocation.args,
        });

        return normalizedInvocations;
      }

      normalizedInvocations.push({
        state: "call",
        toolCallId,
        toolName: invocation.toolName,
        args: invocation.args,
      });

      return normalizedInvocations;
    },
    [],
  );
}

function getToolCopy(toolName: string) {
  return (
    TOOL_COPY[toolName] ?? {
      label: humanizeToolName(toolName),
      pendingLabel: `${humanizeToolName(toolName, true)}`,
    }
  );
}

function getToolLabel(invocation: RenderToolInvocation) {
  return getToolCopy(invocation.toolName).label;
}

function getPendingActivityLabel(message?: ChatUiMessage) {
  const activeInvocation = message?.toolInvocations
    ?.map((invocation) => invocation as RenderToolInvocation)
    .find((invocation) => invocation.state !== "result");

  if (!activeInvocation) {
    return "Writing reply";
  }

  return getToolCopy(activeInvocation.toolName).pendingLabel;
}

function getToolInvocationKey(invocation: RenderToolInvocation) {
  return (
    invocation.toolCallId ??
    `${invocation.toolName}-${JSON.stringify(invocation.args ?? {})}`
  );
}

function summarizeToolInvocation(invocation: RenderToolInvocation) {
  if (invocation.state !== "result") {
    return getToolCopy(invocation.toolName).pendingLabel;
  }

  const result = invocation.result;

  switch (invocation.toolName) {
    case "searchFoods":
      if (Array.isArray(result)) {
        const names = result
          .slice(0, 3)
          .map((item) =>
            typeof item === "object" &&
            item &&
            "name" in item &&
            typeof item.name === "string"
              ? item.name
              : null,
          )
          .filter((name): name is string => Boolean(name));

        return names.length
          ? `${result.length} foods matched: ${names.join(", ")}`
          : `${result.length} foods matched`;
      }
      break;
    case "logFood":
      if (isRecord(result)) {
        const foodName =
          isRecord(result.food) && typeof result.food.name === "string"
            ? result.food.name
            : "food";
        const mealType =
          typeof result.mealType === "string"
            ? result.mealType.toLowerCase()
            : "meal";
        const servings =
          typeof result.servings === "number" ? result.servings : 1;

        return `Added ${foodName} to ${mealType} (${formatNumber(servings)} servings)`;
      }
      break;
    case "getDailyLog":
      if (isRecord(result)) {
        if (typeof result.message === "string") {
          return result.message;
        }

        if (isRecord(result.log)) {
          const itemCount = Array.isArray(result.log.items)
            ? result.log.items.length
            : 0;
          const date =
            typeof result.log.date === "string"
              ? result.log.date.slice(0, 10)
              : null;

          return date
            ? `${itemCount} logged items on ${date}`
            : `${itemCount} logged items found`;
        }
      }
      break;
    case "getUserProfile":
      if (isRecord(result) && typeof result.message === "string") {
        return result.message;
      }

      return "Loaded nutrition targets and profile details";
    case "getUserStats":
      if (isRecord(result)) {
        const loggedDays =
          typeof result.loggedDays === "number" ? result.loggedDays : null;

        if (loggedDays !== null) {
          return `Reviewed ${loggedDays} logged day${loggedDays === 1 ? "" : "s"}`;
        }
      }

      return "Reviewed nutrition trends and averages";
    case "getActiveGoals":
      if (Array.isArray(result)) {
        return `${result.length} active goal${result.length === 1 ? "" : "s"} found`;
      }
      break;
    case "calculateMacros":
      if (isRecord(result)) {
        const calories =
          typeof result.calories === "number"
            ? `${Math.round(result.calories)} kcal`
            : null;
        const protein =
          typeof result.protein === "number"
            ? `${Math.round(result.protein)}g protein`
            : null;

        return (
          [calories, protein].filter(Boolean).join(", ") ||
          "Calculated macro targets"
        );
      }
      break;
    default:
      break;
  }

  if (isRecord(result) && typeof result.message === "string") {
    return result.message;
  }

  return "Completed";
}

function humanizeToolName(toolName: string, asVerb = false) {
  const base = toolName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  if (!asVerb) {
    return base.replace(/^\w/, (char) => char.toUpperCase());
  }

  return `${base.replace(/^\w/, (char) => char.toUpperCase())}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

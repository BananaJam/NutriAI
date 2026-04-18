"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "ai/react";
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  api,
  type ChatConversationDetail,
  normalizeChatConversationResponse,
  normalizeChatConversationsResponse,
} from "@/lib/api";

const starterPrompts = [
  "Find a high-protein breakfast from my saved foods",
  "Add one of my recent lunches to today",
  "Compare my saved yogurts by protein and calories",
];

export function Chat() {
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
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-4 p-4">
          <Button
            className="w-full"
            onClick={() => createConversation.mutate()}
            disabled={createConversation.isPending}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>

          <div className="space-y-2">
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
          onConversationTouched={() => {
            queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
            queryClient.invalidateQueries({
              queryKey: ["chatConversation", selectedConversationId],
            });
          }}
        />
      ) : (
        <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-lg border">
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
  onConversationTouched,
}: {
  conversationId: string;
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
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-lg border">
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
      onConversationTouched={onConversationTouched}
    />
  );
}

function ConversationSession({
  conversationId,
  conversation,
  onConversationTouched,
}: {
  conversationId: string;
  conversation: ChatConversationDetail;
  onConversationTouched: () => void;
}) {
  const initialMessages = useMemo(
    () =>
      conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
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

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border p-4">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-green-100">
                    <Bot className="h-5 w-5 text-green-600" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    Welcome to your AI nutrition assistant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use the assistant for meal logging, target review, and
                    weekly planning.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
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

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-green-100">
                    <Bot className="h-4 w-4 text-green-600" />
                  </AvatarFallback>
                </Avatar>
              )}
              <Card
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <CardContent className="px-3">
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </p>
                  )}
                  {message.toolInvocations &&
                  message.toolInvocations.length > 0 ? (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      {message.toolInvocations.map((toolInvocation, index) => (
                        <div
                          key={`${toolInvocation.toolName}-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-medium">
                            Tool: {toolInvocation.toolName}
                          </span>
                          {toolInvocation.state === "result" ? (
                            <span className="ml-2 text-green-600">
                              (completed)
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              {message.role === "user" ? (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </div>
          ))}

          {isChatLoading ? (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-green-100">
                  <Bot className="h-4 w-4 text-green-600" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted">
                <CardContent className="flex items-center gap-2 p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about nutrition, log food, or build a meal plan..."
          disabled={isChatLoading}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setInput(starterPrompts[0])}
          disabled={isChatLoading}
        >
          Prompt
        </Button>
        <Button type="submit" disabled={isChatLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

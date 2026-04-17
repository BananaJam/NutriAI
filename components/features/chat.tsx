"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "ai/react";
import { Bot, Loader2, MessageSquarePlus, Send, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  api,
  type ChatConversation,
  type ChatConversationDetail,
} from "@/lib/api";

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
        return result.data as unknown as { conversations: ChatConversation[] };
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
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
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
              <button
                key={conversation.id}
                type="button"
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedConversationId === conversation.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <p className="truncate text-sm font-medium">
                  {conversation.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {conversation.preview || "No messages yet"}
                </p>
              </button>
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
      return result.data as unknown as { conversation: ChatConversationDetail };
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
    handleInputChange,
    handleSubmit,
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Welcome to your AI Nutrition Assistant
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask about meals, calorie targets, food search, or macro
                planning.
              </p>
            </div>
          )}

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
                    message.toolInvocations.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {message.toolInvocations.map(
                          (toolInvocation, index) => (
                            <div
                              key={`${toolInvocation.toolName}-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              <span className="font-medium">
                                Tool: {toolInvocation.toolName}
                              </span>
                              {toolInvocation.state === "result" && (
                                <span className="ml-2 text-green-600">
                                  (completed)
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>
              {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isChatLoading && (
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
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about nutrition, log food, or get recommendations..."
          disabled={isChatLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isChatLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

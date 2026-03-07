"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface ChatProps {
  userId?: string;
}

export function Chat({ userId }: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { userId },
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Welcome to your AI Nutrition Assistant
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                I can help you track meals, plan nutrition, calculate macros,
                and answer questions about healthy eating. Try asking me
                something!
              </p>
              <div className="mt-4 grid gap-2 text-sm">
                <p className="text-muted-foreground">Try asking:</p>
                <ul className="space-y-1 text-left">
                  <li>&quot;Search for chicken breast&quot;</li>
                  <li>&quot;What did I eat today?&quot;</li>
                  <li>&quot;Calculate my daily macros&quot;</li>
                  <li>&quot;Suggest a healthy lunch&quot;</li>
                </ul>
              </div>
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
                <CardContent className="p-3">
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  {message.toolInvocations &&
                    message.toolInvocations.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {message.toolInvocations.map((tool, index) => (
                          <div
                            key={index}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium">
                              Tool: {tool.toolName}
                            </span>
                            {tool.state === "result" && (
                              <span className="ml-2 text-green-600">
                                (completed)
                              </span>
                            )}
                          </div>
                        ))}
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

          {isLoading && (
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
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

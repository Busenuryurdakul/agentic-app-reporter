"use client";

import { Bot, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AGENT_PRESETS,
  presetUserMessage,
  type AgentMessage,
  type AgentPreset,
} from "@/features/agent/agent-formatters";
import { useAgentPanel } from "@/features/agent/agent-panel-provider";
import { getAgentToolError, useAgentToolCall } from "@/features/agent/use-agent-tools";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { tr } from "@/lib/i18n/tr";

function nextMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AgentPanel() {
  const { open, setOpen, orgId, workspaceId } = useAgentPanel();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toolCall = useAgentToolCall(orgId, workspaceId);

  const appendMessage = useCallback((message: AgentMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const runPreset = useCallback(
    async (preset: AgentPreset) => {
      appendMessage({
        id: nextMessageId(),
        role: "user",
        content: presetUserMessage(preset),
      });

      try {
        const content = await toolCall.mutateAsync(preset);
        appendMessage({
          id: nextMessageId(),
          role: "assistant",
          content,
        });
      } catch (error) {
        appendMessage({
          id: nextMessageId(),
          role: "error",
          content: getAgentToolError(error),
        });
      }
    },
    [appendMessage, toolCall],
  );

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCall.isPending]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            {tr.agent.title}
          </SheetTitle>
          <SheetDescription>{tr.agent.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          {AGENT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={toolCall.isPending}
              onClick={() => void runPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr.agent.emptyHint}</p>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-6 rounded-lg bg-primary/10 px-3 py-2 text-sm"
                    : message.role === "error"
                      ? "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                      : "mr-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap"
                }
              >
                {message.content}
              </div>
            ))}

            {toolCall.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {tr.agent.running}
              </div>
            ) : null}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {tr.agent.jwtHint}
        </div>
      </SheetContent>
    </Sheet>
  );
}

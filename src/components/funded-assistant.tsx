import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, Send, Sparkles, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant } from "@/backend/ai-functions";

type AssistantAnswer = Awaited<ReturnType<typeof askAssistant>>;
type ChatTurn = { role: "user" | "assistant"; text: string; sources?: AssistantAnswer["sources"] };

const QUICK_QUESTIONS = [
  "My Donation History",
  "Track My Latest Payment",
  "My Funded Projects",
  "Latest Project Milestones",
  "Blockchain Transaction Status",
];

export function FundedAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: (question: string) => askAssistant({ data: { question } }),
    onSuccess: (result) => {
      setTurns((prev) => [...prev, { role: "assistant", text: result.answer, sources: result.sources }]);
      queueScroll();
    },
    onError: (err: unknown) => {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong answering that — please try again.",
        },
      ]);
      queueScroll();
    },
  });

  function queueScroll() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function send(question: string) {
    const q = question.trim();
    if (!q || mutation.isPending) return;
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    queueScroll();
    mutation.mutate(q);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full p-0 shadow-elevated sm:bottom-6 sm:right-6"
          aria-label="Open FundEd AI Assistant"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal" /> FundEd AI Assistant
          </SheetTitle>
          <SheetDescription>
            Ask about your donations, funded projects, payments, and milestones.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  t.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card"
                }`}
              >
                <p className="whitespace-pre-wrap">{t.text}</p>
                {t.sources && t.sources.length > 0 && (
                  <div className="mt-2 space-y-0.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                    {t.sources.slice(0, 4).map((s, si) => (
                      <div key={si}>• {s.label}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-border p-4"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your donations, projects, milestones…"
            disabled={mutation.isPending}
          />
          <Button type="submit" size="icon" disabled={mutation.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

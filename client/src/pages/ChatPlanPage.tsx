import { useState, useRef, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Sparkles, Send } from 'lucide-react';
import { chatApi, type ChatTurn } from '@/api/chat';
import type { ImportedPlan } from '@/lib/planImport';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

const GREETING =
  "Hi! Tell me about your fitness goals — strength, muscle, fat loss, or general fitness — " +
  'your experience level, how many days a week you can train, and any equipment or ' +
  "injuries I should know about. I'll put together a plan for you to review.";

interface DisplayMessage extends ChatTurn {
  id: number;
  plan?: ImportedPlan | null;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) ? (err.response?.data as { error?: string })?.error ?? fallback : fallback;
}

export default function ChatPlanPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (history: ChatTurn[]) => chatApi.sendWorkoutPlanMessage(history),
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'model', text: reply.message, plan: reply.plan }]);
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Couldn't reach the AI assistant")),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sendMutation.isPending) return;

    const userTurn: DisplayMessage = { id: nextId.current++, role: 'user', text };
    const history: ChatTurn[] = [...messages, userTurn].map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    sendMutation.mutate(history);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <button onClick={() => navigate('/plans')} className="text-sm text-muted hover:text-ink mb-1">
          ← Back to plans
        </button>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-violet" /> Create a Plan with AI
        </h1>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="bg-surface-2 text-ink rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] self-start whitespace-pre-wrap">
              {GREETING}
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-btn-primary text-btn-primary-text rounded-tr-sm self-end'
                    : 'bg-surface-2 text-ink rounded-tl-sm self-start'
                }`}
              >
                {m.text}
                {m.plan && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        toast.success(`"${m.plan!.name}" is ready — review before saving`);
                        navigate('/plans/new', { state: { importedPlan: m.plan } });
                      }}
                    >
                      Review &amp; save plan
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {sendMutation.isPending && (
              <div className="bg-surface-2 text-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] self-start">
                Thinking…
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your reply…"
              disabled={sendMutation.isPending}
              autoFocus
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30"
            />
            <Button type="submit" loading={sendMutation.isPending} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

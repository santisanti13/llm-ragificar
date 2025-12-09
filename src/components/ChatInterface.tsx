import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Send, Loader2, User, Bot, Sparkles, Copy, Check, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(7);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      id: generateId(),
      role: 'user', 
      content: input.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('rag-chat', {
        body: {
          projectId,
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (response.error) {
        if (response.error.message?.includes('429')) {
          toast.error('Límite de solicitudes excedido. Por favor espera un momento.');
        } else if (response.error.message?.includes('402')) {
          toast.error('Créditos agotados. Agrega más créditos en tu workspace.');
        } else {
          throw response.error;
        }
        return;
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error('Error al procesar tu mensaje');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const suggestedQuestions = [
    '¿Cuáles son los puntos principales?',
    '¿Puedes resumir el contenido?',
    '¿Qué dice sobre...?'
  ];

  return (
    <Card className="glass-strong h-[650px] flex flex-col overflow-hidden">
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">RAG Chat</span>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Messages area */}
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
          <div className="p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center glow">
                    <Sparkles className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                    <Check className="h-3 w-3 text-success-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-3">Chatea con tus documentos</h3>
                <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                  Hazme preguntas sobre el contenido de tus documentos. 
                  Usaré RAG para encontrar la información más relevante.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {suggestedQuestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      className="text-sm hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 animate-fade-in ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`group relative max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-muted/70 border border-border/50'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                                  ) : (
                                    <code className="block bg-background/50 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</code>
                                  );
                                },
                                pre: ({ children }) => <pre className="bg-background/50 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        )}
                      </div>
                      {/* Copy button for assistant messages */}
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-10 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => handleCopy(message.content, message.id)}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/70 border border-border/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-card/30">
          <div className="flex gap-3">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="min-h-[48px] max-h-32 resize-none bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="gradient-primary h-[48px] w-[48px] shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
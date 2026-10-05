'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  BookOpen,
  MessageSquare,
  LoaderCircle,
  HelpCircle,
} from 'lucide-react';
import AiBookCard from '@/app/components/AiBookCard';
import type { ChatMessage } from '@/app/lib/types';
import { cn } from '@/app/lib/utils';

interface AiAssistantModalProps {
  onSelectBook: (bookId: string) => void;
}

const DEFAULT_MESSAGE: ChatMessage = {
  id: 'init-welcome',
  role: 'assistant',
  content:
    'আসসালামু আলাইকুম ও স্বাগতম! আমি LibStack এআই সহকারী। আমাদের লাইব্রেরির যেকোনো বই খুঁজতে, বিষয়ভিত্তিক বইয়ের পরামর্শ নিতে বা সেলফে বইয়ের বর্তমান স্টক জানতে আমাকে নির্দ্বিধায় জিজ্ঞেস করতে পারেন।',
  timestamp: new Date().toISOString(),
};

const STARTER_PROMPTS = [
  'মুক্তিযুদ্ধের ইতিহাস নিয়ে কী বই আছে?',
  'জনপ্রিয় ফিকশন বা ক্লাসিক উপন্যাস সাজেস্ট করুন',
  'দর্শন ও চিন্তাশীল কী কী বই পড়তে পারি?',
];

function formatBold(str: string): React.ReactNode[] {
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderSimpleMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    const isBullet =
      trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
    const lineText = isBullet ? trimmed.replace(/^(\*|-|•)\s+/, '') : line;
    const formatted = formatBold(lineText);

    if (isBullet) {
      return (
        <span key={idx} className="flex items-start gap-2 my-1">
          <span className="text-violet-500 font-bold shrink-0 leading-relaxed">•</span>
          <span className="flex-1">{formatted}</span>
        </span>
      );
    }

    return (
      <span key={idx} className="block my-0.5 min-h-[1.25em]">
        {formatted}
      </span>
    );
  });
}

function renderMessageContent(content: string, onSelectBook: (id: string) => void) {
  const tokenRegex = /\[\[BOOK:([a-zA-Z0-9-]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push(<span key={`text-${lastIndex}`}>{renderSimpleMarkdown(textBefore)}</span>);
    }
    const bookId = match[1];
    parts.push(
      <AiBookCard
        key={`book-${bookId}-${match.index}`}
        bookId={bookId}
        onSelectBook={onSelectBook}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) {
    parts.push(<span key={`text-${lastIndex}`}>{renderSimpleMarkdown(remaining)}</span>);
  }

  return parts;
}

export default function AiAssistantModal({ onSelectBook }: AiAssistantModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('libstack_ai_chat');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // If stored initial message contains "নমস্কার", replace it with the new DEFAULT_MESSAGE
            return parsed.map((m: ChatMessage) => {
              if (m.role === 'assistant' && (m.content.includes('নমস্কার') || m.id === 'welcome-1')) {
                return { ...m, id: DEFAULT_MESSAGE.id, content: DEFAULT_MESSAGE.content };
              }
              return m;
            });
          }
        }
      } catch {
        // ignore
      }
    }
    return [DEFAULT_MESSAGE];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [isOpen, messages, scrollToBottom]);

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('libstack_ai_chat', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([DEFAULT_MESSAGE]);
    try {
      localStorage.removeItem('libstack_ai_chat');
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? inputVal).trim();
    if (!content || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputVal('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const assistantReply =
        data.reply || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'সার্ভারের সাথে সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="ai-assistant-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Library Assistant"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white shadow-xl hover:shadow-purple-500/25 px-4 py-3 rounded-full flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border border-white/20 select-none"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
          <span className="font-semibold text-sm tracking-wide">বই সহকারী (AI)</span>
        </button>
      )}

      {/* Floating Chat Drawer Dialog */}
      {isOpen && (
        <div
          id="ai-assistant-drawer"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181920] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          role="dialog"
          aria-modal="true"
          aria-label="LibStack এআই সহকারী"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight leading-tight">
                  LibStack এআই সহকারী
                </h3>
                <p className="text-[11px] text-violet-200 font-medium">
                  Groq LLaMA-3.3 · বাংলা বই গাইড
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="চ্যাট ক্লিয়ার করুন"
                aria-label="Clear chat history"
                className="p-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="বন্ধ করুন"
                aria-label="Close assistant"
                className="p-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={cn('flex items-start gap-2.5', isUser ? 'justify-end' : 'justify-start')}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl p-3 sm:p-3.5 shadow-sm leading-relaxed break-words',
                      isUser
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none',
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">
                        {renderMessageContent(msg.content, onSelectBook)}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing / Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" />
                </div>
              </div>
            )}

            {/* Starter Prompt Chips when conversation is fresh */}
            {messages.length <= 1 && (
              <div className="pt-2 pb-1 space-y-2">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-violet-500" />
                  <span>দ্রুত জিজ্ঞেস করুন:</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSendMessage(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-slate-700 dark:text-slate-300 font-medium transition-all shadow-2xs active:scale-98 cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-[#181920] border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 p-1.5 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="বই বা লেখক সম্পর্কে বাংলায় লিখুন… (Enter to send)"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none resize-none max-h-24"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading}
                aria-label="Send message"
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 active:scale-95 text-white shadow-sm transition-all shrink-0 cursor-pointer"
              >
                {isLoading ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

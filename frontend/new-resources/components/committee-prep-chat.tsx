"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle2, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CommitteePrepChatProps {
  caseId: string;
  language?: "he" | "en";
  onClose?: () => void;
}

export default function CommitteePrepChat({
  caseId,
  language = "he",
  onClose,
}: CommitteePrepChatProps) {
  const isRTL = language === "he";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    const init = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/cases/${caseId}/committee-prep/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "__INIT__",
              chat_history: [],
              language,
            }),
          }
        );
        const data = await res.json();
        setMessages([{ role: "assistant", content: data.message }]);
        if (data.done) setDone(true);
      } catch {
        setMessages([
          {
            role: "assistant",
            content: isRTL
              ? "שלום! אני כאן כדי לעזור לך להתכונן לוועדה הרפואית. מה האבחנה העיקרית שתוערך?"
              : "Hello! I'm here to help you prepare for your medical committee. What is the main diagnosis being assessed?",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [caseId, initialized, language, isRTL]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || done) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/cases/${caseId}/committee-prep/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            chat_history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            language,
          }),
        }
      );
      const data = await res.json();
      setMessages([
        ...nextHistory,
        { role: "assistant", content: data.message },
      ]);
      if (data.done) setDone(true);
    } catch {
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content: isRTL
            ? "מצטער, אירעה שגיאה. אנא נסה שוב."
            : "Sorry, an error occurred. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">
              {isRTL ? "הכנה לוועדה רפואית" : "Medical Committee Preparation"}
            </p>
            <p className="text-xs text-blue-200">
              {isRTL ? "מאמן AI אישי" : "Your AI coach"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-blue-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${
                msg.role === "user"
                  ? isRTL
                    ? "justify-start"
                    : "justify-end"
                  : isRTL
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex ${isRTL ? "justify-end" : "justify-start"}`}
          >
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          </motion.div>
        )}

        {done && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5" />
              {isRTL
                ? "ההכנה הושלמה — בהצלחה בוועדה!"
                : "Preparation complete — good luck at the committee!"}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!done && (
        <div className="px-4 py-3 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? "כתוב/י את תשובתך כאן..." : "Type your answer here..."}
              rows={2}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 p-0 flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-1 px-1">
            {isRTL
              ? "Enter לשליחה • Shift+Enter לשורה חדשה"
              : "Enter to send • Shift+Enter for new line"}
          </p>
        </div>
      )}
    </div>
  );
}

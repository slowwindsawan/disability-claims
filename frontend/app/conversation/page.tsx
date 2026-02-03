"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft, Smile, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "😘",
  "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪",
  "😌", "😔", "😑", "😐", "😶", "🥱", "😏", "😒",
  "😬", "🤐", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
  "😠", "😡", "🤬", "😈", "👿", "💀", "☠️", "💢",
  "💯", "✅", "❌", "✔️", "☑️", "❎", "🔥", "⭐",
  "🙏", "👍", "👎", "👏", "🤝", "🎉", "🎊", "😍"
];

export default function ConversationPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isRTL = true; // Force Hebrew
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock messages for the UI
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "שלום, כיצד אוכל לעזור לך היום?",
      sender: "agent",
      time: "10:00",
    },
  ]);

  useEffect(() => {
    // Force Hebrew language
    setLanguage("he");
    
    // Check authentication
    const token = localStorage.getItem("access_token");
    if (!token) {
      // Redirect to home with redirect param to trigger login
      router.push("/?redirect=conversation");
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router, setLanguage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setMessage("");
    setShowEmojiPicker(false);

    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "תודה על הודעתך. נציג יחזור אליך בהקדם.",
          sender: "agent",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(message + emoji);
    setShowEmojiPicker(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`flex flex-col h-screen bg-[#E5DDD5] rtl`} dir="rtl">
      {/* Header */}
      <header className="bg-[#008069] text-white p-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-[#006c59]" 
            onClick={() => router.push("/dashboard")}
            title="חזור לדשבורד"
          >
            <ArrowLeft className="h-6 w-6 rotate-180" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              SC
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-base">מרכז התמיכה</span>
              <span className="text-xs text-white/80">מחובר</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#E5DDD5]">
        <div className="space-y-4">
          <div className="flex justify-center my-4">
            <span className="bg-[#E1F3FB] text-[#1E293B] text-xs px-3 py-1 rounded-lg shadow-sm">
              {new Date().toLocaleDateString('he-IL')}
            </span>
          </div>
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${
                  msg.sender === "user"
                    ? "bg-[#D9FDD3] rounded-tr-none"
                    : "bg-white rounded-tl-none"
                }`}
              >
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </p>
                <div className="flex justify-start items-center gap-1 mt-1">
                  <span className="text-[10px] text-gray-500">
                    {msg.time}
                  </span>
                  {msg.sender === "user" && (
                    <span className="text-[#53bdeb]">
                      <svg viewBox="0 0 16 15" width="16" height="15" className="w-[14px] h-[14px]">
                        <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.283a.419.419 0 0 0 .58 0l6.052-7.545a.418.418 0 0 0-.053-.566zm-7.549 8.34l3.75-4.636a.376.376 0 0 0 .102-.047l-.986-1.026a.326.326 0 0 0-.472.016l-2.455 3.197-1.425-1.424a.325.325 0 0 0-.47.009l-.826.965a.39.39 0 0 0 .02.508l2.762 2.766a.392.392 0 0 0 .55 0z"></path>
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="bg-[#F0F2F5] p-3 px-4 flex items-center gap-2 z-10 flex-row-reverse relative">
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#54656F] hover:bg-[#E8E8E8]"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="הוסף emoji"
          >
            <Smile className="h-6 w-6" />
          </Button>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg p-3 z-50 w-72 max-h-64 overflow-y-auto border border-gray-200"
              >
                <div className="grid grid-cols-8 gap-2">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="הקלד הודעה"
            className="bg-white border-none focus-visible:ring-0 rounded-lg h-10"
            dir="rtl"
          />
        </form>

        {message.trim() && (
          <Button 
            onClick={() => handleSendMessage()} 
            size="icon" 
            className="bg-[#008069] hover:bg-[#006c59] text-white rounded-full h-10 w-10 transition-transform duration-200"
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        )}
      </footer>
    </div>
  );
}

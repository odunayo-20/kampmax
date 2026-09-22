"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Send,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface Conversation {
  id: string;
  customerName: string;
  customerCampus: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  orderId?: string;
  productTitle?: string;
}

interface ChatMessage {
  id?: string;
  sender: "vendor" | "customer";
  text: string;
  time: string;
}

export default function VendorMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    async function loadConversations() {
      setIsLoadingConvs(true);
      const { data } = await apiClient.get<any>("/conversations");
      if (data) {
        const rawItems = Array.isArray(data) ? data : data.items || [];
        const mapped: Conversation[] = rawItems.map((c: any) => ({
          id: c.id,
          customerName: c.title || c.otherParticipantName || c.name || "Customer",
          customerCampus: c.campusName || "Main Campus",
          lastMessage: c.lastMessage?.text || c.lastMessage || "No messages yet",
          lastMessageTime: c.updatedAt || c.lastMessageAt || new Date().toISOString(),
          unreadCount: c.unreadCount || 0,
          orderId: c.orderId,
          productTitle: c.productTitle,
        }));
        setConversations(mapped);
        if (mapped.length > 0) {
          setSelectedId(mapped[0].id);
        }
      }
      setIsLoadingConvs(false);
    }

    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    async function loadMessages() {
      setIsLoadingMessages(true);
      const { data } = await apiClient.get<any>(`/conversations/${selectedId}/messages`);
      if (data) {
        const rawMsgs = Array.isArray(data) ? data : data.items || [];
        const mapped: ChatMessage[] = rawMsgs.map((m: any) => ({
          id: m.id,
          sender: m.isMine || m.senderRole === "vendor" ? "vendor" : "customer",
          text: m.text || m.content || "",
          time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setChatMessages((prev) => ({
          ...prev,
          [selectedId]: mapped,
        }));
      }
      setIsLoadingMessages(false);
    }

    loadMessages();
  }, [selectedId]);

  const activeConv = conversations.find((c) => c.id === selectedId);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || messageInput;
    if (!text.trim() || !selectedId) return;

    const newMsg: ChatMessage = {
      sender: "vendor",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, lastMessage: `You: ${text}`, lastMessageTime: new Date().toISOString(), unreadCount: 0 }
          : c
      )
    );

    if (!textToSend) setMessageInput("");

    await apiClient.post(`/conversations/${selectedId}/messages`, {
      text: text.trim(),
    });
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Vendor Portal", href: "/vendor/dashboard" },
    { label: "Customer Messages" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-5xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex items-center gap-3">
          <Link
            href="/vendor/dashboard"
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-kampmax-text">Vendor Chat & Messages</h1>
            <p className="text-xs text-kampmax-text-secondary">
              Direct communication inbox with campus buyers & order inquiries.
            </p>
          </div>
        </div>

        {/* Chat Interface Grid */}
        <div className="bg-white rounded-2xl border border-kampmax-border overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
          {/* Left Panel: Conversation List */}
          <div className="border-r border-kampmax-border flex flex-col">
            <div className="p-3 border-b border-kampmax-border">
              <div className="relative">
                <Search className="w-4 h-4 text-kampmax-text-secondary absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search buyer or order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-kampmax-border rounded-xl focus:outline-none focus:border-kampmax-blue"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoadingConvs ? (
                <div className="p-6 text-center text-xs text-kampmax-text-secondary flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 text-kampmax-blue animate-spin" />
                  <span>Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-kampmax-text-secondary">
                  No active conversations found.
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedId(conv.id);
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
                      );
                    }}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      selectedId === conv.id ? "bg-blue-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-kampmax-navy/10 text-kampmax-navy font-bold text-xs flex items-center justify-center shrink-0">
                      {conv.customerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-kampmax-text truncate">
                          {conv.customerName}
                        </h4>
                        <span className="text-[10px] text-kampmax-text-secondary shrink-0">
                          {formatDate(new Date(conv.lastMessageTime))}
                        </span>
                      </div>
                      <p className="text-[11px] text-kampmax-text-secondary truncate mt-0.5">
                        {conv.lastMessage}
                      </p>
                      {conv.orderId && (
                        <span className="inline-block text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded mt-1">
                          Order #{conv.orderId}
                        </span>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-4 h-4 bg-kampmax-blue text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Chat Thread & Composer */}
          <div className="md:col-span-2 flex flex-col bg-slate-50/40">
            {activeConv ? (
              <>
                {/* Thread Header */}
                <div className="p-3.5 bg-white border-b border-kampmax-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-kampmax-navy text-white font-bold text-xs flex items-center justify-center">
                      {activeConv.customerName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-kampmax-text">
                        {activeConv.customerName}
                      </h3>
                      <p className="text-[11px] text-kampmax-text-secondary">
                        {activeConv.customerCampus}
                      </p>
                    </div>
                  </div>
                  {activeConv.orderId && (
                    <Link
                      href={`/vendor/orders/${activeConv.orderId}`}
                      className="text-xs font-semibold text-kampmax-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                    >
                      Order #{activeConv.orderId} →
                    </Link>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {isLoadingMessages ? (
                    <div className="p-6 text-center text-xs text-kampmax-text-secondary flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-kampmax-blue animate-spin" />
                      <span>Loading messages...</span>
                    </div>
                  ) : (chatMessages[activeConv.id] || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-kampmax-text-secondary">
                      No messages in this chat yet. Write a message below to start chatting.
                    </div>
                  ) : (
                    (chatMessages[activeConv.id] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.sender === "vendor" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs space-y-1 ${
                            msg.sender === "vendor"
                              ? "bg-kampmax-navy text-white rounded-br-xs"
                              : "bg-white border border-kampmax-border text-kampmax-text rounded-bl-xs shadow-xs"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.text}</p>
                          <span
                            className={`text-[9px] block text-right ${
                              msg.sender === "vendor" ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-white flex items-center gap-2 border-t border-kampmax-border"
                >
                  <input
                    type="text"
                    placeholder="Type your response to buyer..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-kampmax-border rounded-xl focus:outline-none focus:border-kampmax-blue"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-4 py-2 bg-kampmax-navy text-white text-xs font-bold rounded-xl hover:bg-kampmax-navy/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-kampmax-text-secondary text-xs">
                Select a conversation to start messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

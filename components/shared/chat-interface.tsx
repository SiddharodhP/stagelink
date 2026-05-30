"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, Loader2, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentUser } from "@/lib/services/auth";
import { getConversations, getMessages, sendMessage, subscribeToMessages } from "@/lib/services/chat";
import { createClient } from "@/lib/supabase/client";

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [participantDetails, setParticipantDetails] = useState<Record<string, { name: string, image: string | null }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { user: currentUser } = await getCurrentUser();
      if (!currentUser) return;
      setUser(currentUser);

      const { data } = await getConversations(currentUser.id);
      if (data) {
        setConversations(data);
        
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chat');
        
        if (chatIdParam) {
          const chatFromParam = data.find(c => c.id === chatIdParam);
          if (chatFromParam) setActiveChat(chatFromParam);
          else if (data.length > 0) setActiveChat(data[0]);
        } else if (data.length > 0) {
          setActiveChat(data[0]);
        }
        
        // Fetch participant details
        const details: Record<string, { name: string, image: string | null }> = {};
        for (const conv of data) {
          const otherId = conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1;
          if (!details[otherId]) {
            // Try musician
            const { data: mData } = await supabase.from('musician_profiles').select('stage_name, profile_image').eq('user_id', otherId).maybeSingle();
            if (mData) {
              details[otherId] = { name: mData.stage_name, image: mData.profile_image };
              continue;
            }
            // Try organizer
            const { data: oData } = await supabase.from('organizer_profiles').select('organizer_name').eq('user_id', otherId).maybeSingle();
            if (oData) {
              details[otherId] = { name: oData.organizer_name, image: null };
              continue;
            }
            details[otherId] = { name: "Unknown User", image: null };
          }
        }
        setParticipantDetails(details);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    
    async function fetchMsgs() {
      const { data } = await getMessages(activeChat.id);
      if (data) setMessages(data);
    }
    fetchMsgs();

    const unsubscribe = subscribeToMessages(activeChat.id, (newMsg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !user) return;
    
    const msgText = newMessage.trim();
    setNewMessage(""); 
    
    const { data } = await sendMessage(activeChat.id, user.id, msgText);
    if (data) {
       setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
       });
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
      
      {/* Conversations List */}
      <Card className="w-full md:w-80 h-1/2 md:h-full glass-card border-white/10 bg-black/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search chats..." 
              className="pl-9 bg-white/5 border-white/10 text-sm h-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center p-4 text-zinc-500 text-sm">No conversations yet</div>
          ) : conversations.map(chat => {
            const otherId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;
            const details = participantDetails[otherId] || { name: "User", image: null };
            const lastMsg = chat.messages?.[0]; // Assuming ordered by desc in query

            return (
              <div 
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex gap-3 ${
                  activeChat?.id === chat.id ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 border border-white/10">
                  {details.image ? <AvatarImage src={details.image} /> : null}
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">{details.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm truncate font-medium text-zinc-300">
                      {details.name}
                    </h4>
                    {lastMsg && <span className="text-[10px] text-zinc-500">{formatTime(lastMsg.created_at)}</span>}
                  </div>
                  {lastMsg && (
                    <p className="text-xs truncate text-zinc-500">
                      {lastMsg.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Chat Window */}
      <Card className="flex-1 h-1/2 md:h-full glass-card border-white/10 bg-black/40 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                {(() => {
                  const otherId = activeChat.participant_1 === user.id ? activeChat.participant_2 : activeChat.participant_1;
                  const details = participantDetails[otherId] || { name: "User", image: null };
                  return (
                    <>
                      <Avatar className="h-10 w-10 border border-white/10">
                        {details.image ? <AvatarImage src={details.image} /> : null}
                        <AvatarFallback className="bg-zinc-800 text-zinc-400">{details.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-white">{details.name}</h3>
                        <p className="text-xs text-green-400">Online</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`${isMe ? 'bg-purple-600 rounded-tr-sm' : 'bg-zinc-800/80 rounded-tl-sm'} border border-white/10 rounded-2xl px-4 py-2 max-w-[80%] text-sm ${isMe ? 'text-white' : 'text-zinc-200'}`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10 bg-black/60">
              <div className="flex gap-2 relative">
                <Input 
                  placeholder="Type your message..." 
                  className="bg-white/5 border-white/10 focus-visible:ring-purple-500 h-12 pr-12"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                />
                <Button 
                  size="icon" 
                  className="absolute right-1 top-1 h-10 w-10 bg-purple-600 hover:bg-purple-700"
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </Card>
    </div>
  );
}

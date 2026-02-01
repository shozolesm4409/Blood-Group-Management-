
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  requestSupportAccess, 
  sendMessage, 
  subscribeToRoomMessages, 
  subscribeToAllSupportRooms,
  subscribeToAllIncomingMessages,
  markMessagesAsRead,
  getUsers 
} from '../services/api';
import { Card, Button, Input, Badge } from '../components/UI';
import { LifeBuoy, Lock, BookOpen, MessageSquare, PhoneCall, HelpCircle, CheckCircle, Send, ArrowLeft, Search, User as UserIcon, AlertCircle } from 'lucide-react';
import { ChatMessage, UserRole, User } from '../types';
import clsx from 'clsx';

export const SupportCenter = () => {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // View states: 'hub', 'system-chat', 'user-list', 'private-chat'
  const [activeView, setActiveView] = useState<'hub' | 'system-chat' | 'user-list' | 'private-chat'>('hub');
  
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Map to store unread counts: senderId -> count
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.supportAccessRequested) setHasRequested(true);
    if (user) {
      // Gracefully handle user list fetching
      getUsers().then(users => {
        setAllUsers(users);
      }).catch(() => {});
      
      // Global subscription to track unread counts for THIS user
      const unsubscribeUnread = subscribeToAllIncomingMessages(user.id, (msgs) => {
        const counts: Record<string, number> = {};
        msgs.forEach(m => {
          counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        });
        setUnreadCounts(counts);
      }, (err) => {
        // Suppress unread count error UI
        console.debug("Unread count subscription restricted");
      });
      
      return () => unsubscribeUnread();
    }
  }, [user]);

  // Handle message subscriptions based on active view
  useEffect(() => {
    if (!user) return;
    setPermissionError(null);
    let unsubscribe: () => void = () => {};

    const handleError = (err: any) => {
      if (err.code === 'permission-denied') {
        // Only show UI error if it's a critical context
        setPermissionError("Action restricted by system policy. You might not have permission to view these messages.");
      }
    };

    if (activeView === 'system-chat') {
      const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.EDITOR;
      if (isStaff) {
        unsubscribe = subscribeToAllSupportRooms((msgs) => {
          setMessages(msgs.filter(m => m.roomId.startsWith('SUPPORT_')));
        }, handleError);
      } else {
        unsubscribe = subscribeToRoomMessages(`SUPPORT_${user.id}`, setMessages, handleError);
      }
    } else if (activeView === 'private-chat' && selectedRecipient) {
      const roomId = [user.id, selectedRecipient.id].sort().join('_');
      // Mark as read when entering
      markMessagesAsRead(roomId, user.id);
      unsubscribe = subscribeToRoomMessages(roomId, setMessages, handleError);
    }

    return () => unsubscribe();
  }, [activeView, selectedRecipient, user]);

  useEffect(() => {
    if (activeView === 'system-chat' || activeView === 'private-chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeView]);

  const handleRequest = async () => {
    if (!user) return;
    setIsRequesting(true);
    try {
      await requestSupportAccess(user);
      setHasRequested(true);
      alert("Support access request sent to Admin.");
    } catch (e) {
      alert("Failed to send request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isSending) return;

    setIsSending(true);
    let roomId = '';
    let receiverId = '';

    if (activeView === 'system-chat') {
      roomId = `SUPPORT_${user.id}`;
      receiverId = 'SYSTEM';
    } else if (activeView === 'private-chat' && selectedRecipient) {
      roomId = [user.id, selectedRecipient.id].sort().join('_');
      receiverId = selectedRecipient.id;
    }

    const msg = {
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar || '',
      receiverId,
      roomId,
      text: newMessage,
      isAdminReply: user.role === UserRole.ADMIN || user.role === UserRole.EDITOR
    };

    try {
      await sendMessage(msg);
      setNewMessage('');
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        alert("You do not have permission to post messages here.");
      } else {
        alert("Message failed to send.");
      }
    } finally {
      setIsSending(false);
    }
  };

  // Render Messaging UI Component
  const renderChat = (title: string, icon: any) => (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between">
         <button onClick={() => { setActiveView('hub'); setSelectedRecipient(null); setPermissionError(null); }} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">
           <ArrowLeft size={16} /> Back to Hub
         </button>
         <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
           {React.createElement(icon, { size: 20, className: "text-blue-600" })} 
           {title}
         </h1>
         <div className="w-20"></div>
      </div>

      <Card className="flex-1 flex flex-col border-0 shadow-2xl overflow-hidden rounded-3xl bg-slate-50 relative">
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {permissionError && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0" />
                {permissionError}
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={clsx("flex flex-col", msg.senderId === user?.id ? "items-end" : "items-start")}>
                <div className={clsx(
                  "max-w-[80%] p-4 rounded-3xl shadow-sm text-sm font-medium",
                  msg.senderId === user?.id 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : (msg.isAdminReply ? "bg-red-50 text-red-900 rounded-bl-none border border-red-100" : "bg-white text-slate-900 rounded-bl-none border border-slate-100")
                )}>
                  {msg.senderId !== user?.id && <p className="text-[9px] font-black uppercase opacity-60 mb-1">{msg.senderName} {msg.isAdminReply && '(Staff)'}</p>}
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-bold mt-1 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {!permissionError && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                <MessageSquare size={48} className="mb-4" />
                <p className="font-bold text-sm">No messages yet.</p>
              </div>
            )}
            <div ref={chatEndRef} />
         </div>
         
         <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-slate-50 border-0 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              disabled={isSending}
            />
            <button 
              type="submit" 
              disabled={isSending || !newMessage.trim()}
              className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
         </form>
      </Card>
    </div>
  );

  if (activeView === 'system-chat') {
    return renderChat("Live System Support", MessageSquare);
  }

  if (activeView === 'private-chat' && selectedRecipient) {
    return renderChat(`Chat with ${selectedRecipient.name}`, UserIcon);
  }

  if (activeView === 'user-list') {
    const filteredUsers = allUsers.filter(u => 
      u.id !== user?.id && 
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       u.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
           <button onClick={() => setActiveView('hub')} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">
             <ArrowLeft size={16} /> Back to Hub
           </button>
           <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
             <BookOpen size={20} className="text-blue-600" /> User Messenger
           </h1>
           <div className="w-20"></div>
        </div>

        <Card className="flex-1 flex flex-col border-0 shadow-lg overflow-hidden rounded-3xl bg-white p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users by name or blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredUsers.map(u => (
              <div 
                key={u.id} 
                onClick={() => { setSelectedRecipient(u); setActiveView('private-chat'); }}
                className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:shadow-md rounded-2xl cursor-pointer transition-all border border-transparent hover:border-blue-100 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-slate-300" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      {unreadCounts[u.id] > 0 && (
                        <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-sm">
                          {unreadCounts[u.id]}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.role}</p>
                  </div>
                </div>
                <Badge color="red" className="font-black text-[10px] tracking-widest uppercase">
                  {u.bloodGroup}
                </Badge>
              </div>
            ))}
            {allUsers.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                <p className="text-sm font-medium italic">Directory access restricted or loading...</p>
              </div>
            )}
            {allUsers.length > 0 && filteredUsers.length === 0 && (
              <div className="text-center py-20 text-slate-400 font-medium">No matches found.</div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 rounded-2xl">
          <LifeBuoy className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support & Resource Center</h1>
          <p className="text-sm text-slate-500 font-medium">Connect with staff and donors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => setActiveView('user-list')}>
          <SupportLinkCard 
            icon={BookOpen} 
            title="User Messenger" 
            description="Start a private conversation with any registered donor."
            color="blue"
            badge={Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
          />
        </div>
        <div onClick={() => setActiveView('system-chat')}>
          <SupportLinkCard 
            icon={MessageSquare} 
            title="Live Chat" 
            description="Speak with our system administrators instantly."
            color="green"
          />
        </div>
        <SupportLinkCard 
          icon={PhoneCall} 
          title="Emergency Contact" 
          description="Direct line for critical system issues."
          color="red"
        />
      </div>

      <Card className="p-8 border-0 shadow-lg">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          <HelpCircle className="text-blue-600" size={24} /> 
          Frequently Asked Questions
        </h3>
        <div className="space-y-6">
          <FAQItem 
            q="How do I update my last donation date?" 
            a="Your donation date is automatically updated by the Administrator once your donation record is marked as 'Completed'." 
          />
          <FAQItem 
            q="Who can see my contact information?" 
            a="Only Administrators and verified Editors with Directory Access can view your phone number and email for logistics purposes." 
          />
        </div>
      </Card>
    </div>
  );
};

const SupportLinkCard = ({ icon: Icon, title, description, color, badge }: any) => {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600"
  };
  return (
    <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 shadow-md group relative">
      {badge > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-white animate-pulse">
          {badge}
        </span>
      )}
      <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", colors[color])}>
        <Icon size={24} />
      </div>
      <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
    </Card>
  );
};

const FAQItem = ({ q, a }: { q: string, a: string }) => (
  <div className="border-b border-slate-100 pb-4">
    <p className="font-bold text-slate-800 mb-2 flex items-center gap-2">
      <CheckCircle size={16} className="text-green-500" /> {q}
    </p>
    <p className="text-xs text-slate-500 font-medium leading-relaxed pl-6">{a}</p>
  </div>
);


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
// Fix: Added ArrowRight to lucide-react imports to resolve reference error on line 257
import { LifeBuoy, Lock, BookOpen, MessageSquare, PhoneCall, HelpCircle, CheckCircle, Send, ArrowLeft, Search, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { ChatMessage, UserRole, User } from '../types';
import clsx from 'clsx';

export const SupportCenter = () => {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<'hub' | 'system-chat' | 'user-list' | 'private-chat'>('hub');
  
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.supportAccessRequested) setHasRequested(true);
    if (user) {
      getUsers().then(users => {
        setAllUsers(users);
      }).catch(() => {});
      
      const unsubscribeUnread = subscribeToAllIncomingMessages(user.id, (msgs) => {
        const counts: Record<string, number> = {};
        msgs.forEach(m => {
          const key = m.roomId.startsWith('SUPPORT_') ? 'SYSTEM' : m.senderId;
          counts[key] = (counts[key] || 0) + 1;
        });
        setUnreadCounts(counts);
      }, (err) => {
        console.debug("Unread count subscription restricted by rules");
      });
      
      return () => unsubscribeUnread();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setPermissionError(null);
    let unsubscribe: () => void = () => {};

    const handleError = (err: any) => {
      if (err.code === 'permission-denied') {
        setPermissionError("Access denied by security policy. Verification required.");
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
      markMessagesAsRead(roomId, user.id).catch(() => {});
      unsubscribe = subscribeToRoomMessages(roomId, (msgs) => {
        setMessages(msgs);
        // Instant update handled by state setter in callback
      }, handleError);
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
      alert("Support access request sent to administrator.");
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
      alert("An error occurred while sending the message.");
    } finally {
      setIsSending(false);
    }
  };

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
            <div ref={chatEndRef} />
         </div>
         
         <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-50 border-0 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              disabled={isSending || !!permissionError}
            />
            <button 
              type="submit" 
              disabled={isSending || !newMessage.trim() || !!permissionError}
              className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
         </form>
      </Card>
    </div>
  );

  if (activeView === 'system-chat') return renderChat("Live System Support", MessageSquare);
  if (activeView === 'private-chat' && selectedRecipient) return renderChat(`Chat with ${selectedRecipient.name}`, UserIcon);

  if (activeView === 'user-list') {
    const filteredUsers = allUsers.filter(u => 
      u.id !== user?.id && 
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase()))
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
              placeholder="Search hero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredUsers.map(u => (
              <div key={u.id} onClick={() => { setSelectedRecipient(u); setActiveView('private-chat'); }} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:shadow-md rounded-2xl cursor-pointer transition-all border border-transparent hover:border-blue-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-slate-300" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      {unreadCounts[u.id] > 0 && <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-sm">{unreadCounts[u.id]}</span>}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.bloodGroup}</p>
                  </div>
                </div>
                <ArrowRight className="text-slate-300 group-hover:text-blue-600" size={20} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const unreadTotal = Object.values(unreadCounts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-50 rounded-2xl"><LifeBuoy className="text-blue-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support & Resource Center</h1>
          <p className="text-sm text-slate-500 font-medium">Connect with verified donors or system administration.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => setActiveView('user-list')} className="cursor-pointer">
          <SupportLinkCard icon={BookOpen} title="Donor Messenger" description="Private chat with registered donors." color="blue" badge={unreadTotal} />
        </div>
        <div onClick={() => setActiveView('system-chat')} className="cursor-pointer">
          <SupportLinkCard icon={MessageSquare} title="System Support" description="Direct communication with staff." color="green" badge={unreadCounts['SYSTEM'] || 0} />
        </div>
        <SupportLinkCard icon={PhoneCall} title="Emergency Help" description="Critical emergency contact list." color="red" />
      </div>

      <Card className="p-8 border-0 shadow-lg">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><HelpCircle className="text-blue-600" size={24} /> Frequently Asked Questions</h3>
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <p className="font-bold text-slate-800 mb-2 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> How do I update my donation status?</p>
            <p className="text-xs text-slate-500 font-medium pl-6">After your donation request, an administrator will verify the record to mark it as completed.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const SupportLinkCard = ({ icon: Icon, title, description, color, badge }: any) => {
  const colors: any = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", red: "bg-red-50 text-red-600" };
  return (
    <Card className="p-6 hover:shadow-xl transition-all border-0 shadow-md group relative overflow-hidden h-full">
      {badge > 0 && <span className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-white animate-pulse">{badge}</span>}
      <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", colors[color])}><Icon size={24} /></div>
      <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
    </Card>
  );
};

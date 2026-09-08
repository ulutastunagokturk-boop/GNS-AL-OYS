import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Conversation, ChatMessage, UserProfile, UserRole } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Users, 
  User, 
  Plus, 
  CheckCheck, 
  Circle, 
  Paperclip, 
  Smile, 
  School, 
  Hash, 
  Sparkles,
  CheckCircle2,
  X,
  Phone,
  Video,
  Info
} from 'lucide-react';

export const ChatModule: React.FC = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'direct' | 'group'>('direct');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync data
  const loadChatData = () => {
    if (!currentUser) return;
    const convs = dataService.getConversations(currentUser.uid);
    setConversations(convs);

    if (convs.length > 0 && !selectedConvId) {
      setSelectedConvId(convs[0].id);
    }
  };

  useEffect(() => {
    loadChatData();
    const unsub = dataService.subscribe(() => {
      loadChatData();
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (selectedConvId) {
      const msgs = dataService.getMessages(selectedConvId);
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [selectedConvId, conversations]);

  const activeConversation = conversations.find(c => c.id === selectedConvId);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !selectedConvId || (!messageText.trim() && !attachmentName)) return;

    await dataService.sendMessage({
      conversationId: selectedConvId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      text: messageText.trim(),
      attachment: attachmentName ? {
        id: `att-${Date.now()}`,
        name: attachmentName,
        url: '#',
        size: '1.4 MB',
        type: 'pdf'
      } : undefined
    });

    setMessageText('');
    setAttachmentName(null);
  };

  const handleStartDirectChat = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    const conv = await dataService.createDirectConversation(currentUser.uid, targetUser.uid);
    setIsNewChatModalOpen(false);
    setSelectedConvId(conv.id);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newGroupName.trim()) return;

    const participants = Array.from(new Set([currentUser.uid, ...selectedParticipants]));
    const conv = await dataService.createGroupConversation(
      newGroupName.trim(),
      newGroupDesc.trim(),
      participants
    );

    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedParticipants([]);
    setIsNewChatModalOpen(false);
    setSelectedConvId(conv.id);
  };

  const allUsers = dataService.getUsers().filter(u => u.uid !== currentUser?.uid && u.status !== 'deactivated');
  
  // Filtered conversations
  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const matchName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLastMsg = c.lastMessage?.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchLastMsg;
  });

  // Get other participant in DM
  const getOtherParticipant = (conv: Conversation) => {
    if (conv.type === 'group') return null;
    const otherId = conv.participants.find(p => p !== currentUser?.uid);
    return dataService.getUserById(otherId || '');
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[580px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex overflow-hidden">
      
      {/* LEFT PANEL: Conversation List */}
      <div className="w-80 sm:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Mesajlar & Sohbet</h2>
            </div>
            <button
              id="new-chat-btn"
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
              title="Yeni Sohbet Başlat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sohbet veya kişi ara..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* List of Conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Sohbet bulunamadı. "Yeni" butonuna tıklayarak öğretmen veya öğrenci ile mesajlaşmaya başlayabilirsiniz.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              const isGroup = conv.type === 'group';
              const otherUser = getOtherParticipant(conv);
              const isOnline = isGroup ? false : otherUser?.isOnline;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shadow-xs ${
                      isGroup 
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white' 
                        : otherUser?.role === 'teacher'
                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        : otherUser?.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {isGroup ? <Users className="w-5 h-5" /> : (otherUser?.displayName.charAt(0) || 'U')}
                    </div>
                    {!isGroup && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`} title={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isGroup ? conv.name : (otherUser?.displayName || conv.name)}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {conv.lastMessage 
                        ? `${conv.lastMessage.senderName === currentUser?.displayName ? 'Siz: ' : ''}${conv.lastMessage.text}`
                        : (conv.description || 'Sohbet başlatıldı.')}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      {isGroup ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          <Hash className="w-2.5 h-2.5" />
                          Grup • {conv.participants.length} Üye
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-400">
                          {otherUser?.role === 'teacher' 
                            ? `${otherUser.branch} Öğretmeni` 
                            : otherUser?.role === 'student' 
                            ? `${otherUser.classGrade} • No: ${otherUser.schoolNumber}`
                            : 'Okul Müdürü'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT PANEL: Active Chat Box */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
        
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
              <div className="flex items-center gap-3 min-w-0">
                {activeConversation.type === 'group' ? (
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shadow-xs">
                      {getOtherParticipant(activeConversation)?.displayName.charAt(0) || 'U'}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      getOtherParticipant(activeConversation)?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeConversation.type === 'group' 
                      ? activeConversation.name 
                      : (getOtherParticipant(activeConversation)?.displayName || activeConversation.name)}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    {activeConversation.type === 'group' ? (
                      <span>{activeConversation.description || `${activeConversation.participants.length} katılımcı`}</span>
                    ) : (
                      <>
                        <span className={`w-2 h-2 rounded-full ${getOtherParticipant(activeConversation)?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>{getOtherParticipant(activeConversation)?.isOnline ? 'Şu an aktif' : 'Çevrimdışı'}</span>
                        <span>•</span>
                        <span>
                          {getOtherParticipant(activeConversation)?.role === 'teacher' 
                            ? `${getOtherParticipant(activeConversation)?.branch} Öğretmeni` 
                            : getOtherParticipant(activeConversation)?.role === 'student'
                            ? `${getOtherParticipant(activeConversation)?.classGrade} Şubesi`
                            : 'Yönetici'}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Uçtan Uca Şifreli Okul Hattı
                </span>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/20 dark:bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  Bu sohbet henüz yeni. İlk mesajı göndererek iletişime geçin.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.uid;

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {isMe ? 'Siz' : msg.senderName}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          msg.senderRole === 'teacher' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            : msg.senderRole === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        }`}>
                          {msg.senderRole === 'teacher' ? 'Öğretmen' : msg.senderRole === 'admin' ? 'Müdür' : 'Öğrenci'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className={`max-w-md sm:max-w-lg rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        <p>{msg.text}</p>
                        
                        {msg.attachment && (
                          <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 border text-[11px] ${
                            isMe 
                              ? 'bg-indigo-700/60 border-indigo-500 text-indigo-100' 
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}>
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-semibold truncate flex-1">{msg.attachment.name}</span>
                            <span className="text-[10px] opacity-75">{msg.attachment.size}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview if any */}
            {attachmentName && (
              <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="font-semibold">{attachmentName}</span>
                  <span className="text-[10px] text-indigo-500">(1.4 MB - Eklendi)</span>
                </div>
                <button onClick={() => setAttachmentName(null)} className="p-1 hover:text-rose-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttachmentName('Odev_Detaylari_Ek_Dokuman.pdf')}
                className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Dosya veya Ödev Ekle"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Bir mesaj yazın... (Enter ile gönder)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />

              <button
                type="submit"
                disabled={!messageText.trim() && !attachmentName}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-sm flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Sohbet Seçilmedi</h3>
            <p className="text-xs max-w-sm mt-1">
              Sol menüden bir grup veya kişi seçerek güvenli okul içi mesajlaşmayı başlatabilirsiniz.
            </p>
          </div>
        )}

      </div>

      {/* NEW CHAT / GROUP MODAL */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Yeni Sohbet Başlat</h3>
              </div>
              <button 
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch: Direct vs Group */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setNewChatTab('direct')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  newChatTab === 'direct' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bireysel Mesaj (Öğretmen / Öğrenci)
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab('group')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  newChatTab === 'group' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Yeni Grup Oluştur
              </button>
            </div>

            {newChatTab === 'direct' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Mesaj göndermek istediğiniz kullanıcıyı seçin:</p>
                <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {allUsers.map(user => (
                    <div
                      key={user.uid}
                      onClick={() => handleStartDirectChat(user)}
                      className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
                            {user.displayName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {user.role === 'teacher' 
                              ? `${user.branch} Öğretmeni` 
                              : user.role === 'student' 
                              ? `${user.classGrade} • No: ${user.schoolNumber}` 
                              : 'Okul Müdürü'}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.role === 'teacher' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950'
                      }`}>
                        Sohbet Et
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grup Adı</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Örn: 10-A Matematik Çalışma Grubu"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Örn: Ödev soru çözümleri ve duyurular"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Katılımcı Ekle ({selectedParticipants.length} Seçildi)</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {allUsers.map(user => {
                      const isChecked = selectedParticipants.includes(user.uid);
                      return (
                        <label 
                          key={user.uid}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, user.uid]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(id => id !== user.uid));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{user.displayName}</span>
                          <span className="text-[10px] text-slate-400">({user.role === 'teacher' ? user.branch : user.classGrade})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewChatModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                  >
                    Grubu Başlat
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

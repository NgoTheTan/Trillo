import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import axios from 'axios';
import { respondToInvitation, getPendingInvitations, type BoardInvitation } from '../services/boardServices';
import { InviteResponseModal } from './board/InviteResponseModal';
import toast from 'react-hot-toast';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [activeInvitation, setActiveInvitation] = useState<BoardInvitation | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(notifsRes.data);
      setUnreadCount(countRes.data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); 
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRespondInvitation = async (e: React.MouseEvent, notif: any, accept: boolean) => {
    e.stopPropagation();
    const invitationId = notif.referenceId;
    if (!invitationId) return;

    setRespondingId(notif.id);
    try {
      await respondToInvitation(invitationId, accept);
      await api.patch(`/notifications/${notif.id}/read`);
      await fetchNotifications();
      
      const boardId = notif.relatedBoardId;
      if (accept) {
        toast.success('Đã chấp nhận lời mời tham gia bảng!');
        setIsOpen(false);
        if (boardId) {
          navigate(`/app/boards/${boardId}`);
        }
      } else {
        toast.success('Đã từ chối lời mời');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lời mời không còn khả dụng!');
      await api.patch(`/notifications/${notif.id}/read`);
      fetchNotifications();
    } finally {
      setRespondingId(null);
    }
  };

  const handleMarkAsRead = async (notif: any) => {
    try {
      await api.patch(`/notifications/${notif.id}/read`);
      fetchNotifications();

      const boardId = notif.relatedBoardId || (notif.referenceType === 'BOARD' ? notif.referenceId : null);
      const cardId = notif.relatedTaskId || (notif.referenceType === 'CARD' ? notif.referenceId : null);

      if (notif.type === 'BOARD_INVITATION') {
        const invitationId = notif.referenceId;
        try {
          const pending = await getPendingInvitations();
          const found = pending.find(i => i.id === invitationId || i.boardId === boardId);
          if (found) {
            setActiveInvitation(found);
            setIsInviteModalOpen(true);
            setIsOpen(false);
          } else {
            toast.error('Lời mời này không còn khả dụng hoặc đã xử lý');
          }
        } catch {
          toast.error('Không thể tải thông tin lời mời');
        }
        return;
      }

      setIsOpen(false);

      if (notif.type === 'JOIN_REQUEST') {
        if (boardId) {
          navigate(`/app/boards/${boardId}?requestsTab=true`);
        } else {
          navigate('/app');
        }
        return;
      }

      if (notif.type === 'MEMBER_REMOVED') {
        navigate('/app');
        return;
      }

      if (cardId) {
        if (boardId) {
          navigate(`/app/boards/${boardId}?cardId=${cardId}`);
        } else {
          try {
            const cardRes = await api.get(`/cards/${cardId}`);
            if (cardRes.data && cardRes.data.boardId) {
              navigate(`/app/boards/${cardRes.data.boardId}?cardId=${cardId}`);
            } else {
              navigate('/app');
            }
          } catch {
            navigate('/app');
          }
        }
      } else if (boardId) {
        navigate(`/app/boards/${boardId}`);
      } else {
        navigate('/app');
      }
    } catch (error) {
      console.error("Mark read failed", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error("Mark all read failed", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative cursor-pointer">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-88 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 flex flex-col max-h-[85vh]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer">
                <CheckCircle2 size={14} /> Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs font-medium">
                <span className="text-3xl block mb-2">🔔</span>
                Không có thông báo nào!
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors flex gap-3 items-start my-0.5 ${
                    !notif.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'MEMBER_REMOVED' ? (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                        <X size={12} className="stroke-[3]" />
                      </div>
                    ) : notif.type === 'INVITATION_ACCEPTED' ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 size={13} />
                      </div>
                    ) : !notif.read ? (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-1.5"></div>
                    ) : (
                      <Check size={16} className="text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {notif.title && (
                      <p className={`text-xs ${!notif.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {notif.title}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                    
                    {/* Inline Invitation Action Buttons or Status Badges */}
                    {notif.type === 'BOARD_INVITATION' && (
                      notif.status === 'ACCEPTED' ? (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200/60">
                          <Check className="w-3 h-3" />
                          <span>Đã chấp nhận</span>
                        </div>
                      ) : notif.status === 'DECLINED' ? (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md w-fit border border-rose-200/60">
                          <X className="w-3 h-3" />
                          <span>Đã từ chối</span>
                        </div>
                      ) : !notif.read ? (
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            type="button"
                            disabled={respondingId === notif.id}
                            onClick={(e) => handleRespondInvitation(e, notif, true)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Chấp nhận</span>
                          </button>
                          <button
                            type="button"
                            disabled={respondingId === notif.id}
                            onClick={(e) => handleRespondInvitation(e, notif, false)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-200/60">
                          <span>Đang chờ phản hồi</span>
                        </div>
                      )
                    )}

                    {notif.type === 'JOIN_REQUEST' && (
                      notif.status === 'APPROVED' ? (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200/60">
                          <Check className="w-3 h-3" />
                          <span>Đã phê duyệt</span>
                        </div>
                      ) : notif.status === 'REJECTED' ? (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit border border-slate-200/60">
                          <X className="w-3 h-3" />
                          <span>Đã từ chối</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-200/60">
                          <span>Chờ duyệt yêu cầu</span>
                        </div>
                      )
                    )}

                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pop-up modal xác nhận lời mời khi nhấp thông báo */}
      <InviteResponseModal
        invitation={activeInvitation}
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />
    </div>
  );
}
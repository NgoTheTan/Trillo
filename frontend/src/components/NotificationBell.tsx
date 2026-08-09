import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

  const handleMarkAsRead = async (id: string, relatedTaskId?: string, relatedBoardId?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
      setIsOpen(false);
      if (relatedTaskId) navigate(`/app/tasks/${relatedTaskId}`);
      else if (relatedBoardId) navigate(`/app/boards/${relatedBoardId}`);
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
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <CheckCircle2 size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {notifications.length === 0 ? (
              <div className="text-center p-6 text-slate-500">
                <span className="text-4xl block mb-2">🔔</span>
                You're all caught up!
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} onClick={() => handleMarkAsRead(notif.id, notif.relatedTaskId, notif.relatedBoardId)} className={`p-3 mb-1 rounded-lg cursor-pointer transition-colors flex gap-3 items-start ${!notif.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <div className="mt-1 text-blue-500">
                    {!notif.read ? <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div> : <Check size={16} className="text-slate-300" />}
                  </div>
                  <div>
                    <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
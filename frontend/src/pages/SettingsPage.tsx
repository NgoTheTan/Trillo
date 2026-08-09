import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAppearance } from '../context/AppearanceContext';
import { Monitor, Moon, Sun, Eye, EyeOff, LogOut, MonitorSmartphone, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PasswordChecklist, defaultPasswordRules } from '../components/common/PasswordChecklist';

// Axios instance
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook Appearance
  const { theme, setTheme, accentColor, setAccentColor, saveSettings, resetToDefault, isSaving: isAppSaving } = useAppearance();

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Data
  const [originalProfile, setOriginalProfile] = useState<any>(null);
  const [profile, setProfile] = useState({ displayName: '', username: '', email: '', phone: '', avatarUrl: '' });
  
  // Notification Settings Data
  const [notiSettings, setNotiSettings] = useState({
    taskAssigned: true, taskDueSoon: true, taskOverdue: true,
    comments: true, mentions: true, boardInvites: true
  });

  // SECURITY STATES
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');

  useEffect(() => {
    fetchData();
    // Phân tích thông tin thiết bị (Browser & OS)
    const ua = navigator.userAgent;
    let browser = "Trình duyệt khác";
    let os = "Hệ điều hành khác";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("like Mac")) os = "iOS";
    setDeviceInfo(`${browser} · ${os}`);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    // 1. Fetch Profile
    try {
      const profileRes = await api.get('/users/me');
      setProfile(profileRes.data);
      setOriginalProfile(profileRes.data);
    } catch (err) {
      console.error("Profile API Error:", err);
      setError("Không thể tải thông tin người dùng.");
    }

    // 2. Fetch Notification Settings
    try {
      const notiRes = await api.get('/notifications/settings');
      if (notiRes.data) {
        setNotiSettings(notiRes.data);
      }
    } catch (err) {
      console.error("Notification Settings API Error:", err);
      setError("Không thể tải cài đặt thông báo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.displayName?.trim() || !profile.username?.trim()) {
      setError("Tên hiển thị và Tên đăng nhập không được để trống!");
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const res = await api.put('/users/me', {
        displayName: profile.displayName,
        username: profile.username,
        phone: profile.phone
      });
      setOriginalProfile(res.data);
      setSuccessMsg("Cập nhật thông tin thành công!");
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data }));
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi lưu thông tin.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCancelProfile = () => {
    if (originalProfile) setProfile(originalProfile);
    setError(null);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước ảnh tối đa là 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsSaving(true);
      const res = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(res.data);
      setOriginalProfile(res.data);
      setSuccessMsg("Cập nhật ảnh đại diện thành công!");
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data }));
    } catch (err) {
      setError("Lỗi khi tải lên ảnh đại diện.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await api.put('/notifications/settings', notiSettings);
      setSuccessMsg("Đã lưu cài đặt thông báo!");
    } catch (err) {
      setError("Lỗi khi lưu cài đặt thông báo.");
      console.error(err);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async () => {
    setError(null);
    setSuccessMsg(null);
    
    if (!security.currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    const isAllRulesMet = defaultPasswordRules.every(rule => rule.test(security.newPassword));
    if (!isAllRulesMet) {
      setError("Mật khẩu mới chưa đáp ứng đầy đủ các yêu cầu bảo mật.");
      return;
    }
    if (security.newPassword === security.currentPassword) {
      setError("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    try {
      setIsSaving(true);
      await api.put('/users/me/password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword
      });
      setSuccessMsg("Đổi mật khẩu thành công!");
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Đổi mật khẩu thất bại. Mật khẩu hiện tại có thể không đúng.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Đăng xuất toàn bộ thiết bị
  const handleLogoutAll = async () => {
    try {
      await api.post('/users/me/logout-all').catch(() => {}); 
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const tabs = [
    { id: 'account', label: 'Tài khoản / Hồ sơ' },
    { id: 'appearance', label: 'Giao diện' },
    { id: 'notifications', label: 'Thông báo' },
    { id: 'security', label: 'Bảo mật' }
  ];

  if (isLoading) return <div className="p-8 text-center text-slate-500">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[75vh]">
      {/* Sidebar Menu */}
      <div className="w-1/4 border-r border-slate-200 p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">Cài đặt</h2>
        <ul className="space-y-1">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => { setActiveTab(tab.id); setError(null); setSuccessMsg(null); }}
                className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Content Area */}
      <div className="w-3/4 p-8 overflow-y-auto relative">
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 font-medium">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg border border-green-200 font-medium">{successMsg}</div>}

        {/* 1. Account / Profile */}
        {activeTab === 'account' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Thông tin cá nhân</h3>
            
            <div className="flex items-center space-x-4 mb-4">
              {profile.avatarUrl ? (
                <img src={`http://localhost:8080${profile.avatarUrl}`} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">
                  {profile.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/png, image/jpeg, image/jpg" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isSaving} className="text-sm text-blue-600 font-medium border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                {isSaving ? 'Đang tải lên...' : 'Đổi ảnh đại diện'}
              </button>
            </div>

            <div><label className="block text-sm font-medium mb-1 text-slate-700">Tên hiển thị *</label>
              <input type="text" value={profile.displayName || ''} onChange={(e) => setProfile({...profile, displayName: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Tên đăng nhập *</label>
              <input type="text" value={profile.username || ''} onChange={(e) => setProfile({...profile, username: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
              <input type="email" value={profile.email || ''} disabled className="w-full border rounded-lg p-2 bg-slate-100 text-slate-500 cursor-not-allowed" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Số điện thoại</label>
              <input type="text" value={profile.phone || ''} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>

            <div className="pt-4 flex space-x-3">
              <button onClick={handleSaveProfile} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 min-w-[120px]">
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button onClick={handleCancelProfile} disabled={isSaving} className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50">
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* 2. Appearance Settings */}
        {activeTab === 'appearance' && (
          <div className="space-y-8 max-w-2xl animate-fade-in">
            <div>
              <h3 className="text-xl font-bold mb-1 text-slate-800">Chế độ giao diện</h3>
              <p className="text-sm text-slate-500 mb-4">Tùy chỉnh phong cách giao diện không gian làm việc của bạn.</p>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light', icon: Sun, label: 'Sáng' },
                  { id: 'dark', icon: Moon, label: 'Tối' },
                  { id: 'system', icon: Monitor, label: 'Theo hệ thống' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                      theme === t.id ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <t.icon size={24} className="mb-2" />
                    <span className="font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-xl font-bold mb-1 text-slate-800">Màu chủ đạo</h3>
              <p className="text-sm text-slate-500 mb-4">Chọn màu sắc chính cho các nút bấm và điểm nhấn.</p>
              
              <div className="flex gap-4">
                {[
                  { id: 'blue', hex: '#2563eb' },
                  { id: 'purple', hex: '#9333ea' },
                  { id: 'green', hex: '#16a34a' },
                  { id: 'orange', hex: '#ea580c' },
                  { id: 'red', hex: '#dc2626' }
                ].map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setAccentColor(color.id as any)}
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${
                      accentColor === color.id ? 'border-blue-200 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {accentColor === color.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 flex justify-between items-center border-t border-slate-100">
              <button 
                onClick={resetToDefault} 
                disabled={isAppSaving}
                className="text-slate-500 hover:text-slate-800 font-medium underline"
              >
                Khôi phục mặc định
              </button>
              <button 
                onClick={async () => {
                   await saveSettings();
                   setSuccessMsg("Đã lưu cài đặt giao diện!");
                   setTimeout(() => setSuccessMsg(null), 3000);
                }} 
                disabled={isAppSaving} 
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
              >
                {isAppSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}

        {/* 3. Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Cài đặt thông báo</h3>
            <div className="space-y-3">
              {[
                { key: 'taskAssigned', label: 'Công việc được giao cho tôi' },
                { key: 'taskDueSoon', label: 'Công việc sắp đến hạn' },
                { key: 'taskOverdue', label: 'Công việc quá hạn' },
                { key: 'comments', label: 'Bình luận trong công việc' },
                { key: 'mentions', label: 'Nhắc đến (Mention) tôi' },
                { key: 'boardInvites', label: 'Lời mời tham gia bảng' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <input 
                    type="checkbox" 
                    checked={(notiSettings as any)[item.key] ?? true} 
                    onChange={(e) => setNotiSettings({...notiSettings, [item.key]: e.target.checked})} 
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer" 
                  />
                </label>
              ))}
            </div>
            <div className="pt-4 flex space-x-3">
              <button onClick={handleSaveNotifications} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 min-w-[120px]">
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}

        {/* 4. Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-10 max-w-2xl animate-fade-in">
            {/* Section 1: Password */}
            <section>
              <h3 className="text-xl font-bold mb-1 text-slate-800">Mật khẩu</h3>
              <p className="text-sm text-slate-500 mb-5">Thay đổi mật khẩu thường xuyên để bảo vệ tài khoản của bạn.</p>
              
              <div className="space-y-4 max-w-md p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Mật khẩu hiện tại *</label>
                  <div className="relative">
                    <input type={showCurrent ? "text" : "password"} value={security.currentPassword} onChange={(e) => setSecurity({...security, currentPassword: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-blue-500 bg-white" placeholder="Nhập mật khẩu hiện tại" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Mật khẩu mới *</label>
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} value={security.newPassword} onChange={(e) => setSecurity({...security, newPassword: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-blue-500 bg-white" placeholder="Tối thiểu 6 ký tự" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Xác nhận mật khẩu mới *</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={security.confirmPassword} onChange={(e) => setSecurity({...security, confirmPassword: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 outline-blue-500 bg-white" placeholder="Nhập lại mật khẩu mới" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button onClick={handleChangePassword} disabled={isSaving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto">
                    {isSaving ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Section 2: Active Sessions */}
            <section>
              <h3 className="text-xl font-bold mb-1 text-slate-800">Phiên đăng nhập</h3>
              <p className="text-sm text-slate-500 mb-5">Các thiết bị hiện đang đăng nhập vào tài khoản của bạn.</p>
              
              <div className="flex items-start gap-4 p-4 border border-blue-100 bg-blue-50 rounded-xl mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <MonitorSmartphone size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Thiết bị hiện tại</p>
                  <p className="text-sm text-slate-600">{deviceInfo}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">● Đang hoạt động</p>
                </div>
              </div>

              <div className="p-4 border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Thiết bị khác</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Trillo sử dụng xác thực JWT, bạn có thể đăng xuất khỏi tất cả các thiết bị bất cứ lúc nào bằng nút bên dưới.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Section 3: Danger Zone */}
            <section>
              <h3 className="text-xl font-bold mb-1 text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} /> Vùng nguy hiểm
              </h3>
              <p className="text-sm text-slate-500 mb-5">Đăng xuất tài khoản khỏi mọi thiết bị.</p>
              
              {!showLogoutConfirm ? (
                <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-5 py-2.5 rounded-lg font-medium transition-colors">
                  <LogOut size={18} /> Đăng xuất khỏi mọi thiết bị
                </button>
              ) : (
                <div className="p-4 border border-red-200 bg-red-50 rounded-xl animate-fade-in">
                  <p className="font-medium text-red-800 mb-3">Bạn có chắc chắn muốn đăng xuất khỏi TẤT CẢ các thiết bị không?</p>
                  <div className="flex gap-3">
                    <button onClick={handleLogoutAll} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700">Đồng ý, đăng xuất</button>
                    <button onClick={() => setShowLogoutConfirm(false)} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50">Hủy</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
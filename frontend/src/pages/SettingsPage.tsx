import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Cấu hình Axios dùng chung
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Data
  const [originalProfile, setOriginalProfile] = useState<any>(null);
  const [profile, setProfile] = useState({ displayName: '', username: '', email: '', phone: '', avatarUrl: '' });
  
  // Password Data
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // 1. FETCH DATA KHỞI TẠO
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users/me');
      setProfile(res.data);
      setOriginalProfile(res.data); // Lưu bản gốc để Cancel
    } catch (err) {
      setError("Không thể tải thông tin người dùng.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. LƯU PROFILE (TÊN, USERNAME, PHONE)
  const handleSaveProfile = async () => {
    if (!profile.displayName.trim() || !profile.username.trim()) {
      setError("Tên hiển thị và Username không được để trống!");
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
      
      // Trigger event để Header (AppShell) cập nhật Avatar/Tên ngay lập tức
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: res.data }));
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi lưu thông tin.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // 3. CANCEL PROFILE
  const handleCancelProfile = () => {
    if (originalProfile) setProfile(originalProfile);
    setError(null);
  };

  // 4. ĐỔI AVATAR (UPLOAD FILE THẬT)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // Limit 5MB
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
      setError("Lỗi khi upload ảnh.");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. ĐỔI MẬT KHẨU
  const handleChangePassword = async () => {
    setError(null);
    if (!security.currentPassword || !security.newPassword) {
      setError("Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp!");
      return;
    }
    if (security.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const tabs = [
    { id: 'account', label: 'Tài khoản / Hồ sơ' },
    { id: 'security', label: 'Bảo mật' }
  ];

  if (isLoading) return <div className="p-8 text-center">⏳ Đang tải dữ liệu...</div>;

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
        
        {/* Thông báo Toasts */}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg border border-green-200">{successMsg}</div>}

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
                {isSaving ? 'Đang tải lên...' : 'Đổi Avatar'}
              </button>
            </div>

            <div><label className="block text-sm font-medium mb-1 text-slate-700">Tên hiển thị *</label>
              <input type="text" value={profile.displayName} onChange={(e) => setProfile({...profile, displayName: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Username *</label>
              <input type="text" value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Email (Không thể đổi)</label>
              <input type="email" value={profile.email} disabled className="w-full border rounded-lg p-2 bg-slate-100 text-slate-500 cursor-not-allowed" /></div>
            
            <div><label className="block text-sm font-medium mb-1 text-slate-700">Số điện thoại</label>
              <input type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>

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

        {/* 2. Security / Password */}
        {activeTab === 'security' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Đổi mật khẩu</h3>
            <div><label className="block text-sm font-medium mb-1">Mật khẩu hiện tại *</label>
              <input type="password" value={security.currentPassword} onChange={(e) => setSecurity({...security, currentPassword: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1">Mật khẩu mới * (Tối thiểu 6 ký tự)</label>
              <input type="password" value={security.newPassword} onChange={(e) => setSecurity({...security, newPassword: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div><label className="block text-sm font-medium mb-1">Xác nhận mật khẩu mới *</label>
              <input type="password" value={security.confirmPassword} onChange={(e) => setSecurity({...security, confirmPassword: e.target.value})} className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            
            <div className="pt-4 flex space-x-3">
              <button onClick={handleChangePassword} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 min-w-[150px]">
                {isSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
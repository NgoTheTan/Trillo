import { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account / Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'security', label: 'Security' },
    { id: 'preferences', label: 'Preferences' },
  ];

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[75vh]">
      {/* Sidebar Menu */}
      <div className="w-1/4 border-r border-slate-200 p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">Settings</h2>
        <ul className="space-y-1">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Content Area */}
      <div className="w-3/4 p-8 overflow-y-auto">
        
        {/* 1. Account / Profile */}
        {activeTab === 'account' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Thông tin cá nhân</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">M</div>
              <button className="text-sm text-blue-600 font-medium border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50">Đổi Avatar</button>
            </div>
            <div><label className="block text-sm font-medium mb-1">Tên hiển thị</label><input type="text" className="w-full border rounded-lg p-2 outline-blue-500" placeholder="Nguyễn Văn A" /></div>
            <div><label className="block text-sm font-medium mb-1">Username</label><input type="text" className="w-full border rounded-lg p-2 outline-blue-500" placeholder="nguyenvana" /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full border rounded-lg p-2 bg-slate-50" disabled value="email@example.com" /></div>
            <div><label className="block text-sm font-medium mb-1">Số điện thoại</label><input type="text" className="w-full border rounded-lg p-2 outline-blue-500" placeholder="0123456789" /></div>
            <div className="pt-4"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Save changes</button></div>
          </div>
        )}

        {/* 2. Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Cài đặt thông báo</h3>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700">Thông báo trong ứng dụng</h4>
              {['Task được giao cho mình', 'Task sắp đến hạn', 'Task quá hạn', 'Có người comment vào task', 'Có người mention mình', 'Board có thay đổi'].map((item, i) => (
                <label key={i} className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-slate-700">{item}</span>
                </label>
              ))}
            </div>

            <hr className="border-slate-200" />
            
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700">Kênh thông báo</h4>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Email notifications</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700">Push notifications</span>
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
              </label>
            </div>
            <div className="pt-2"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Save changes</button></div>
          </div>
        )}

        {/* 3. Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Giao diện</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Giao diện (Theme)</label>
              <select className="w-full border rounded-lg p-2 outline-blue-500">
                <option>System default</option>
                <option>Light mode</option>
                <option>Dark mode</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ngôn ngữ hiển thị (App Language)</label>
              <select className="w-full border rounded-lg p-2 outline-blue-500">
                <option>Tiếng Việt</option>
                <option>English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Accent Color (Màu chủ đạo)</label>
              <div className="flex space-x-3">
                {['bg-blue-600', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'].map((color, i) => (
                  <button key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white ring-2 ${i === 0 ? 'ring-blue-600' : 'ring-transparent'}`}></button>
                ))}
              </div>
            </div>
            <div className="pt-4"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Save changes</button></div>
          </div>
        )}

        {/* 4. Security */}
        {activeTab === 'security' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Bảo mật</h3>
            <div><label className="block text-sm font-medium mb-1">Mật khẩu hiện tại</label><input type="password" className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            <div><label className="block text-sm font-medium mb-1">Mật khẩu mới</label><input type="password" className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            <div><label className="block text-sm font-medium mb-1">Xác nhận mật khẩu mới</label><input type="password" className="w-full border rounded-lg p-2 outline-blue-500" /></div>
            <div className="pt-4"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Change password</button></div>
          </div>
        )}

        {/* 5. Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Tùy chỉnh Task Manager</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngôn ngữ Data</label>
                <select className="w-full border rounded-lg p-2 outline-blue-500"><option>Tiếng Việt</option><option>English</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Múi giờ</label>
                <select className="w-full border rounded-lg p-2 outline-blue-500"><option>(UTC+07:00) Bangkok, Hanoi, Jakarta</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Định dạng ngày</label>
                <select className="w-full border rounded-lg p-2 outline-blue-500"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu tuần</label>
                <select className="w-full border rounded-lg p-2 outline-blue-500"><option>Thứ Hai (Monday)</option><option>Chủ Nhật (Sunday)</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default View</label>
                <select className="w-full border rounded-lg p-2 outline-blue-500"><option>Board</option><option>List</option><option>Calendar</option></select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-slate-700 font-medium">Hiển thị task đã hoàn thành (Show completed tasks)</span>
              </label>
            </div>
            
            <div className="pt-4"><button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Save changes</button></div>
          </div>
        )}

      </div>
    </div>
  );
}
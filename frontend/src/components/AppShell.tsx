import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Calendar, LogOut, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { getInitials } from '../auth/authStorage'
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell'; // <-- Thêm dòng Import này

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [headerUser, setHeaderUser] = useState({
    displayName: user?.fullName || 'User',
    avatarUrl: null
  });

  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      const updatedData = event.detail;
      setHeaderUser({
        displayName: updatedData.displayName,
        avatarUrl: updatedData.avatarUrl
      });
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="brand-mark" to="/app">
          <span className="brand-mark__icon">T</span>
          <span>Trillo</span>
        </Link>
        <div className="app-topbar__actions">
          <span className="role-pill">
            <ShieldCheck size={16} />
            {user?.role === 'PM' ? 'Không gian PM' : 'Không gian thành viên'}
          </span>
          
          <NotificationBell />

          <span className="status-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerUser.avatarUrl ? (
              <img 
                src={`http://localhost:8080${headerUser.avatarUrl}`} 
                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                alt="Avatar" 
              />
            ) : (
              <Users size={16} />
            )}
            {headerUser.displayName}
          </span>

          <button type="button" className="ghost-button" onClick={handleLogout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          <div className="panel">
            <p className="panel__title">Xin chào, {user?.fullName}</p>
            <p className="panel__subtitle">
              Bạn đang đăng nhập với vai trò {user?.role}. Quyền truy cập các trang được bảo vệ theo vai trò của bạn.
            </p>

            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-card__value">12</p>
                <p className="stat-card__label">Nhiệm vụ đang hoạt động</p>
              </article>
              <article className="stat-card">
                <p className="stat-card__value">5</p>
                <p className="stat-card__label">Đang xem xét</p>
              </article>
              <article className="stat-card">
                <p className="stat-card__value">2</p>
                <p className="stat-card__label">Mục bị chặn</p>
              </article>
            </div>
            
            <div className="task-list">
              <div className="task-item">
                <div>
                  <p className="task-item__title">Tổng quan bảng PM</p>
                  <p className="task-item__meta">Chỉ vai trò PM mới có thể truy cập kế hoạch và phê duyệt.</p>
                </div>
                <span className="task-item__badge task-item__badge--pm">Chỉ PM</span>
              </div>
              <div className="task-item">
                <div>
                  <p className="task-item__title">Không gian làm việc nhóm</p>
                  <p className="task-item__meta">Vai trò User bao gồm Dev, Tester, Designer và các cộng tác viên khác.</p>
                </div>
                <span className="task-item__badge task-item__badge--user">Thành viên</span>
              </div>
              <div className="task-item">
                <div>
                  <p className="task-item__title">Trang bảo mật</p>
                  <p className="task-item__meta">Người dùng chưa đăng nhập sẽ được chuyển hướng sang trang đăng nhập.</p>
                </div>
                <span className="task-item__badge task-item__badge--secure">Bảo vệ</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Hồ sơ hiện tại</p>
            <p className="panel__subtitle">
              Phiên này được xác thực bởi backend và lưu cục bộ để tải lại.
            </p>

            <div className="sample-accounts">
              <div className="sample-account">
                <p className="sample-account__title">{getInitials(user?.fullName ?? 'Trillo')}</p>
                <p className="sample-account__meta">{user?.email}</p>
              </div>
              <div className="sample-account">
                <p className="sample-account__title">Vai trò</p>
                <p className="sample-account__meta">
                  {user?.role === 'PM'
                    ? 'PM có thể truy cập kế hoạch, phê duyệt và các trang nhạy cảm.'
                    : 'Thành viên có thể truy cập các trang thực thi và cộng tác.'}
                </p>
              </div>
            </div>

            <div className="divider" style={{ marginTop: '24px' }}>
              Trillo sẵn sàng
            </div>

            <div className="form-actions" style={{ marginTop: '18px' }}>
              <NavLink className="secondary-button" to="/app/team">
                Khu vực nhóm
              </NavLink>
              <NavLink className="secondary-button" to="/app/pm">
                Khu vực PM
              </NavLink>
            </div>
          </div>
        </div>
        
        <NavLink to="/app/schedule">
          <div>
            <Calendar />
            <span>Lịch biểu</span>
          </div>
        </NavLink>
        
        <NavLink to="/app/settings">
          <div>
            <span>Cài đặt</span>
          </div>
        </NavLink>
        
        <Outlet />
      </main>
    </div>
  )
}
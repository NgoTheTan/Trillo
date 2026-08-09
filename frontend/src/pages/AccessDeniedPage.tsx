import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return (
    <div className="access-denied">
      <div className="access-denied__card">
        <div className="role-pill" style={{ justifyContent: 'center', marginBottom: '18px' }}>
          <AlertTriangle size={16} />
          Truy cập bị hạn chế
        </div>
        <h1 className="auth-card__title" style={{ marginBottom: '12px' }}>
          Bạn không có quyền truy cập trang này.
        </h1>
        <p className="auth-card__subtitle">
          Tài khoản hiện tại đã đăng nhập, nhưng vai trò được chọn không thể mở không gian làm việc này.
        </p>

        <div className="form-actions" style={{ marginTop: '24px' }}>
          <Link to="/app" className="secondary-button">
            <ArrowLeft size={16} />
            Về trang chủ
          </Link>
          <Link to="/login" className="secondary-button">
            Chuyển tài khoản
          </Link>
        </div>
      </div>
    </div>
  )
}
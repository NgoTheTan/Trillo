import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/authContext'
import { AuthLayout } from './AuthLayout'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  const fromPath = (location.state as { from?: string } | null)?.from ?? '/app'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login({ email: values.email, password: values.password })
      toast.success('Đăng nhập thành công')
      navigate(fromPath, { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng nhập')
    }
  })

  return (
    <AuthLayout
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để tiếp tục quản lý dự án của bạn trong Trillo."
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Email</span>
          <div className="input-wrap">
            <Mail className="input-icon" size={18} />
            <input
              className={`input${errors.email ? ' input--error' : ''}`}
              type="email"
              placeholder="pm@trillo.app"
              {...register('email')}
            />
          </div>
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>

        <div className="stack">
          <div className="field-row">
            <label>Mật khẩu</label>
            <Link to="/register">Tạo tài khoản</Link>
          </div>
          <div className="input-wrap">
            <Lock className="input-icon" size={18} />
            <input
              className={`input${errors.password ? ' input--error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
        </div>

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </AuthLayout>
  )
}
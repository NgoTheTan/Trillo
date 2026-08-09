import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/authContext'
import { AuthLayout } from './AuthLayout'
import { PasswordChecklist } from '../components/common/PasswordChecklist'
import type { Role } from '../auth/authStorage'

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên là bắt buộc'),
    email: z.string().trim().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .refine((password) => /[a-z]/.test(password), 'Mật khẩu phải có ít nhất một chữ cái thường')
      .refine((password) => /[A-Z]/.test(password), 'Mật khẩu phải có ít nhất một chữ cái in hoa')
      .refine((password) => /\d/.test(password), 'Mật khẩu phải có ít nhất một chữ số')
      .refine(
        (password) => /[^a-zA-Z0-9]/.test(password),
        'Mật khẩu phải có ít nhất một ký tự đặc biệt'
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    role: z.enum(['PM', 'User']),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu không khớp',
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { register: createAccount } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const passwordValue = watch('password')

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role as Role,
      })
      toast.success('Tạo tài khoản thành công. Giờ bạn có thể đăng nhập.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo tài khoản')
    }
  })

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Tham gia Trillo để quản lý dự án theo phân vai."
      compact
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Họ và tên</span>
          <div className="input-wrap">
            <User className="input-icon" size={18} />
            <input
              className={`input${errors.fullName ? ' input--error' : ''}`}
              type="text"
              placeholder="Nguyễn Văn A"
              {...register('fullName')}
            />
          </div>
          {errors.fullName ? <span className="field-error">{errors.fullName.message}</span> : null}
        </label>

        <label className="field">
          <span>Email</span>
          <div className="input-wrap">
            <Mail className="input-icon" size={18} />
            <input
              className={`input${errors.email ? ' input--error' : ''}`}
              type="email"
              placeholder="ten@congty.com"
              {...register('email')}
            />
          </div>
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>

        <div className="field-row">
          <label style={{ flex: 1 }}>
            <span>Mật khẩu</span>
            <div className="input-wrap" style={{ marginTop: '10px' }}>
              <Lock className="input-icon" size={18} />
              <input
                className={`input${errors.password ? ' input--error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Ít nhất 8 ký tự"
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
          </label>

          <label style={{ flex: 1 }}>
            <span>Xác nhận mật khẩu</span>
            <div className="input-wrap" style={{ marginTop: '10px' }}>
              <Lock className="input-icon" size={18} />
              <input
                className={`input${errors.confirmPassword ? ' input--error' : ''}`}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <span className="field-error">{errors.confirmPassword.message}</span>
            ) : null}
          </label>
        </div>

        <PasswordChecklist password={passwordValue} />

        <div className="stack">
          <span>Loại tài khoản</span>
          <div className="radio-group">
            <label className="radio-card">
              <input type="radio" value="PM" {...register('role')} />
              <span className="radio-card__surface">
                <span className="radio-card__title">PM</span>
                <span className="radio-card__description">
                  Quản lý dự án, phê duyệt và quyền truy cập cao.
                </span>
              </span>
            </label>
            <label className="radio-card">
              <input type="radio" value="User" {...register('role')} />
              <span className="radio-card__surface">
                <span className="radio-card__title">User</span>
                <span className="radio-card__description">
                  Lập trình viên, kiểm thử, thiết kế và cộng tác viên.
                </span>
              </span>
            </label>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>

        <div className="account-switch">
          <span>Đã có tài khoản?</span>
          <Link to="/login">Đăng nhập</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/authContext'
import { AuthLayout } from './AuthLayout'
import type { Role } from '../auth/authStorage'

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Email is invalid'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['PM', 'User']),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
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
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role as Role,
      })
      toast.success('Tạo tài khoản thành công')
      navigate('/app', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo tài khoản')
    }
  })

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Trillo to manage projects with role-based access."
      compact
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Full Name</span>
          <div className="input-wrap">
            <User className="input-icon" size={18} />
            <input
              className={`input${errors.fullName ? ' input--error' : ''}`}
              type="text"
              placeholder="Jane Doe"
              {...register('fullName')}
            />
          </div>
          {errors.fullName ? <span className="field-error">{errors.fullName.message}</span> : null}
        </label>

        <label className="field">
          <span>Email Address</span>
          <div className="input-wrap">
            <Mail className="input-icon" size={18} />
            <input
              className={`input${errors.email ? ' input--error' : ''}`}
              type="email"
              placeholder="jane@company.com"
              {...register('email')}
            />
          </div>
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </label>

        <div className="field-row">
          <label style={{ flex: 1 }}>
            <span>Password</span>
            <div className="input-wrap" style={{ marginTop: '10px' }}>
              <Lock className="input-icon" size={18} />
              <input
                className={`input${errors.password ? ' input--error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                {...register('password')}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
          </label>

          <label style={{ flex: 1 }}>
            <span>Confirm Password</span>
            <div className="input-wrap" style={{ marginTop: '10px' }}>
              <Lock className="input-icon" size={18} />
              <input
                className={`input${errors.confirmPassword ? ' input--error' : ''}`}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword ? (
              <span className="field-error">{errors.confirmPassword.message}</span>
            ) : null}
          </label>
        </div>

        <div className="stack">
          <span>Account Type</span>
          <div className="radio-group">
            <label className="radio-card">
              <input type="radio" value="PM" {...register('role')} />
              <span className="radio-card__surface">
                <span className="radio-card__title">PM</span>
                <span className="radio-card__description">
                  Project owner, approvals, and sensitive routes.
                </span>
              </span>
            </label>
            <label className="radio-card">
              <input type="radio" value="User" {...register('role')} />
              <span className="radio-card__surface">
                <span className="radio-card__title">User</span>
                <span className="radio-card__description">
                  Dev, Tester, Designer, and other contributors.
                </span>
              </span>
            </label>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>

        <div className="account-switch">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
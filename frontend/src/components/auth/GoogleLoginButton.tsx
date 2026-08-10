import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => Promise<void>
  disabled?: boolean
  buttonText?: string
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            locale?: string
          }) => void
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: number | string
              locale?: string
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  disabled = false,
  buttonText = 'Đăng nhập với Google',
  text = 'signin_with',
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const googleBtnContainerRef = useRef<HTMLDivElement>(null)
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''

  useEffect(() => {
    if (!clientId) return

    const loadGoogleScript = () => {
      if (document.getElementById('google-jssdk')) {
        initializeGoogle()
        return
      }

      const script = document.createElement('script')
      script.id = 'google-jssdk'
      script.src = 'https://accounts.google.com/gsi/client?hl=vi'
      script.async = true
      script.defer = true
      script.onload = () => {
        initializeGoogle()
      }
      document.head.appendChild(script)
    }

    const initializeGoogle = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          locale: 'vi',
          callback: async (response) => {
            if (response.credential) {
              try {
                setIsLoading(true)
                await onSuccess(response.credential)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Đăng nhập Google thất bại')
              } finally {
                setIsLoading(false)
              }
            }
          },
        })

        // Render official button if container exists
        googleBtnContainerRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: text,
          shape: 'rectangular',
          width: '100%',
          locale: 'vi',
        })
      }
    }

    loadGoogleScript()
  }, [clientId, onSuccess])

  const handleClickFallback = async () => {
    if (!clientId) {
      toast(
        (t) => (
          <div className="text-xs">
            <p className="font-bold text-slate-800 mb-1">Chưa cấu hình Google Client ID</p>
            <p className="text-slate-600 mb-2">
              Vui lòng thêm <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">VITE_GOOGLE_CLIENT_ID</code> vào file <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> hoặc cấu hình trong backend.
            </p>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2 py-1 bg-slate-200 text-slate-700 text-[11px] font-semibold rounded"
            >
              Đóng
            </button>
          </div>
        ),
        { duration: 6000 }
      )
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }

  return (
    <div className="w-full space-y-2">
      {/* Official Google GSI Render Container if Client ID is active */}
      {clientId ? (
        <div ref={googleBtnContainerRef} className="w-full min-h-[40px] flex justify-center" />
      ) : (
        <button
          type="button"
          onClick={handleClickFallback}
          disabled={disabled || isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {/* Official Google 'G' SVG Logo */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isLoading ? 'Đang xác thực Google...' : buttonText}</span>
        </button>
      )}
    </div>
  )
}

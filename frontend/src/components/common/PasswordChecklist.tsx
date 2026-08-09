import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

export interface PasswordRule {
    id: string
    label: string
    test: (password: string) => boolean
}

export const defaultPasswordRules: PasswordRule[] = [
    { id: 'min8', label: 'Tối thiểu 8 ký tự', test: (pw) => pw.length >= 8 },
    { id: 'lowercase', label: 'Ít nhất 1 chữ cái thường (a-z)', test: (pw) => /[a-z]/.test(pw) },
    { id: 'uppercase', label: 'Ít nhất 1 chữ cái in hoa (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
    { id: 'number', label: 'Ít nhất 1 chữ số (0-9)', test: (pw) => /\d/.test(pw) },
    { id: 'special', label: 'Ít nhất 1 ký tự đặc biệt (!@#$%...)', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
]

interface PasswordChecklistProps {
    password?: string
    rules?: PasswordRule[]
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
    password = '',
    rules = defaultPasswordRules
}) => {
    return (
        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
            <p className="font-semibold text-slate-700 mb-1.5">Yêu cầu mật khẩu:</p>
            {rules.map((rule) => {
                const isMet = rule.test(password)
                return (
                    <div key={rule.id} className="flex items-center gap-2 transition-colors">
                        {isMet ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/15 shrink-0" />
                        ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={isMet ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                            {rule.label}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

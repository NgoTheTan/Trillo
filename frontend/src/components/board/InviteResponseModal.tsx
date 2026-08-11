import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import { Users, Check, X, Loader2 } from 'lucide-react'
import { useRespondToInvitationMutation, type BoardInvitation } from '../../services/boardServices'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface InviteResponseModalProps {
  invitation?: BoardInvitation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const InviteResponseModal: React.FC<InviteResponseModalProps> = ({
  invitation,
  open,
  onOpenChange,
}) => {
  const respondMutation = useRespondToInvitationMutation()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!invitation) return null

  const handleRespond = async (accept: boolean) => {
    setIsSubmitting(true)
    try {
      await respondMutation.mutateAsync({ invitationId: invitation.id, accept })
      if (accept) {
        toast.success(`Bạn đã tham gia bảng "${invitation.boardTitle}"!`)
        onOpenChange(false)
        navigate(`/app/boards/${invitation.boardId}`)
      } else {
        toast.success(`Đã từ chối lời mời vào bảng "${invitation.boardTitle}"`)
        onOpenChange(false)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra!')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Lời mời tham gia bảng</h2>
                <p className="text-xs text-slate-500">Xác nhận hoặc từ chối lời mời</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">{invitation.inviter?.fullName || 'Người dùng'}</span> đã mời bạn tham gia làm thành viên của bảng:
          </p>
          
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <h3 className="text-base font-bold text-slate-900">{invitation.boardTitle}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Gửi lúc: {new Date(invitation.createdAt).toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleRespond(false)}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Từ chối</span>
          </button>

          <button
            type="button"
            onClick={() => handleRespond(true)}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Chấp nhận</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

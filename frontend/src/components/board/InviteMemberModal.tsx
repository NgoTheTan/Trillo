import React, { useEffect, useState } from 'react'
import { Link as LinkIcon, Trash2, X, Check, Shield, Loader2, ChevronDown, ChevronUp, Settings2, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import {
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useUpdateMemberPermissionsMutation,
  type BoardPermission,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
} from '../../services/boardServices'
import { useQueryClient } from '@tanstack/react-query'
import { getAvatarUrl } from '../../auth/authStorage'

export interface Member {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  role?: 'OWNER' | 'MEMBER' | string
  permissions?: BoardPermission[]
  status: 'joined' | 'pending' | 'unsent'
  isYou?: boolean
}

interface InviteMemberModalProps {
  boardId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName?: string
  initialMembers?: Member[]
  currentUserRole?: string
  onInviteSubmit?: (emailOrUser: string) => void
  onRemoveMember?: (id: string) => void
}

const getInitials = (name?: string) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Permission group definitions for cleaner UI
const PERMISSION_GROUPS = [
  {
    label: 'Thẻ (Card)',
    permissions: ['CREATE_CARD', 'EDIT_CARD', 'DELETE_CARD', 'MOVE_CARD'] as BoardPermission[],
  },
  {
    label: 'Cột (List)',
    permissions: ['CREATE_LIST', 'EDIT_LIST', 'DELETE_LIST'] as BoardPermission[],
  },
  {
    label: 'Lưu trữ (Archive)',
    permissions: ['VIEW_ARCHIVE', 'ARCHIVE_ITEM', 'RESTORE_ARCHIVE'] as BoardPermission[],
  },
  {
    label: 'Khác',
    permissions: ['MANAGE_LABELS', 'ADD_COMMENT', 'MANAGE_CHECKLIST', 'UPLOAD_ATTACHMENT'] as BoardPermission[],
  },
]

interface PermissionsPanelProps {
  memberId: string
  boardId: string
  currentPermissions: BoardPermission[]
  onClose: () => void
}

const PermissionsPanel: React.FC<PermissionsPanelProps> = ({
  memberId, boardId, currentPermissions, onClose,
}) => {
  const [selected, setSelected] = useState<Set<BoardPermission>>(new Set(currentPermissions))
  const [isSaving, setIsSaving] = useState(false)
  const mutation = useUpdateMemberPermissionsMutation()
  const queryClient = useQueryClient()

  const toggle = (p: BoardPermission) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === ALL_PERMISSIONS.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ALL_PERMISSIONS))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await mutation.mutateAsync({ boardId, memberId, permissions: Array.from(selected) })
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
      {/* Select All / None */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phân quyền</span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          {selected.size === ALL_PERMISSIONS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>

      {/* Permission Groups */}
      {PERMISSION_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{group.label}</p>
          <div className="grid grid-cols-2 gap-1">
            {group.permissions.map(p => (
              <label
                key={p}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-slate-200 transition-all"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p)}
                  onChange={() => toggle(p)}
                  className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-700">{PERMISSION_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</> : 'Lưu quyền'}
        </button>
      </div>
    </div>
  )
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  boardId,
  open,
  onOpenChange,
  projectName = 'Board Project',
  initialMembers = [],
  currentUserRole,
  onInviteSubmit,
  onRemoveMember,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('')
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [expandedPermissionId, setExpandedPermissionId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const inviteMemberMutation = useInviteMemberMutation()
  const removeMemberMutation = useRemoveMemberMutation()

  const isOwner = currentUserRole === 'OWNER'

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers, open])

  if (!open) return null

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = emailOrUser.trim()
    if (!trimmed) return

    if (onInviteSubmit) {
      onInviteSubmit(trimmed)
    }

    if (boardId) {
      try {
        setIsSubmitting(true)
        const res = await inviteMemberMutation.mutateAsync({ boardId, email: trimmed })
        if (res.inviteUrl) {
          navigator.clipboard.writeText(res.inviteUrl)
          setCopiedLink(true)
          setTimeout(() => setCopiedLink(false), 2000)
        }
        queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      } catch (err) {
        console.error('Failed to invite member via API:', err)
      } finally {
        setIsSubmitting(false)
      }
    }

    const newMember: Member = {
      id: Date.now().toString(),
      fullName: trimmed.includes('@') ? trimmed.split('@')[0] : trimmed,
      email: trimmed.includes('@') ? trimmed : `${trimmed}@example.com`,
      role: 'MEMBER',
      permissions: [],
      status: 'pending',
    }

    setMembers(prev => [...prev, newMember])
    setEmailOrUser('')
  }

  const handleConfirmRemove = async (id: string) => {
    if (onRemoveMember) {
      onRemoveMember(id)
    }

    if (boardId) {
      try {
        await removeMemberMutation.mutateAsync({ boardId, userId: id })
        queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      } catch (err) {
        console.error('Failed to remove member via API:', err)
      }
    }

    setMembers(prev => prev.filter(m => m.id !== id))
    setConfirmRemoveId(null)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const togglePermissionsPanel = (memberId: string) => {
    setExpandedPermissionId(prev => prev === memberId ? null : memberId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-w-2xl w-[640px] max-h-[92vh] overflow-y-auto bg-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-100">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 sticky top-0 bg-white z-20">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý thành viên</h2>
              <p className="text-xs text-slate-500 mt-1">
                Mời thành viên tham gia dự án <span className="font-semibold text-slate-700">{projectName}</span>
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Invite Input Section — only owners can invite */}
        {isOwner && (
          <form onSubmit={handleInvite} className="py-5 space-y-2 border-b border-slate-100">
            <label className="block text-xs font-semibold text-slate-700">
              Email hoặc tên người dùng
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={emailOrUser}
                onChange={e => setEmailOrUser(e.target.value)}
                placeholder="Nhập email hoặc tên người dùng..."
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang mời...</span>
                  </>
                ) : (
                  <span>Mời</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Members Section */}
        <div className="py-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Thành viên ({members.length})
          </h3>

          {members.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-medium">
              Chưa có thành viên nào. Nhập email ở trên để gửi lời mời.
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-2xl divide-y divide-slate-100 bg-white">
              {members.map(member => {
                const memberIsOwner = (member.role || '').toUpperCase() === 'OWNER'
                const grantedCount = member.permissions?.length ?? 0
                const isExpanded = expandedPermissionId === member.id

                return (
                  <div key={member.id}>
                    <div className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors relative">
                      {/* Member Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {member.avatarUrl ? (
                            <img
                              src={getAvatarUrl(member.avatarUrl)}
                              alt={member.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs tracking-wider uppercase">
                              {getInitials(member.fullName)}
                            </div>
                          )}
                          {memberIsOwner && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center shadow-xs border border-white z-10" title="Chủ sở hữu">
                              <Star className="w-2.5 h-2.5 fill-amber-950 stroke-none" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {member.fullName}
                            </span>
                            {member.isYou && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                                Bạn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                        </div>
                      </div>

                      {/* Role, Permissions summary & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Role Pill */}
                        {memberIsOwner ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Shield className="w-3 h-3 text-purple-600" />
                            Chủ sở hữu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                            Thành viên
                          </span>
                        )}

                        {/* Status Badge */}
                        <div className="w-20 text-right hidden sm:block">
                          {member.status === 'joined' && (
                            <span className="text-xs font-semibold text-emerald-600">Đã tham gia</span>
                          )}
                          {member.status === 'pending' && (
                            <span className="text-xs font-semibold text-amber-600">Đang chờ</span>
                          )}
                          {member.status === 'unsent' && (
                            <span className="text-xs font-semibold text-slate-400">Chưa gửi</span>
                          )}
                        </div>

                        {/* Permission button (owner-only, for non-owner members) */}
                        {isOwner && !memberIsOwner && (
                          <button
                            type="button"
                            onClick={() => togglePermissionsPanel(member.id)}
                            title="Quản lý quyền"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-blue-600 text-white border-blue-600'
                                : grantedCount > 0
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <Settings2 className="w-3 h-3" />
                            <span>{grantedCount}/{ALL_PERMISSIONS.length}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}

                        {/* Delete Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOwner && !member.isYou && !memberIsOwner && (
                            confirmRemoveId === member.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmRemove(member.id)}
                                  disabled={removeMemberMutation.isPending}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {removeMemberMutation.isPending ? 'Đang xóa…' : 'Xóa'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(member.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Xóa thành viên"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Permissions Panel (expandable) */}
                    {isExpanded && boardId && (
                      <div className="px-4 pb-4">
                        <PermissionsPanel
                          memberId={member.id}
                          boardId={boardId}
                          currentPermissions={member.permissions ?? []}
                          onClose={() => setExpandedPermissionId(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Share Link Footer Section */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Chia sẻ bằng liên kết</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bất kỳ ai có liên kết này đều có thể yêu cầu tham gia dự án.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-xl border border-blue-200 transition-all cursor-pointer whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Đã sao chép!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Sao chép liên kết</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Close Button */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

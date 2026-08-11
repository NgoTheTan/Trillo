import React, { useEffect, useState } from 'react'
import { Link as LinkIcon, Trash2, X, Check, Shield, Loader2, ChevronDown, ChevronUp, Settings2, Star, Users, UserPlus, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import {
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useUpdateMemberPermissionsMutation,
  useJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
  type BoardPermission,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
} from '../../services/boardServices'
import { useJoinRequestUpdates } from '../../services/websocketService'
import { useQueryClient } from '@tanstack/react-query'
import { getAvatarUrl } from '../../auth/authStorage'
import toast from 'react-hot-toast'

export interface Member {
  id: string       // BoardMember ID
  userId: string   // User ID (for remove API)
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
  initialTab?: 'members' | 'requests'
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
    permissions: ['CREATE_CARD', 'EDIT_CARD', 'MOVE_CARD'] as BoardPermission[],
  },
  {
    label: 'Cột (List)',
    permissions: ['CREATE_LIST', 'EDIT_LIST'] as BoardPermission[],
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
      toast.success('Đã cập nhật quyền thành công')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật quyền')
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
  projectName = 'Dự án',
  initialMembers = [],
  currentUserRole,
  initialTab = 'members',
  onInviteSubmit,
  onRemoveMember,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('')
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null)
  const [expandedPermissionId, setExpandedPermissionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>(initialTab)

  const queryClient = useQueryClient()
  const inviteMemberMutation = useInviteMemberMutation()
  const removeMemberMutation = useRemoveMemberMutation()
  const approveMutation = useApproveJoinRequestMutation()
  const rejectMutation = useRejectJoinRequestMutation()

  const isOwner = currentUserRole === 'OWNER'

  // Fetch join requests for owner
  const { data: joinRequests = [] } = useJoinRequestsQuery(isOwner && open ? boardId : undefined)

  // Subscribe to real-time join request updates via WebSocket
  useJoinRequestUpdates(isOwner ? boardId : undefined)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers, open])

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

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
        toast.success(res.message || 'Đã gửi lời mời thành công!')
        if (res.inviteUrl) {
          navigator.clipboard.writeText(res.inviteUrl)
          setCopiedLink(true)
          setTimeout(() => setCopiedLink(false), 3000)
        }
        queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể gửi lời mời!')
      } finally {
        setIsSubmitting(false)
      }
    }
    setEmailOrUser('')
  }

  const handleConfirmRemove = async (userId: string) => {
    if (onRemoveMember) {
      onRemoveMember(userId)
    }

    if (boardId) {
      try {
        await removeMemberMutation.mutateAsync({ boardId, userId })
        toast.success('Đã xóa thành viên khỏi bảng')
        queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể xóa thành viên!')
      }
    }

    setMembers(prev => prev.filter(m => m.userId !== userId))
    setConfirmRemoveUserId(null)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleApproveRequest = async (requestId: string) => {
    if (!boardId) return
    try {
      await approveMutation.mutateAsync({ boardId, requestId })
      toast.success('Đã chấp nhận yêu cầu tham gia')
      queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['join-requests', boardId] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra!')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!boardId) return
    try {
      await rejectMutation.mutateAsync({ boardId, requestId })
      toast.success('Đã từ chối yêu cầu tham gia')
      queryClient.invalidateQueries({ queryKey: ['join-requests', boardId] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra!')
    }
  }

  const togglePermissionsPanel = (memberId: string) => {
    setExpandedPermissionId(prev => prev === memberId ? null : memberId)
  }

  const pendingRequestsCount = joinRequests.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-w-2xl w-[640px] max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-100">
        {/* Header with X close button */}
        <DialogHeader>
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý thành viên</h2>
              <p className="text-xs text-slate-500 mt-1">
                Dự án <span className="font-semibold text-slate-700">{projectName}</span>
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

        {/* 1. Invite Input Section — only owners can invite */}
        {isOwner && (
          <form onSubmit={handleInvite} className="pt-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Email hoặc tên người dùng để mời
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
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Mời</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 2. Share Link Section — moved up right below input */}
        <div className="flex items-center justify-between p-3.5 my-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Chia sẻ bằng liên kết</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bất kỳ ai có liên kết đều có thể gửi yêu cầu tham gia bảng.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-blue-600 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer whitespace-nowrap"
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

        {/* 3. Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 mt-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Thành viên</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-semibold">
              {members.length}
            </span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Yêu cầu tham gia</span>
              {pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab 1: Members */}
        {activeTab === 'members' && (
          <div className="space-y-3">
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

                          {/* Delete Button (Passes userId to handleConfirmRemove!) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isOwner && !member.isYou && !memberIsOwner && (
                              confirmRemoveUserId === member.userId ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemoveUserId(null)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRemove(member.userId)}
                                    disabled={removeMemberMutation.isPending}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {removeMemberMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xóa'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveUserId(member.userId)}
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
        )}

        {/* Tab 2: Join Requests (Owner only) */}
        {activeTab === 'requests' && isOwner && (
          <div className="space-y-3">
            {joinRequests.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-medium">
                Không có yêu cầu tham gia nào đang chờ duyệt.
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-2xl divide-y divide-slate-100 bg-white">
                {joinRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {req.requester?.avatarUrl ? (
                        <img
                          src={getAvatarUrl(req.requester.avatarUrl)}
                          alt={req.requester.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {getInitials(req.requester?.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {req.requester?.fullName}
                          </span>
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-500 uppercase">
                            {req.source === 'LINK' ? 'Từ liên kết' : 'Công khai'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{req.requester?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={rejectMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req.id)}
                        disabled={approveMutation.isPending}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Chấp nhận'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

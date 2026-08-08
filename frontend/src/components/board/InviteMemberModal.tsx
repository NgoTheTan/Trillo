import React, { useEffect, useState } from 'react'
import { Link as LinkIcon, Trash2, X, Check, Shield, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import { inviteMember, removeMember, useInviteMemberMutation, useRemoveMemberMutation } from '../../services/boardServices'
import { useQueryClient } from '@tanstack/react-query'

export interface Member {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  role?: 'OWNER' | 'MEMBER' | string
  status: 'joined' | 'pending' | 'unsent'
  isYou?: boolean
}

interface InviteMemberModalProps {
  boardId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName?: string
  initialMembers?: Member[]
  onInviteSubmit?: (emailOrUser: string) => void
  onRemoveMember?: (id: string) => void
}

const getInitials = (name?: string) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  boardId,
  open,
  onOpenChange,
  projectName = 'Board Project',
  initialMembers = [],
  onInviteSubmit,
  onRemoveMember,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('')
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const inviteMemberMutation = useInviteMemberMutation()
  const removeMemberMutation = useRemoveMemberMutation()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-w-2xl w-[640px] max-h-[92vh] overflow-y-auto bg-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-100">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 sticky top-0 bg-white z-20">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invite Members to Project</h2>
              <p className="text-xs text-slate-500 mt-1">
                Invite members to join project <span className="font-semibold text-slate-700">{projectName}</span>
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
        {/* Invite Input Section */}
        <form onSubmit={handleInvite} className="py-5 space-y-2 border-b border-slate-100">
          <label className="block text-xs font-semibold text-slate-700">
            Email or username
          </label>
          <div className="flex items-center gap-2.5">
            {/* Input Email / Username */}
            <input
              type="text"
              value={emailOrUser}
              onChange={e => setEmailOrUser(e.target.value)}
              placeholder="Enter email or username..."
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-50"
            />

            {/* Invite Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inviting...</span>
                </>
              ) : (
                <span>Invite</span>
              )}
            </button>
          </div>
        </form>

        {/* Invited Members Section */}
        <div className="py-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Invited Members ({members.length})
          </h3>

          {members.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-medium">
              No members invited yet. Enter an email above to send an invitation.
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-2xl divide-y divide-slate-100 bg-white">
              {members.map(member => {
                const isOwner = (member.role || '').toUpperCase() === 'OWNER'
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors relative"
                  >
                    {/* Member Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs tracking-wider uppercase">
                        {getInitials(member.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {member.fullName}
                          </span>
                          {member.isYou && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role Pill & Status & Action */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Owner / Member Pill */}
                      <div>
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Shield className="w-3 h-3 text-purple-600" />
                            Owner
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                            Member
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="w-20 text-right">
                        {member.status === 'joined' && (
                          <span className="text-xs font-semibold text-emerald-600">Joined</span>
                        )}
                        {member.status === 'pending' && (
                          <span className="text-xs font-semibold text-amber-600">Pending</span>
                        )}
                        {member.status === 'unsent' && (
                          <span className="text-xs font-semibold text-slate-400">Unsent</span>
                        )}
                      </div>

                      {/* Action Icon (Delete if not Owner and not You) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!member.isYou && !isOwner && (
                          confirmRemoveId === member.id ? (
                            // Inline confirm row
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmRemove(member.id)}
                                disabled={removeMemberMutation.isPending}
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {removeMemberMutation.isPending ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(member.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Share Link Footer Section */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Share with link</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Anyone with this link can request to join the project.
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
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Copy Link</span>
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
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Bell,
    Settings,
    ChevronDown,
    Menu,
    HelpCircle,
    LogOut,
    CheckCheck,
    Clock,
    Sparkles,
    UserPlus,
    UserCheck,
    Calendar,
    MessageSquare,
    MailCheck,
    MailOpen,
    CheckCircle2,
    XCircle,
    X,
    Check
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../ui/popover'
import { TrilloLogo } from '../common/TrilloLogo'
import { useAuth } from '../../auth/authContext'
import { getAvatarUrl, getInitials } from '../../auth/authStorage'
import {
    useNotificationsQuery,
    useMarkReadMutation,
    useMarkUnreadMutation,
    useMarkAllReadMutation,
} from '../../services/notificationService'
import type {
    NotificationType,
    NotificationResponse
} from '../../services/notificationService'
import {
    getPendingInvitations,
    respondToInvitation,
    type BoardInvitation
} from '../../services/boardServices'
import { InviteResponseModal } from '../board/InviteResponseModal'
import { getCardDetail } from '../../services/cardService'

interface HeaderProps {
    isSidebarCollapsed?: boolean
    onToggleSidebar?: () => void
    userName?: string
    userRole?: string
    avatarUrl?: string
}

export const Header: React.FC<HeaderProps> = ({
    isSidebarCollapsed,
    onToggleSidebar,
    userName,
    userRole,
    avatarUrl
}) => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const [customAvatar, setCustomAvatar] = useState<string | undefined>(undefined)
    const [customName, setCustomName] = useState<string | undefined>(undefined)

    // Invitation Modal & Popover State
    const [isNotifOpen, setIsNotifOpen] = useState(false)
    const [activeInvitation, setActiveInvitation] = useState<BoardInvitation | null>(null)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [respondingId, setRespondingId] = useState<string | null>(null)

    useEffect(() => {
        const handleProfileUpdate = (event: any) => {
            const updatedData = event.detail
            if (updatedData) {
                if (updatedData.avatarUrl !== undefined) setCustomAvatar(updatedData.avatarUrl)
                if (updatedData.displayName !== undefined) setCustomName(updatedData.displayName)
            }
        }
        window.addEventListener('profileUpdated', handleProfileUpdate)
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
    }, [])

    const { data: notifications = [] } = useNotificationsQuery()
    const markReadMutation = useMarkReadMutation()
    const markUnreadMutation = useMarkUnreadMutation()
    const markAllReadMutation = useMarkAllReadMutation()

    const displayName = customName || user?.fullName || userName || 'User'
    const displayRole = userRole || user?.email || 'Thành viên'
    const userInitials = getInitials(displayName)

    const rawAvatarUrl = customAvatar !== undefined ? customAvatar : (avatarUrl || user?.avatarUrl)
    const effectiveAvatarUrl = getAvatarUrl(rawAvatarUrl)

    const unreadCount = notifications.filter(n => !n.read).length

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation()
        markAllReadMutation.mutate()
    }

    const handleToggleRead = (notif: NotificationResponse, e: React.MouseEvent) => {
        e.stopPropagation()
        if (notif.read) {
            markUnreadMutation.mutate(notif.id)
        } else {
            markReadMutation.mutate(notif.id)
        }
    }

    const handleRespondInvitation = async (e: React.MouseEvent, notif: NotificationResponse, accept: boolean) => {
        e.stopPropagation()
        const invitationId = notif.referenceId
        if (!invitationId) return

        setRespondingId(notif.id)
        try {
            await respondToInvitation(invitationId, accept)
            if (!notif.read) {
                markReadMutation.mutate(notif.id)
            }
            setIsNotifOpen(false)
            if (accept) {
                toast.success('Đã chấp nhận lời mời tham gia bảng!')
                if (notif.relatedBoardId) {
                    navigate(`/app/boards/${notif.relatedBoardId}`)
                }
            } else {
                toast.success('Đã từ chối lời mời')
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lời mời không còn khả dụng!')
            if (!notif.read) {
                markReadMutation.mutate(notif.id)
            }
        } finally {
            setRespondingId(null)
        }
    }

    const handleNotificationClick = async (notif: NotificationResponse) => {
        setIsNotifOpen(false)
        if (!notif.read) {
            markReadMutation.mutate(notif.id)
        }
        const boardId = notif.relatedBoardId || (notif.referenceType === 'BOARD' ? notif.referenceId : null)
        const cardId = notif.relatedTaskId || (notif.referenceType === 'CARD' ? notif.referenceId : null)

        if (notif.type === 'BOARD_INVITATION') {
            const invitationId = notif.referenceId
            try {
                const pending = await getPendingInvitations()
                const found = pending.find(i => i.id === invitationId || i.boardId === boardId)
                if (found) {
                    setActiveInvitation(found)
                    setIsInviteModalOpen(true)
                } else {
                    toast.error('Lời mời này không còn khả dụng hoặc đã được xử lý')
                }
            } catch {
                toast.error('Không thể tải thông tin lời mời')
            }
            return
        }

        if (notif.type === 'JOIN_REQUEST') {
            if (boardId) {
                navigate(`/app/boards/${boardId}?requestsTab=true`)
            } else {
                navigate('/app')
            }
            return
        }

        if (notif.type === 'MEMBER_REMOVED') {
            navigate('/app')
            return
        }

        if (cardId) {
            if (boardId) {
                navigate(`/app/boards/${boardId}?cardId=${cardId}`)
            } else {
                try {
                    const cardData = await getCardDetail(cardId)
                    if (cardData && cardData.boardId) {
                        navigate(`/app/boards/${cardData.boardId}?cardId=${cardId}`)
                    } else {
                        navigate('/app')
                    }
                } catch {
                    navigate('/app')
                }
            }
        } else if (boardId) {
            navigate(`/app/boards/${boardId}`)
        } else {
            navigate('/app')
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    const getNotifIcon = (type: NotificationType) => {
        switch (type) {
            case 'BOARD_INVITE':
            case 'BOARD_INVITATION':
                return { icon: <UserPlus className="w-4 h-4" />, bg: 'bg-blue-100 text-blue-600' }
            case 'INVITATION_ACCEPTED':
                return { icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-emerald-100 text-emerald-600' }
            case 'INVITATION_DECLINED':
                return { icon: <XCircle className="w-4 h-4" />, bg: 'bg-rose-100 text-rose-600' }
            case 'JOIN_REQUEST':
                return { icon: <Clock className="w-4 h-4" />, bg: 'bg-amber-100 text-amber-600' }
            case 'MEMBER_REMOVED':
                return { icon: <X className="w-4 h-4 stroke-[2.5]" />, bg: 'bg-rose-100 text-rose-600' }
            case 'MEMBER_JOINED':
                return { icon: <UserCheck className="w-4 h-4" />, bg: 'bg-purple-100 text-purple-600' }
            case 'CARD_ASSIGNED':
                return { icon: <Sparkles className="w-4 h-4" />, bg: 'bg-indigo-100 text-indigo-600' }
            case 'DEADLINE_REMINDER':
                return { icon: <Calendar className="w-4 h-4" />, bg: 'bg-amber-100 text-amber-600' }
            case 'COMMENT_ADDED':
                return { icon: <MessageSquare className="w-4 h-4" />, bg: 'bg-sky-100 text-sky-600' }
            default:
                return { icon: <Bell className="w-4 h-4" />, bg: 'bg-slate-100 text-slate-600' }
        }
    }

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: vi })
        } catch {
            return dateStr
        }
    }

    return (
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            {/* Left side: 3-bar toggle button & Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
                {onToggleSidebar && (
                    <button
                        type="button"
                        onClick={onToggleSidebar}
                        className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu nhỏ thanh bên"}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}

                <div className="flex items-center gap-2 sm:gap-2.5">
                    <TrilloLogo className="w-7 h-7 sm:w-8 sm:h-8 shadow-xs" />
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Trillo</span>
                </div>
            </div>

            {/* Right side: Notifications, Settings, Profile */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                {/* Notification Popover */}
                <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
                    <PopoverTrigger
                        className="relative p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer outline-none"
                        title="Thông báo"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-4.5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </PopoverTrigger>

                    <PopoverContent
                        align="end"
                        sideOffset={8}
                        className="w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 p-0 overflow-hidden"
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-base">Thông báo</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-600 rounded-full">
                                        {unreadCount} mới
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Đánh dấu tất cả đã đọc
                                </button>
                            )}
                        </div>

                        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-sm">
                                    Không có thông báo nào
                                </div>
                            ) : (
                                notifications.map(notif => {
                                    const { icon, bg } = getNotifIcon(notif.type)
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer group ${
                                                !notif.read ? 'bg-blue-50/50' : ''
                                            }`}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                                                {icon}
                                            </div>
                                            <div className="flex-1 text-xs sm:text-sm min-w-0">
                                                {notif.title && (
                                                    <p className={`text-slate-900 leading-snug font-semibold mb-0.5`}>
                                                        {notif.title}
                                                    </p>
                                                )}
                                                <p className={`text-slate-800 leading-snug ${!notif.read ? 'font-medium' : ''}`}>
                                                    {notif.message}
                                                </p>

                                                {/* Status / Action Buttons for Board Invitation */}
                                                {notif.type === 'BOARD_INVITATION' && (
                                                    notif.status === 'ACCEPTED' ? (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200/60">
                                                            <Check className="w-3 h-3" />
                                                            <span>Đã chấp nhận</span>
                                                        </div>
                                                    ) : notif.status === 'DECLINED' ? (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md w-fit border border-rose-200/60">
                                                            <X className="w-3 h-3" />
                                                            <span>Đã từ chối</span>
                                                        </div>
                                                    ) : !notif.read ? (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <button
                                                                type="button"
                                                                disabled={respondingId === notif.id}
                                                                onClick={(e) => handleRespondInvitation(e, notif, true)}
                                                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                <span>Chấp nhận</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={respondingId === notif.id}
                                                                onClick={(e) => handleRespondInvitation(e, notif, false)}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                <X className="w-3 h-3" />
                                                                <span>Từ chối</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-200/60">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Đang chờ phản hồi</span>
                                                        </div>
                                                    )
                                                )}

                                                {/* Status Badges for Join Request */}
                                                {notif.type === 'JOIN_REQUEST' && (
                                                    notif.status === 'APPROVED' ? (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200/60">
                                                            <Check className="w-3 h-3" />
                                                            <span>Đã phê duyệt</span>
                                                        </div>
                                                    ) : notif.status === 'REJECTED' ? (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit border border-slate-200/60">
                                                            <X className="w-3 h-3" />
                                                            <span>Đã từ chối</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-200/60">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Chờ duyệt yêu cầu</span>
                                                        </div>
                                                    )
                                                )}

                                                <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(notif.createdAt)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleToggleRead(notif, e)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 rounded transition-colors cursor-pointer shrink-0"
                                                title={notif.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                                            >
                                                {notif.read ? (
                                                    <MailOpen className="w-4 h-4" />
                                                ) : (
                                                    <MailCheck className="w-4 h-4 text-blue-600" />
                                                )}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
                            <button
                                onClick={() => {
                                    setIsNotifOpen(false)
                                    navigate('/app')
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline w-full cursor-pointer"
                            >
                                Trang chủ
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Pop-up modal xác nhận lời mời khi nhấp thông báo */}
                <InviteResponseModal
                    invitation={activeInvitation}
                    open={isInviteModalOpen}
                    onOpenChange={setIsInviteModalOpen}
                />

                {/* Profile Popover */}
                <Popover>
                    <PopoverTrigger className="flex items-center gap-3 p-1.5 pl-2 pr-3 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all cursor-pointer outline-none">
                        {effectiveAvatarUrl ? (
                            <img
                                src={effectiveAvatarUrl}
                                alt={displayName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                                {userInitials}
                            </div>
                        )}
                        <div className="text-left hidden md:block">
                            <div className="text-sm font-semibold text-slate-900 leading-tight">
                                {displayName}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                                {displayRole}
                            </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                    </PopoverTrigger>

                    <PopoverContent
                        align="end"
                        sideOffset={8}
                        className="w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 px-1 z-50"
                    >
                        <div className="px-3 py-2 border-b border-slate-100 md:hidden">
                            <p className="font-semibold text-slate-900 text-sm">{displayName}</p>
                            <p className="text-xs text-slate-500">{displayRole}</p>
                        </div>

                        <button 
                            onClick={() => navigate('/app/settings')}
                            className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer"
                        >
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>Cài đặt</span>
                        </button>

                        <button className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                            <HelpCircle className="w-4 h-4 text-slate-400" />
                            <span>Trợ giúp &amp; Hỗ trợ</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 text-xs sm:text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-3 font-medium transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>Đăng xuất</span>
                        </button>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    )
}

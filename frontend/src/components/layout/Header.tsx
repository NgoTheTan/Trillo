import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Bell,
    Settings,
    ChevronDown,
    Menu,
    User,
    KeyRound,
    HelpCircle,
    LogOut,
    CheckCheck,
    Clock,
    Sparkles
} from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../ui/popover'
import { useAuth } from '../../auth/authContext'

interface NotificationItem {
    id: string
    title: string
    time: string
    isUnread: boolean
    type: 'board' | 'card' | 'deadline' | 'review'
}

const initialNotifications: NotificationItem[] = [
    {
        id: '1',
        title: 'You were added to board "Website Redesign"',
        time: '2 mins ago',
        isUnread: true,
        type: 'board'
    },
    {
        id: '2',
        title: 'You were assigned to card "Wireframe Design"',
        time: '10 mins ago',
        isUnread: true,
        type: 'card'
    },
    {
        id: '3',
        title: 'Card "Build Prototype" is due soon',
        time: '1 hour ago',
        isUnread: true,
        type: 'deadline'
    },
    {
        id: '4',
        title: 'Card "UI/UX Review" is due soon',
        time: '3 hours ago',
        isUnread: true,
        type: 'review'
    },
]

interface HeaderProps {
    onToggleMobileSidebar?: () => void
    userName?: string
    userRole?: string
    avatarUrl?: string
}

export const Header: React.FC<HeaderProps> = ({
    onToggleMobileSidebar,
    userName,
    userRole,
    avatarUrl
}) => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)

    const displayName = user?.fullName || userName || 'User'
    const displayRole = user?.role === 'PM' ? 'Project Manager' : user?.role || userRole || 'Member'
    const userInitials = displayName
        ? displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'US'

    const unreadCount = notifications.filter(n => n.isUnread).length

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })))
    }

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    const getNotifIconBg = (type: NotificationItem['type']) => {
        switch (type) {
            case 'board':
                return 'bg-rose-100 text-rose-600'
            case 'card':
                return 'bg-blue-100 text-blue-600'
            case 'deadline':
                return 'bg-amber-100 text-amber-600'
            case 'review':
                return 'bg-emerald-100 text-emerald-600'
            default:
                return 'bg-slate-100 text-slate-600'
        }
    }

    return (
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            {/* Left side: Menu Toggle for mobile */}
            <div className="flex items-center gap-3">
                {onToggleMobileSidebar && (
                    <button
                        onClick={onToggleMobileSidebar}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
                        title="Toggle Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Right side: Notifications, Settings, Profile */}
            <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                {/* Notification Popover */}
                <Popover>
                    <PopoverTrigger
                        className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer outline-none"
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-4.5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
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
                                <h3 className="font-bold text-slate-900 text-base">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-600 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-50">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                                            notif.isUnread ? 'bg-blue-50/40' : ''
                                        }`}
                                        onClick={() => {
                                            setNotifications(prev =>
                                                prev.map(n => (n.id === notif.id ? { ...n, isUnread: false } : n))
                                            )
                                        }}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getNotifIconBg(notif.type)}`}>
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 text-xs sm:text-sm">
                                            <p className={`text-slate-800 leading-snug ${notif.isUnread ? 'font-medium' : ''}`}>
                                                {notif.title}
                                            </p>
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                                <Clock className="w-3 h-3" />
                                                {notif.time}
                                            </span>
                                        </div>
                                        {notif.isUnread && (
                                            <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
                            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline w-full cursor-pointer">
                                View all
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Quick Settings Icon */}
                <button
                    className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-slate-200 my-auto" />

                {/* Profile Popover */}
                <Popover>
                    <PopoverTrigger className="flex items-center gap-3 p-1.5 pl-2 pr-3 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all cursor-pointer outline-none">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
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

                        <button className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>My Profile</span>
                        </button>

                        <button className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>Settings</span>
                        </button>

                        <button className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            <span>Change Password</span>
                        </button>

                        <button className="w-full px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors cursor-pointer">
                            <HelpCircle className="w-4 h-4 text-slate-400" />
                            <span>Help & Support</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 text-xs sm:text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-3 font-medium transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>Log out</span>
                        </button>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    )
}

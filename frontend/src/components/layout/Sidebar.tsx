import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Users,
    Calendar,
    BarChart3,
    Settings,
    Shield,
    X,
    Columns3
} from 'lucide-react'

export interface NavItem {
    id: string
    label: string
    icon: React.ElementType
    badge?: string | number
    href: string
}

const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/app' },
    { id: 'boards', label: 'Boards', icon: Columns3, href: '/app/boards' },
    { id: 'members', label: 'Members', icon: Users, href: '/app/team' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, href: '/app/schedule' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/app/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/app/settings' },
]

interface SidebarProps {
    activeId?: string
    onSelectNav?: (id: string) => void
    isOpenMobile?: boolean
    onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
    onSelectNav,
    isOpenMobile = false,
    onCloseMobile
}) => {
    const handleNavClick = (id: string) => {
        if (onSelectNav) onSelectNav(id)
        if (onCloseMobile) onCloseMobile()
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpenMobile && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    onClick={onCloseMobile}
                />
            )}

            {/* Sidebar Container (Light Theme) */}
            <aside
                className={`
                    fixed lg:sticky top-0 left-0 bottom-0 z-50 h-screen
                    w-64 bg-white text-slate-700 flex flex-col justify-between shrink-0
                    transition-transform duration-300 ease-in-out border-r border-slate-200/80 shadow-xl lg:shadow-none
                    ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div>
                    {/* Brand Header */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
                                <Shield className="w-5 h-5 fill-white/20" />
                            </div>
                            <span className="text-lg font-extrabold text-slate-900 tracking-tight">Trillo</span>
                        </div>
                        {onCloseMobile && (
                            <button
                                onClick={onCloseMobile}
                                className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Navigation Menu */}
                    <nav className="p-4 space-y-1.5">
                        {navItems.map((item) => {
                            const Icon = item.icon

                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.href}
                                    end={item.href === '/app'}
                                    onClick={() => handleNavClick(item.id)}
                                    className={({ isActive }) => `
                                        w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                <span>{item.label}</span>
                                            </div>
                                            {item.badge && (
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 font-semibold'}`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer section (System status) */}
                <div className="p-4 m-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-600">System Status: Online</span>
                    </div>
                </div>
            </aside>
        </>
    )
}

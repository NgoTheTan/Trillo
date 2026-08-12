import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Calendar,
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
    { id: 'boards', label: 'Bảng', icon: Columns3, href: '/app/boards' },
    { id: 'schedule', label: 'Lịch biểu', icon: Calendar, href: '/app/schedule' },
]

interface SidebarProps {
    activeId?: string
    isCollapsed?: boolean
    isOpenMobile?: boolean
    onCloseMobile?: () => void
    onSelectNav?: (id: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed = false,
    isOpenMobile = false,
    onCloseMobile,
    onSelectNav
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
                    className="fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                className={`
                    fixed lg:sticky top-16 left-0 bottom-0 z-50 h-[calc(100vh-4rem)]
                    bg-white text-slate-700 flex flex-col justify-between shrink-0
                    transition-all duration-300 ease-in-out border-r border-slate-200/80 shadow-2xl lg:shadow-xs
                    ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                    w-64
                `}
            >
                <div>
                    {/* Navigation Menu */}
                    <nav className="p-3 space-y-1.5 sm:p-4">
                        {navItems.map((item) => {
                            const Icon = item.icon

                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.href}
                                    end={item.href === '/app'}
                                    onClick={() => handleNavClick(item.id)}
                                    title={item.label}
                                    className={({ isActive }) => `
                                        w-full block transition-all duration-200 cursor-pointer rounded-xl
                                        ${isActive
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {/* Desktop Collapsed View (only on lg: when isCollapsed is true) */}
                                            {isCollapsed ? (
                                                <div className="hidden lg:flex flex-col items-center justify-center py-2 px-1 text-center gap-1 min-w-0">
                                                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                    <span className={`text-[11px] font-semibold leading-snug px-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[64px] ${isActive ? 'text-white' : 'text-slate-600'}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {/* Default / Mobile / Desktop Expanded View */}
                                            <div className={`${isCollapsed ? 'lg:hidden' : ''} flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm`}>
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                    <span>{item.label}</span>
                                                </div>
                                                {item.badge && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 font-semibold'}`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>
            </aside>
        </>
    )
}


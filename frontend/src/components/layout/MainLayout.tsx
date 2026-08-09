import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useWebSocketNotifications } from '../../services/websocketService'

interface MainLayoutProps {
    children?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children
}) => {
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true'
    })
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const handleToggleSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsMobileOpen(prev => !prev)
        } else {
            setIsDesktopCollapsed(prev => {
                const next = !prev
                localStorage.setItem('sidebar_collapsed', String(next))
                return next
            })
        }
    }

    useWebSocketNotifications()

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
            {/* Header */}
            <Header
                isSidebarCollapsed={isDesktopCollapsed}
                onToggleSidebar={handleToggleSidebar}
            />

            {/* Content area */}
            <div className="flex-1 flex min-w-0 overflow-hidden relative">
                {/* Sidebar */}
                <Sidebar
                    isCollapsed={isDesktopCollapsed}
                    isOpenMobile={isMobileOpen}
                    onCloseMobile={() => setIsMobileOpen(false)}
                />

                {/* Page Content — responsive padding */}
                <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 overflow-y-auto overflow-x-hidden">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    )
}

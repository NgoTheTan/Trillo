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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
    useWebSocketNotifications()

    return (
        <div className="h-screen w-screen flex bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Header */}
                <Header
                    onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
                />

                {/* Page Content — responsive padding */}
                <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6 overflow-y-auto overflow-x-hidden">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    )
}

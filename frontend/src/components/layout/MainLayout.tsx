import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface MainLayoutProps {
    children?: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children
}) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

    return (
        <div className="h-screen w-screen flex bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Header (No Search Input) */}
                <Header
                    onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
                />

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    )
}

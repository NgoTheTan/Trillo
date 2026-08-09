import React from 'react'

interface TrilloLogoProps {
    className?: string
}

export const TrilloLogo: React.FC<TrilloLogoProps> = ({ className = "w-8 h-8" }) => {
    return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#2563eb" />
            <rect x="6" y="6" width="8" height="11" rx="2.5" fill="#ffffff" />
            <rect x="18" y="6" width="8" height="20" rx="2.5" fill="#ffffff" />
        </svg>
    )
}

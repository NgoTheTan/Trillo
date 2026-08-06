import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import type { ListCardResponse } from '../../services/listCardServices'
import { EditCardModel } from '../listCard/EditCardModel'

interface KanbanCardProps {
  card: ListCardResponse
}

const renderPriorityTag = (priority?: string) => {
  const p = (priority || 'Low').toLowerCase()
  if (p === 'high') {
    return (
      <span className="px-2.5 py-0.5 rounded-md bg-orange-100/80 text-orange-700 font-semibold text-xs inline-block">
        High
      </span>
    )
  }
  if (p === 'medium') {
    return (
      <span className="px-2.5 py-0.5 rounded-md bg-amber-100/80 text-amber-700 font-semibold text-xs inline-block">
        Medium
      </span>
    )
  }
  if (p === 'done') {
    return (
      <span className="px-2.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-700 font-semibold text-xs inline-block">
        Done
      </span>
    )
  }
  return (
    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100/60 text-emerald-700 font-semibold text-xs inline-block">
      Low
    </span>
  )
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card }) => {
  const [openEditCardModal, setOpenEditCardModal] = useState<boolean>(false);

  return (
    <>
      <div
        onClick={() => setOpenEditCardModal(true)}
        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
      >
        {/* Card Title */}
        <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-600 transition-colors">
          {card.title}
        </h3>

        {/* Priority Tag */}
        <div>
          {renderPriorityTag(card.priority)}
        </div>

        {/* Card Footer: Date & User Avatar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-slate-400 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{card.deadline || '25/05/2024'}</span>
          </div>

          {card.assignedMembers && card.assignedMembers.length > 0 && (
            <img
              src={card.assignedMembers[0].avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={card.assignedMembers[0].fullName}
              title={card.assignedMembers[0].fullName}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
            />
          )}
        </div>
      </div>
      <EditCardModel card={card} open={openEditCardModal} onOpenChange={setOpenEditCardModal} />
    </>
  )
}

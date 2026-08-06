import React, { useState } from 'react'
import { Calendar, Check, Trash2 } from 'lucide-react'
import {
  useDeleteCardMutation,
  useToggleCardCompletedMutation,
  type ListCardResponse,
} from '../../services/listCardServices'
import { EditCardModel } from '../listCard/EditCardModel'
import { ConfirmDeleteCardModal } from '../listCard/ConfirmDeleteCardModal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDeadlineDisplay } from '../../utils/dateUtils'
import { useQueryClient } from '@tanstack/react-query'

interface KanbanCardProps {
  card: ListCardResponse
  isOverlay?: boolean
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

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, isOverlay = false }) => {
  const [openEditCardModal, setOpenEditCardModal] = useState<boolean>(false)
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false)
  const deleteCardMutation = useDeleteCardMutation()
  const toggleCompletedMutation = useToggleCardCompletedMutation()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { ...card },
    disabled: isOverlay || openEditCardModal || openDeleteModal,
  })

  const dndKitCardStyle: React.CSSProperties = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    transition: isOverlay ? undefined : transition,
    opacity: isDragging ? 0.7 : 1,
  }

  const handleDeleteCard = async () => {
    try {
      await deleteCardMutation.mutateAsync({ cardId: card.id, listId: card.listId })
      setOpenDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete card:', err)
    }
  }

  const handleToggleComplete = async () => {
    try {
      await toggleCompletedMutation.mutateAsync({
        cardId: card.id,
        completed: !card.completed,
        listId: card.listId,
      })
    } catch (err) {
      console.error('Failed to toggle card completion:', err)
    }
  }

  return (
    <>
      <div
        ref={isOverlay ? undefined : setNodeRef}
        style={dndKitCardStyle}
        {...(isOverlay ? {} : attributes)}
        {...(isOverlay ? {} : listeners)}
        onClick={() => setOpenEditCardModal(true)}
        className={`bg-white rounded-lg p-4 border border-slate-100 transition-all cursor-pointer space-y-3 group/card relative ${
          isOverlay ? 'shadow-xl rotate-1 scale-102 ring-2 ring-blue-500/30' : 'shadow-2xs hover:shadow-md'
        }`}
      >
        {/* Card Header: Checkbox, Title & Trash Icon */}
        <div className="flex items-start justify-between gap-2">
          {/* Completion Check Circle */}
          {!isOverlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleComplete()
              }}
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                card.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white  block'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 hidden group-hover/card:block'
              }`}
              title={card.completed ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {card.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          )}

          {/* Card Title */}
          <h3
            className={`font-semibold text leading-snug transition-colors flex-1 ${
              card.completed
                ? 'line-through text-slate-400'
                : 'text-slate-800 group-hover/card:text-blue-600'
            }`}
          >
            {card.title}
          </h3>

          {/* Delete Trash Icon */}
          {!isOverlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenDeleteModal(true)
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover/card:opacity-100 transition-all cursor-pointer shrink-0"
              title="Delete card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Tag */}
        <div>{renderPriorityTag(card.priority)}</div>

        {/* Card Footer: Date & User Avatar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-slate-400 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDeadlineDisplay(card.deadline)}</span>
          </div>

          {card.assignedMembers && card.assignedMembers.length > 0 && (
            card.assignedMembers[0].avatarUrl ? (
              <img
                src={card.assignedMembers[0].avatarUrl}
                alt={card.assignedMembers[0].fullName}
                title={card.assignedMembers[0].fullName}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div
                title={card.assignedMembers[0].fullName}
                className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 tracking-wider uppercase ring-1 ring-slate-200"
              >
                {card.assignedMembers[0].fullName
                  ? card.assignedMembers[0].fullName.trim().split(/\s+/).length === 1
                    ? card.assignedMembers[0].fullName.substring(0, 2).toUpperCase()
                    : (
                        card.assignedMembers[0].fullName.trim().split(/\s+/)[0][0] +
                        card.assignedMembers[0].fullName.trim().split(/\s+/).slice(-1)[0][0]
                      ).toUpperCase()
                  : 'U'}
              </div>
            )
          )}
        </div>
      </div>

      {/* Edit Card Modal */}
      <EditCardModel card={card} open={openEditCardModal} onOpenChange={setOpenEditCardModal} />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteCardModal
        open={openDeleteModal}
        onOpenChange={setOpenDeleteModal}
        cardTitle={card.title}
        onConfirm={handleDeleteCard}
        isLoading={deleteCardMutation.isPending}
      />
    </>
  )
}

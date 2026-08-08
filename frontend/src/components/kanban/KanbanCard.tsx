import React, { useState } from 'react'
import { Calendar, Check, Trash2 } from 'lucide-react'
import {
  useDeleteCardMutation,
  useToggleCardCompletedMutation,
  type ListCardResponse,
} from '../../services/cardService.ts'
import { EditCardModel } from '../listCard/EditCardModel'
import { ConfirmDeleteCardModal } from '../listCard/ConfirmDeleteCardModal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDeadlineDisplay } from '../../utils/dateUtils'

interface KanbanCardProps {
  isOpenEditCardRef?: React.MutableRefObject<boolean>
  card: ListCardResponse
  isOverlay?: boolean
}

const renderPriorityTag = (priority?: string) => {
  const p = (priority || 'Low').toLowerCase()
  if (p === 'high') {
    return (
      <span className="px-2.5 py-0.5 rounded-md bg-red-100/80 text-red-500 font-semibold text-xs inline-block">
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
        className={`bg-white rounded-lg p-4 border border-slate-100 transition-all cursor-pointer space-y-3 group/card relative ${isOverlay ? 'shadow-xl rotate-1 scale-102 ring-2 ring-blue-500/30' : 'shadow-2xs hover:shadow-md'
          }`}
      >
        {/* Card Header: Checkbox, Title & Trash Icon */}
        <div className="relative pr-6">
          {/* Completion Check Circle — absolute, left-0 */}
          {!isOverlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleComplete()
              }}
              className={`mt-0.5 w-4 h-4 rounded-full absolute left-0 top-0.5 border flex items-center justify-center shrink-0 transition-all cursor-pointer ${card.completed
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 opacity-0 group-hover/card:opacity-100'
                }`}
              title={card.completed ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {card.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          )}

          {/* Card Title — in normal flow, pl slides right on hover to reveal checkbox */}
          <h3
            className={`font-semibold text leading-snug transition-all ${card.completed
              ? 'line-through text-slate-400 pl-5'
              : 'text-slate-800 group-hover/card:text-blue-600 pl-0 group-hover/card:pl-7'
              }`}
          >
            {card.title}
          </h3>

          {/* Delete Trash Icon — absolute top-right */}
          {!isOverlay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenDeleteModal(true)
              }}
              className="p-1 absolute right-0 top-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover/card:opacity-100 transition-all cursor-pointer shrink-0"
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
          <div
            className={`flex items-center gap-1.5 font-medium ${card.deadline && !card.completed && new Date(card.deadline).getTime() < Date.now()
                ? 'text-red-500 font-semibold'
                : 'text-slate-400'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDeadlineDisplay(card.deadline)}
              {card.deadline && !card.completed && new Date(card.deadline).getTime() < Date.now() && ' (Overdue)'}
            </span>
          </div>

          {card.assignedMembers && card.assignedMembers.length > 0 && (
            <div className="flex items-center">
              {card.assignedMembers.slice(0, 3).map((member, idx) => (
                member.avatarUrl ? (
                  <img
                    key={member.id}
                    src={member.avatarUrl}
                    alt={member.fullName}
                    title={member.fullName}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                    style={{ marginLeft: idx > 0 ? '-6px' : '0' }}
                  />
                ) : (
                  <div
                    key={member.id}
                    title={member.fullName}
                    className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 tracking-wider uppercase ring-1 ring-slate-200"
                    style={{ marginLeft: idx > 0 ? '-6px' : '0' }}
                  >
                    {member.fullName
                      ? member.fullName.trim().split(/\s+/).length === 1
                        ? member.fullName.substring(0, 2).toUpperCase()
                        : (member.fullName.trim().split(/\s+/)[0][0] + member.fullName.trim().split(/\s+/).slice(-1)[0][0]).toUpperCase()
                      : 'U'}
                  </div>
                )
              ))}
              {card.assignedMembers.length > 3 && (
                <div
                  className="w-6 h-6 rounded-full bg-slate-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0 tracking-wider ring-1 ring-slate-200"
                  style={{ marginLeft: '-6px' }}
                >
                  +{card.assignedMembers.length - 3}
                </div>
              )}
            </div>
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

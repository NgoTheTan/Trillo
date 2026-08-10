import React, { useState } from 'react'
import { Calendar1, Check, ListSortDescending, MessageSquareText, Paperclip, SquareCheck, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useDeleteCardMutation,
  useToggleCardCompletedMutation,
  useToggleChecklistItemMutation,
  type ListCardResponse,
} from '../../services/cardService.ts'
import { EditCardModel } from '../card/EditCardModel'
import { ConfirmDeleteCardModal } from '../card/ConfirmDeleteCardModal'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDeadlineDisplay } from '../../utils/dateUtils'
import { getAvatarUrl } from '../../auth/authStorage'
import { Button } from '@base-ui/react'

interface KanbanCardProps {
  isOpenEditCardRef?: React.MutableRefObject<boolean>
  card: ListCardResponse
  isOverlay?: boolean
  canEditCard?: boolean
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, isOverlay = false, canEditCard = true }) => {
  const [openEditCardModal, setOpenEditCardModal] = useState<boolean>(false)
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false)
  const [isShowCheckList, setIsShowCheckList] = useState<boolean>(false)
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({})
  const deleteCardMutation = useDeleteCardMutation()
  const toggleCompletedMutation = useToggleCardCompletedMutation()
  const toggleChecklistItemMutation = useToggleChecklistItemMutation()

  const toggleChecklistCollapse = (id: string) => {
    setExpandedChecklists(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { ...card },
    disabled: isOverlay || openEditCardModal || openDeleteModal,
  })

  const dndKitCardStyle: React.CSSProperties = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    transition: isOverlay ? undefined : transition,
    opacity: isDragging ? 0.7 : 1,
    scrollSnapAlign: 'start',
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
    if (!canEditCard) return
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
        className={`bg-white rounded-lg p-3.5 border border-slate-100 transition-all cursor-pointer space-y-2.5 group/card relative touch-none select-none ${isOverlay ? 'shadow-xl rotate-1 scale-[1.02] ring-2 ring-blue-500/30' : 'shadow-xs hover:shadow-md'
          }`}
      >
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 4).map(label => (
              <span
                key={label.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white truncate max-w-[80px]"
                style={{ backgroundColor: label.color || '#94a3b8' }}
                title={label.name}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
        {/* Card Header: Checkbox, Title & Trash Icon */}
        <div className="relative pr-6">
          {/* Completion Check Circle — absolute, left-0 */}
          {!isOverlay && (card.completed || canEditCard) && (
            <button
              type="button"
              disabled={!canEditCard}
              onClick={(e) => {
                e.stopPropagation()
                if (!canEditCard) return
                handleToggleComplete()
              }}
              className={`mt-0.5 w-4 h-4 rounded-full absolute left-0 top-0.5 border flex items-center justify-center shrink-0 transition-all ${!canEditCard ? 'cursor-default' : 'cursor-pointer'
                } ${card.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white opacity-100'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 opacity-0 group-hover/card:opacity-100'
                }`}
              title={!canEditCard ? (card.completed ? 'Đã hoàn thành' : '') : (card.completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành')}
            >
              {card.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </button>
          )}

          {/* Card Title */}
          <h3
            className={`font-semibold text-sm leading-snug transition-all ${card.completed
              ? 'line-through text-slate-400 pl-5'
              : canEditCard
                ? 'text-slate-800 group-hover/card:text-blue-600 pl-0 group-hover/card:pl-6'
                : 'text-slate-800 pl-0'
              }`}
          >
            {card.title}
          </h3>
        </div>

        {/* Card Footer: Stats */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-2 font-medium pt-1.5 border-t border-slate-50 text-slate-400 text-xs">
          {/* Deadline — chỉ hiện khi có */}
          {card.deadline && (
            <div
              className={`flex items-center gap-1 font-medium ${!card.completed && new Date(card.deadline).getTime() < Date.now()
                ? 'text-red-500 font-semibold'
                : 'text-slate-400'
                }`}
            >
              <Calendar1 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{formatDeadlineDisplay(card.deadline)}</span>
            </div>
          )}

          {/* Description icon */}
          {card.description && (
            <span className="text-slate-400">
              <ListSortDescending className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Comment count */}
          {card.commentCount > 0 && (
            <div className="flex items-center gap-1 text-slate-400">
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>{card.commentCount}</span>
            </div>
          )}

          {/* Attachment count */}
          {card.attachmentCount > 0 && (
            <div className="flex items-center gap-1 text-slate-400">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{card.attachmentCount}</span>
            </div>
          )}

          {/* Checklist progress — xanh nếu xong hết, đỏ nếu chưa */}
          {card.checklistTotal > 0 && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setIsShowCheckList(!isShowCheckList)
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] translate-x-[-7px] font-semibold transition-all border cursor-pointer select-none ${isShowCheckList
                ? 'bg-blue-50/80 text-blue-600 border-blue-200 shadow-3xs'
                : 'border-transparent hover:bg-slate-100'
                }`}
            >
              <div
                className={`flex items-center gap-1 font-semibold ${card.checklistCompleted === card.checklistTotal
                  ? 'text-emerald-500'
                    : 'text-red-400'
                  }`}
              >
                <SquareCheck className="w-3.5 h-3.5" />
                <span>{card.checklistCompleted}/{card.checklistTotal}</span>
              </div>
            </Button>
          )}
        </div>
        <div className="w-full flex justify-end">
          {card.assignedMembers && card.assignedMembers.length > 0 && (
            <div className="flex items-center shrink-0 ml-2">
              {card.assignedMembers.slice(0, 3).map((member, idx) => (
                member.avatarUrl ? (
                  <img
                    key={member.id}
                    src={getAvatarUrl(member.avatarUrl)}
                    alt={member.fullName}
                    title={member.fullName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200"
                    style={{ marginLeft: idx > 0 ? '-5px' : '0' }}
                  />
                ) : (
                  <div
                    key={member.id}
                    title={member.fullName}
                    className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[8px] flex items-center justify-center shrink-0 tracking-wider uppercase ring-1 ring-slate-200"
                    style={{ marginLeft: idx > 0 ? '-5px' : '0' }}
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
                  className="w-5 h-5 rounded-full bg-slate-400 text-white font-bold text-[8px] flex items-center justify-center shrink-0 ring-1 ring-slate-200"
                  style={{ marginLeft: '-5px' }}
                >
                  +{card.assignedMembers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checklist dropdown */}
        {isShowCheckList && card.checklists && card.checklists.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-2 border-t border-slate-100 space-y-2 text-xs transition-all duration-300"
          >
            {card.checklists.map((checklist) => {
              const totalItems = checklist.items?.length || 0
              const completedItems = checklist.items?.filter(i => i.completed).length || 0
              const isExpanded = !!expandedChecklists[checklist.id]

              return (
                <div key={checklist.id} className="space-y-1 bg-slate-50/30 p-1.5 rounded-lg border border-slate-200/40">
                  {/* Collapsible Header */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleChecklistCollapse(checklist.id)
                    }}
                    className="flex items-center justify-between py-0.5 px-0.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`p-0.5 rounded transition-all flex items-center justify-center shrink-0 border ${isExpanded
                            ? 'border-blue-500 bg-blue-50/50 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                        )}
                      </span>
                      <span className="truncate text-xs font-medium text-slate-800">{checklist.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      {completedItems}/{totalItems}
                    </span>
                  </div>

                  {/* Checklist items list */}
                  {isExpanded && (
                    <div className="space-y-0.5 pt-1 pl-1 border-t border-dashed border-slate-200/50">
                      {checklist.items?.map((item) => (
                        <div
                          key={item.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await toggleChecklistItemMutation.mutateAsync({
                                itemId: item.id,
                                cardId: card.id,
                              })
                            } catch (err) {
                              console.error("Lỗi toggle checklist item:", err)
                            }
                          }}
                          className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-slate-100/50 cursor-pointer group/item text-slate-600 transition-colors"
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${item.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 bg-white group-hover/item:border-emerald-500 group-hover/item:bg-emerald-50/30'
                              }`}
                          >
                            {item.completed && <Check className="w-2 h-2 stroke-[3]" />}
                          </span>
                          <span
                            className={`text-[11px] leading-tight select-none truncate ${item.completed ? 'line-through text-slate-400' : 'font-medium text-slate-700'
                              }`}
                            title={item.content}
                          >
                            {item.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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

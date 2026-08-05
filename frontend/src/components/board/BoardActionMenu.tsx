import React, { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { deleteBoard, type BoardSummaryResponse } from '../../services/boardServices'
import { DeleteConfirmModal } from './DeleteConfirmModal'

interface BoardActionMenuProps {
  board: BoardSummaryResponse
  onEdit?: (board: BoardSummaryResponse) => void
  onDeleted?: (boardId: string) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  triggerClassName?: string
  iconClassName?: string
}

export const BoardActionMenu: React.FC<BoardActionMenuProps> = ({
  board,
  onEdit,
  onDeleted,
  align = 'end',
  side = 'bottom',
  triggerClassName = 'p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer outline-none',
  iconClassName = 'w-4 h-4',
}) => {
  const [open, setOpen] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Only OWNER has permission to edit or delete the board
  const isOwner = board.currentUserRole === 'OWNER'

  if (!isOwner) {
    return null
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    if (onEdit) onEdit(board)
  }

  const handleOpenDeleteModal = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setShowConfirmDelete(true)
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      await deleteBoard(board.id)
      setShowConfirmDelete(false)
      if (onDeleted) onDeleted(board.id)
    } catch (error) {
      console.error('Failed to delete board:', error)
      alert('Failed to delete board. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          onClick={e => e.stopPropagation()}
          className={triggerClassName}
          title="Board options"
        >
          <MoreHorizontal className={iconClassName} />
        </PopoverTrigger>

        <PopoverContent
          align={align}
          side={side}
          sideOffset={6}
          className="w-44 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 z-50"
          onClick={e => e.stopPropagation()}
        >
          {onEdit && (
            <button
              onClick={handleEdit}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit board</span>
            </button>
          )}

          <button
            onClick={handleOpenDeleteModal}
            className="w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete board</span>
          </button>
        </PopoverContent>
      </Popover>

      <DeleteConfirmModal
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        boardTitle={board.title}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

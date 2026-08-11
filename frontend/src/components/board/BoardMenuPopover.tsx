import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  MoreHorizontal,
  Settings,
  Archive,
  Trash2
} from 'lucide-react'
import { BoardFormModal } from './BoardFormModal'
import { ArchivedItemsModal } from './ArchivedItemsModal'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'
import type { BoardDetailResponse, BoardFormPayload } from '../../services/boardServices'

interface BoardMenuPopoverProps {
  board?: BoardDetailResponse
  isOwner?: boolean
  canViewArchive?: boolean
  canRestoreArchive?: boolean
  onUpdateBoard?: (payload: BoardFormPayload) => void
  onDeleteBoard?: () => void
}

export const BoardMenuPopover: React.FC<BoardMenuPopoverProps> = ({
  board,
  isOwner = false,
  canViewArchive = true,
  canRestoreArchive = true,
  onUpdateBoard,
  onDeleteBoard
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const handleUpdate = (payload: BoardFormPayload) => {
    if (onUpdateBoard) {
      onUpdateBoard(payload)
    }
    setIsSettingsOpen(false)
  }

  const handleDelete = () => {
    if (onDeleteBoard) {
      onDeleteBoard()
    }
    setIsDeleteConfirmOpen(false)
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer outline-none"
          title="Tùy chọn bảng"
        >
          <MoreHorizontal className="w-4 h-4" />
        </PopoverTrigger>

        <PopoverContent className="w-64 p-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 text-slate-800 z-50">
          <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">{board?.title || 'Menu Bảng'}</h4>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">Quản lý và cài đặt bảng này</p>
          </div>

          <div className="space-y-0.5">
            {/* Board Settings option */}
            {isOwner && (
              <button
                onClick={() => {
                  setPopoverOpen(false)
                  setIsSettingsOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-blue-600 rounded-xl transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Cài đặt thông tin bảng</span>
              </button>
            )}

            {/* Archive Section option */}
            {(isOwner || canViewArchive) && (
              <button
                onClick={() => {
                  setPopoverOpen(false)
                  setIsArchiveOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors cursor-pointer"
              >
                <Archive className="w-4 h-4 text-amber-500" />
                <span>Mục Lưu Trữ</span>
              </button>
            )}

            {/* Delete Board option (Owner only) */}
            {isOwner && onDeleteBoard && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setPopoverOpen(false)
                    setIsDeleteConfirmOpen(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Xóa bảng này</span>
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Board Form Modal for Settings */}
      {isSettingsOpen && board && (
        <BoardFormModal
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          onSubmit={handleUpdate}
          initialData={board as any}
          mode="edit"
        />
      )}

      {/* Archive Modal */}
      {isArchiveOpen && (
        <ArchivedItemsModal
          boardId={board?.id}
          open={isArchiveOpen}
          onOpenChange={setIsArchiveOpen}
          isOwner={isOwner}
          canRestore={isOwner || canRestoreArchive}
        />
      )}

      {/* Delete Board Confirm Modal */}
      {isDeleteConfirmOpen && (
        <ConfirmDeleteModal
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          title="Xóa Bảng"
          itemName={board?.title || ''}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}

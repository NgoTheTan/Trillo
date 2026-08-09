import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'

export interface ConfirmDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  itemName?: string
  boardTitle?: string
  isDeleting?: boolean
  onConfirm: () => void
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onOpenChange,
  title = 'Xóa mục',
  description,
  itemName,
  boardTitle,
  isDeleting = false,
  onConfirm,
}) => {
  const targetName = itemName || boardTitle

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 max-w-xs">
            {description || (
              <>
                Bạn có chắc chắn muốn xóa {targetName ? <span className="font-semibold text-slate-800">"{targetName}"</span> : 'mục này'}? Hành động này không thể hoàn tác.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center gap-3 pt-4 border-t border-slate-100 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="flex-1 border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl cursor-pointer"
          >
            Hủy
          </Button>

          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Đang xóa...
              </span>
            ) : (
              'Xóa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import React from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/dialog'

interface ConfirmDeleteCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardTitle?: string
  onConfirm: () => void
  isLoading?: boolean
}

export const ConfirmDeleteCardModal: React.FC<ConfirmDeleteCardModalProps> = ({
  open,
  onOpenChange,
  cardTitle = 'this task',
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md w-[440px] bg-white p-6 rounded-3xl shadow-2xl border border-slate-100">
        {/* Top Header Row */}
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Content */}
        <div className="mt-4 space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Card</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-slate-800">"{cardTitle}"</span>? This action cannot be undone and will permanently remove the card and its contents.
          </p>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Card</span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

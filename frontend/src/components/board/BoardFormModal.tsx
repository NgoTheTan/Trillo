import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Check, Palette } from 'lucide-react'
import type { BoardFormPayload, BoardSummaryResponse } from '../../services/boardServices'

export interface BoardFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (boardData: BoardFormPayload) => void
  initialData?: BoardSummaryResponse | null
  mode?: 'create' | 'edit'
}

const COLOR_OPTIONS = [
  { label: 'Blue', value: '#3b82f6', bgClass: 'bg-blue-500' },
  { label: 'Purple', value: '#8b5cf6', bgClass: 'bg-purple-500' },
  { label: 'Emerald', value: '#10b981', bgClass: 'bg-emerald-500' },
  { label: 'Orange', value: '#f97316', bgClass: 'bg-orange-500' },
  { label: 'Pink', value: '#ec4899', bgClass: 'bg-pink-500' },
  { label: 'Cyan', value: '#06b6d4', bgClass: 'bg-cyan-500' },
]

export const BoardFormModal: React.FC<BoardFormModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create'
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [coverColor, setCoverColor] = useState('#3b82f6')
  const [touched, setTouched] = useState(false)

  const isEdit = mode === 'edit' || Boolean(initialData)
  const isTitleInvalid = touched && !title.trim()

  useEffect(() => {
    if (open) {
      setTouched(false)
      if (initialData) {
        setTitle(initialData.title || '')
        setDescription(initialData.description || '')
        setVisibility(initialData.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
        setCoverColor(initialData.coverColor || '#3b82f6')
      } else {
        setTitle('')
        setDescription('')
        setVisibility('PUBLIC')
        setCoverColor('#3b82f6')
      }
    }
  }, [open, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      visibility,
      coverColor,
    })

    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const isPresetColor = COLOR_OPTIONS.some(
    c => c.value.toLowerCase() === coverColor.toLowerCase()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl bg-white border border-slate-100 shadow-xl">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            {isEdit ? 'EDIT BOARD' : 'CREATE NEW BOARD'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Title Field (Required) */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>
                Board title <span className="text-rose-500 font-bold ml-0.5">*</span>
              </span>
              <span className="text-xs text-rose-500 font-medium">Required</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Alpha"
              value={title}
              onBlur={() => setTouched(true)}
              onChange={e => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none transition-all placeholder:text-slate-400 ${
                isTitleInvalid
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
              }`}
            />
            {isTitleInvalid && (
              <p className="text-xs text-rose-500 font-medium">Board title cannot be empty</p>
            )}
          </div>

          {/* Description Field (Optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Description</span>
              <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter board description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Cover Color Field (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Cover color</span>
                <span className="text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <span className="text-xs font-mono font-medium text-slate-500 uppercase">{coverColor}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCoverColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.bgClass} flex items-center justify-center transition-all cursor-pointer ${
                    coverColor.toLowerCase() === c.value.toLowerCase()
                      ? 'ring-2 ring-offset-2 ring-blue-600 scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {coverColor.toLowerCase() === c.value.toLowerCase() && (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}

              <div className="relative flex items-center">
                <label
                  title="Custom color picker"
                  className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                    !isPresetColor
                      ? 'ring-2 ring-offset-2 ring-blue-600 scale-110'
                      : 'hover:border-slate-400 bg-slate-50'
                  }`}
                  style={{
                    backgroundColor: !isPresetColor ? coverColor : undefined,
                  }}
                >
                  <input
                    type="color"
                    value={coverColor}
                    onChange={e => setCoverColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                  />
                  <Palette
                    className={`w-4 h-4 ${
                      !isPresetColor ? 'text-white drop-shadow-xs' : 'text-slate-500'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Visibility Field */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-slate-800">Visibility</div>

            <div className="space-y-3">
              <div
                onClick={() => setVisibility('PUBLIC')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${visibility === 'PUBLIC'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'PUBLIC'}
                  onChange={() => setVisibility('PUBLIC')}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Public</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Anyone with the link can view
                  </div>
                </div>
              </div>

              <div
                onClick={() => setVisibility('PRIVATE')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${visibility === 'PRIVATE'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'PRIVATE'}
                  onChange={() => setVisibility('PRIVATE')}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Private</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Only members can view
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-sm cursor-pointer"
            >
              {isEdit ? 'Save changes' : 'Create board'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

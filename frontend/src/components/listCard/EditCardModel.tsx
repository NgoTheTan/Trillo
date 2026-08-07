import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown, Search, X, Check, Edit2, Loader2, Palette, Trash } from 'lucide-react'
import {
  type ListCardResponse,
  type CardMember,
  type CardLabel,
  useUpdateCardMutation,
  useToggleCardCompletedMutation,
  useBoardLabelsQuery,
  useCreateBoardLabelMutation,
  useUpdateBoardLabelMutation,
  useDeleteBoardLabelMutation,
  useAddLabelToCardMutation,
  useRemoveLabelFromCardMutation,
  useAssignMemberMutation,
  useUnassignMemberMutation,
} from '../../services/cardService.ts'
import { useBoardDetailQuery } from '../../services/boardServices'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'
import { DateTimeInput } from '../common/DateTimeInput'

interface EditCardModelProps {
  card?: ListCardResponse
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (updatedCardData: Partial<ListCardResponse>) => void
}

interface PriorityOption {
  label: string
  value: 'LOW' | 'MEDIUM' | 'HIGH'
  colorClass: string
}


export interface MemberItem {
  id: string
  fullName: string
  email?: string
  avatarUrl?: string
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'High', value: 'HIGH', colorClass: 'bg-red-500' },
  { label: 'Medium', value: 'MEDIUM', colorClass: 'bg-amber-500' },
  { label: 'Low', value: 'LOW', colorClass: 'bg-emerald-500' },
]

const COLOR_SCHEMES = [
  "#5E60CE",
  "#37D67A",
  "#F5222D",
  "#FA8C16",
  "#13C2C2",
]

const formatToDatetimeLocal = (rawDate?: string | null): string => {
  if (!rawDate || !rawDate.trim()) return ''
  try {
    if (rawDate.includes('T')) {
      return rawDate.slice(0, 16)
    }
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T09:00`
      }
    }
    const d = new Date(rawDate)
    if (!isNaN(d.getTime())) {
      const tzOffset = d.getTimezoneOffset() * 60000
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
    }
  } catch (e) {
  }
  return ''
}

const formatDeadlineForApi = (dateStr?: string | null): string | null => {
  if (!dateStr || !dateStr.trim()) return null
  if (dateStr.length === 16) {
    return `${dateStr}:00`
  }
  if (dateStr.includes('T')) return dateStr
  return dateStr
}

const getInitials = (name?: string) => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const EditCardModel: React.FC<EditCardModelProps> = ({
  card,
  open,
  onOpenChange,
  onSave,
}) => {
  const updateCardMutation = useUpdateCardMutation()
  const toggleCompletedMutation = useToggleCardCompletedMutation()
  const [titleError, setTitleError] = useState('')
  const [deadlineError, setDeadlineError] = useState('')

  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [deadline, setDeadline] = useState(card?.deadline ? formatToDatetimeLocal(card.deadline) : '')
  const [priority, setPriority] = useState<string>(card?.priority || 'MEDIUM')
  const [completed, setCompleted] = useState<boolean>(card?.completed || false)

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const isInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef({
    title: card?.title || '',
    description: card?.description || '',
    deadline: card?.deadline ? formatToDatetimeLocal(card.deadline) : '',
    priority: card?.priority || 'MEDIUM',
    completed: card?.completed || false,
  })

  const [selectedLabels, setSelectedLabels] = useState<CardLabel[]>([])
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false)
  const [newLabelText, setNewLabelText] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_SCHEMES[0])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [labelToDelete, setLabelToDelete] = useState<CardLabel | null>(null)

  const { boardId } = useParams<{ boardId: string }>()
  const boardDetailQuery = useBoardDetailQuery(boardId)
  const { data: boardLabelsData } = useBoardLabelsQuery(boardId)
  const createBoardLabelMutation = useCreateBoardLabelMutation()
  const updateBoardLabelMutation = useUpdateBoardLabelMutation()
  const deleteBoardLabelMutation = useDeleteBoardLabelMutation()
  const addLabelToCardMutation = useAddLabelToCardMutation()
  const removeLabelFromCardMutation = useRemoveLabelFromCardMutation()
  const assignMemberMutation = useAssignMemberMutation()
  const unassignMemberMutation = useUnassignMemberMutation()
  const availableMembers: MemberItem[] = (boardDetailQuery.data?.members || []).map(m => ({
    id: m.user.id,
    fullName: m.user.fullName,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl || '',
  }))
  const [selectedMembers, setSelectedMembers] = useState<MemberItem[]>([])
  const [isMemberPopupOpen, setIsMemberPopupOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  const [isPriorityOpen, setIsPriorityOpen] = useState(false)

  useEffect(() => {
    if (card) {
      const initTitle = card.title || ''
      const initDeadline = card.deadline ? formatToDatetimeLocal(card.deadline) : ''
      const initPriority = card.priority || 'MEDIUM'
      const initCompleted = card.completed || false
      const initDesc = card.description || ''

      setTitle(initTitle)
      setDeadline(initDeadline)
      setPriority(initPriority)
      setCompleted(initCompleted)
      setDescription(initDesc)

      lastSavedRef.current = {
        title: initTitle,
        description: initDesc,
        deadline: initDeadline,
        priority: initPriority,
        completed: initCompleted,
      }

      if (card.labels) {
        setSelectedLabels(card.labels)
      } else {
        setSelectedLabels([])
      }

      if (card.assignedMembers) {
        const mappedMembers: MemberItem[] = card.assignedMembers.map((m: CardMember) => ({
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          avatarUrl: m.avatarUrl ?? undefined
        }))
        setSelectedMembers(mappedMembers)
      } else {
        setSelectedMembers([])
      }

      isInitializedRef.current = true
      setAutoSaveStatus('idle')
    }
  }, [card, open])

  useEffect(() => {
    if (!open || !card?.id || !isInitializedRef.current) return

    if (!title.trim()) {
      setTitleError('Title cannot be empty. Will revert to original title on blur.')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      return
    } else {
      if (titleError) setTitleError('')
    }



    const hasChanged =
      title.trim() !== lastSavedRef.current.title ||
      description !== lastSavedRef.current.description ||
      deadline !== lastSavedRef.current.deadline ||
      priority !== lastSavedRef.current.priority ||
      completed !== lastSavedRef.current.completed

    if (!hasChanged) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setAutoSaveStatus('saving')

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          title: title.trim(),
          description,
          deadline: formatDeadlineForApi(deadline),
          priority: priority.toUpperCase(),
          completed,
        }

        await updateCardMutation.mutateAsync({
          cardId: card.id,
          cardData: payload,
        })

        lastSavedRef.current = {
          title: title.trim(),
          description,
          deadline,
          priority,
          completed,
        }

        setAutoSaveStatus('saved')

        if (onSave) {
          onSave({
            ...(card || {}),
            title: title.trim(),
            description,
            deadline,
            priority: priority as any,
            completed,
            labels: selectedLabels.map(l => ({
              id: l.id,
              boardId: card?.listId || '',
              name: l.name,
              color: l.color,
            })),
            assignedMembers: selectedMembers.map(m => ({
              id: m.id,
              email: m.email || '',
              fullName: m.fullName,
              avatarUrl: m.avatarUrl,
            })),
          })
        }
      } catch (err) {
        console.error('Auto-save error:', err)
        setAutoSaveStatus('error')
      }
    }, 300)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, description, deadline, priority, completed, card?.id, open])

  if (!open) return null

  const togglePriorityOpen = () => {
    setIsPriorityOpen(prev => !prev)
    setIsLabelMenuOpen(false)
    setIsMemberPopupOpen(false)
  }

  const toggleLabelMenuOpen = () => {
    setIsLabelMenuOpen(prev => !prev)
    setIsPriorityOpen(false)
    setIsMemberPopupOpen(false)
    setEditingLabelId(null)
    setNewLabelText('')
  }

  const toggleMemberPopupOpen = () => {
    setIsMemberPopupOpen(prev => !prev)
    setIsPriorityOpen(false)
    setIsLabelMenuOpen(false)
  }

  const handleRemoveLabel = (id: string) => {
    setSelectedLabels(prev => prev.filter(l => l.id !== id))
  }

  const handleToggleSelectLabel = (lbl: CardLabel) => {
    if (selectedLabels.some(l => l.id === lbl.id)) {
      removeLabelFromCardMutation.mutateAsync({ cardId: card?.id!, labelId: lbl.id });
      setSelectedLabels(prev => prev.filter(l => l.id !== lbl.id))
    } else {
      addLabelToCardMutation.mutateAsync({ cardId: card?.id!, labelId: lbl.id });
      setSelectedLabels(prev => [...prev, lbl])
    }
  }

  const handleCreateOrUpdateLabel = () => {
    const trimmed = newLabelText.trim()
    if (!trimmed) return

    if (editingLabelId) {
      updateBoardLabelMutation.mutateAsync({
        labelId: editingLabelId,
        payload: { name: trimmed, color: selectedColor },
        boardId: boardId,
      })
      setEditingLabelId(null)
    } else {
      createBoardLabelMutation.mutateAsync({
        boardId: boardId!,
        payload: { name: trimmed, color: selectedColor },
      })
    }
    setNewLabelText('')
  }

  const handleStartEditLabel = (lbl: CardLabel, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLabelId(lbl.id)
    setNewLabelText(lbl.name)
    const scheme = COLOR_SCHEMES.find(c => c === lbl.color) || COLOR_SCHEMES[0]
    setSelectedColor(scheme)
  }

  const onRequestDeleteLabel = (lbl: CardLabel, e: React.MouseEvent) => {
    e.stopPropagation()
    setLabelToDelete(lbl)
  }

  const handleConfirmDeleteLabel = () => {
    if (labelToDelete) {
      deleteBoardLabelMutation.mutateAsync({ labelId: labelToDelete.id, boardId })
      setSelectedLabels(prev => prev.filter(l => l.id !== labelToDelete.id))
      setLabelToDelete(null)
    }
  }

  const handleToggleMember = (member: MemberItem) => {
    if (selectedMembers.some(m => m.id === member.id)) {
      unassignMemberMutation.mutateAsync({ cardId: card?.id!, userId: member.id })
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id))
    } else {
      assignMemberMutation.mutateAsync({ cardId: card?.id!, userId: member.id })
      setSelectedMembers(prev => [...prev, member])
    }
  }

  const handleRemoveMember = (id: string) => {
    unassignMemberMutation.mutateAsync({ cardId: card?.id!, userId: id })
    setSelectedMembers(prev => prev.filter(m => m.id !== id))
  }

  const filteredMembers = availableMembers.filter(m =>
    m.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  )

  const activePriority = PRIORITY_OPTIONS.find(p => p.value.toLowerCase() === priority.toLowerCase()) || PRIORITY_OPTIONS[1]

  const handleToggleComplete = async () => {
    const nextCompleted = !completed
    setCompleted(nextCompleted)
    if (card?.id) {
      try {
        setAutoSaveStatus('saving')
        await toggleCompletedMutation.mutateAsync({
          cardId: card.id,
          completed: nextCompleted,
          listId: card.listId,
        })
        lastSavedRef.current.completed = nextCompleted
        setAutoSaveStatus('saved')
      } catch (err) {
        console.error('Failed to toggle card completion status:', err)
        setCompleted(!nextCompleted)
        setAutoSaveStatus('error')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-w-2xl w-[640px] max-h-[92vh] overflow-y-auto bg-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-100">
        <DialogHeader className="p-0 space-y-0">
          <DialogTitle className="text-left font-normal">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Add / Edit Task</h2>
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${completed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                      }`}
                  >
                    {completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{completed ? 'Completed' : 'Mark Completed'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (titleError) setTitleError('')
              }}
              onBlur={() => {
                if (!title.trim()) {
                  setTitle(lastSavedRef.current.title || card?.title || '')
                  setTitleError('')
                }
              }}
              placeholder="Enter task title..."
              className={`w-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-50/50 border rounded-lg outline-none focus:bg-white transition-all ${titleError
                ? 'border-red-500 ring-2 ring-red-500/10'
                : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                }`}
            />
            {titleError && (
              <p className="text-xs text-red-500 font-medium mt-1">{titleError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter detailed description..."
              className="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Deadline & Time
              </label>
              <DateTimeInput
              className='w-full h-[37.8px]'
                value={deadline}
                onChange={(newDate) => {
                  if (newDate) {
                    const tzOffset = newDate.getTimezoneOffset() * 60000;
                    const localIso = new Date(newDate.getTime() - tzOffset).toISOString().slice(0, 16);
                    setDeadline(localIso);
                  } else {
                    setDeadline('');
                  }
                  setDeadlineError('');
                }}
              />
              {deadlineError && (
                <p className="text-xs text-red-500 font-semibold mt-1">{deadlineError}</p>
              )}
              {deadline && !completed && new Date(deadline).getTime() < Date.now() && (
                <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                  Overdue
                </p>
              )}
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-slate-700">
                Priority
              </label>
              <button
                type="button"
                onClick={togglePriorityOpen}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-100/60 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${activePriority.colorClass}`} />
                  <span>{activePriority.label}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {isPriorityOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl z-30 overflow-hidden py-1">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPriority(opt.value)
                        setIsPriorityOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${opt.colorClass}`} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-slate-700">Labels</label>
              <div className="flex items-center gap-1.5">
                <div
                  onClick={toggleLabelMenuOpen}
                  className="flex-1 min-h-[42px] flex items-center justify-between px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedLabels.map(lbl => (
                      <span
                        key={lbl.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${lbl.color && lbl.color.startsWith('#') ? 'text-white border-transparent' : lbl.color || 'bg-purple-100 text-purple-700 border-purple-200'
                          }`}
                        style={{ backgroundColor: lbl.color && lbl.color.startsWith('#') ? lbl.color : undefined }}
                      >
                        {lbl.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveLabel(lbl.id)
                          }}
                          className="hover:opacity-75 transition-opacity cursor-pointer ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {selectedLabels.length === 0 && (
                      <span className="text-xs text-slate-400">Select or create labels...</span>
                    )}
                  </div>

                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>

              {isLabelMenuOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">
                      {editingLabelId ? 'Edit Label' : 'Add / Select Labels'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLabelMenuOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newLabelText}
                        onChange={e => setNewLabelText(e.target.value)}
                        placeholder="Enter label name..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleCreateOrUpdateLabel}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
                      >
                        {editingLabelId ? 'Save' : 'Create'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-medium">Color:</span>
                      {COLOR_SCHEMES.map(scheme => (
                        <button
                          key={scheme}
                          type="button"
                          onClick={() => setSelectedColor(scheme)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-transform ${selectedColor === scheme ? 'scale-110 ring-2 ring-blue-500/40' : ''
                            }`}
                          style={{ backgroundColor: scheme }}
                        >
                          {selectedColor === scheme && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      ))}

                      {(() => {
                        const isPreset = COLOR_SCHEMES.includes(selectedColor)
                        return (
                          <div className="relative flex items-center" title="Custom color picker">
                            <label
                              className={`w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${!isPreset
                                ? 'ring-2 ring-offset-1 ring-blue-600 scale-110'
                                : 'hover:border-slate-400 bg-slate-50'
                                }`}
                              style={{
                                backgroundColor: !isPreset ? selectedColor : undefined,
                              }}
                            >
                              <input
                                type="color"
                                value={selectedColor.startsWith('#') ? selectedColor : '#5E60CE'}
                                onChange={e => setSelectedColor(e.target.value)}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                              />
                              <Palette
                                className={`w-2.5 h-2.5 ${!isPreset ? 'text-white drop-shadow-xs' : 'text-slate-500'
                                  }`}
                              />
                            </label>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">Available Labels:</span>
                    {boardLabelsData?.map(lbl => {
                      const isSelected = selectedLabels.some(l => l.id === lbl.id)
                      return (
                        <div
                          key={lbl.id}
                          onClick={() => handleToggleSelectLabel(lbl)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span
                            className={`px-2 py-0.5 rounded border text-xs font-medium ${lbl.color && lbl.color.startsWith('#') ? 'text-white border-transparent' : lbl.color || 'bg-purple-100 text-purple-700 border-purple-200'
                              }`}
                            style={{ backgroundColor: lbl.color && lbl.color.startsWith('#') ? lbl.color : undefined }}
                          >
                            {lbl.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                            <button
                              type="button"
                              onClick={(e) => handleStartEditLabel(lbl, e)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                              title="Edit label name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => onRequestDeleteLabel(lbl, e)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete label"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-slate-700">
                Assignees
              </label>
              <div
                onClick={toggleMemberPopupOpen}
                className="min-h-[42px] flex items-center justify-between px-2.5 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/40 transition-colors"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedMembers.map(m => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200 whitespace-nowrap"
                    >
                      {!!m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.fullName} className="w-4 h-4 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 tracking-wider uppercase">
                          {getInitials(m.fullName)}
                        </div>
                      )}
                      <span className="truncate">{m.fullName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMember(m.id)
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedMembers.length === 0 && (
                    <span className="text-xs text-slate-400">Select members...</span>
                  )}
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </div>

              {isMemberPopupOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">Select Assignees</span>
                    <button
                      type="button"
                      onClick={() => setIsMemberPopupOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={e => setMemberSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredMembers.map(member => {
                      const isSelected = selectedMembers.some(m => m.id === member.id)
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleToggleMember(member)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 border border-blue-100' : 'hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.fullName}
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 tracking-wider uppercase">
                                {getInitials(member.fullName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{member.fullName}</p>
                              {member.email && (
                                <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                              )}
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                            }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      )
                    })}
                    {filteredMembers.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No members found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="p-0 border-t-0">
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 sticky bottom-0 bg-white z-10 w-full">
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Auto-saving</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Saved</span>
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="text-red-500 bg-red-50 px-3 py-1.5 rounded-full text-xs font-semibold">
                  Failed to auto-save
                </div>
              )}
              {autoSaveStatus === 'idle' && (
                <span className="text-xs text-slate-400 font-medium px-1">Auto-saves on change</span>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Label Confirmation Modal */}
      {
        labelToDelete &&
        <ConfirmDeleteModal
          open={!!labelToDelete}
          onOpenChange={() => setLabelToDelete(null)}
          onConfirm={handleConfirmDeleteLabel}
          title="Delete Label"
          description={`Are you sure you want to delete label \`${labelToDelete.name}\`?`}
        />
      }
    </Dialog>
  )
}

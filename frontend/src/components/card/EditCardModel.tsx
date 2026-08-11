import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Search,
  X,
  Check,
  Trash,
  CheckSquare,
  Paperclip,
  MessageSquare,
  MoreHorizontal,
  Plus,
  AlignLeft,
  Calendar,
  Tag,
  FileText,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Copy,
  Archive,
  UserPlus,
  UserMinus,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  type ListCardResponse,
  type CardLabel,
  type ChecklistResponse,
  type CommentResponse,
  type AttachmentResponse,
  type ActivityLogResponse,
  useCardDetailQuery,
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
  useCreateChecklistMutation,
  useUpdateChecklistMutation,
  useDeleteChecklistMutation,
  useAddChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useToggleChecklistItemMutation,
  useDeleteChecklistItemMutation,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddLinkAttachmentMutation,
  useUploadFileAttachmentMutation,
  useDeleteAttachmentMutation,
  useMoveCardMutation,
  useCreateCardMutation,
  useArchiveCardMutation,
  deleteCard,
} from '../../services/cardService.ts'
import { useBoardDetailQuery, useBoardsQuery, type BoardList } from '../../services/boardServices'
import { getAvatarUrl, getCurrentUser } from '../../auth/authStorage'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal'

interface EditCardModelProps {
  card?: ListCardResponse
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (updatedCardData: Partial<ListCardResponse>) => void
}

export interface MemberItem {
  id: string
  fullName: string
  email?: string
  avatarUrl?: string
  isOwner?: boolean
}

type ActivePopover = 'add' | 'member' | 'label' | 'date' | 'checklist' | 'attachment' | 'move' | 'options' | null

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
  } catch (e) {}
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

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch (e) {
    return dateStr
  }
}

const formatDateToDDMMYYYY = (d: Date) => {
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const formatExternalUrl = (url: string) => {
  if (!url) return '#'
  if (url.startsWith('/')) {
    const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:8080'
    return `${backendBase}${url}`
  }
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  return `https://${url}`
}

interface DirectDatePickerPopoverProps {
  value?: string
  reminderValue?: string | null
  onChange: (isoString: string, reminder?: string) => void
  onRemove: () => void
  onClose: () => void
  disabled?: boolean
}

const DirectDatePickerPopover: React.FC<DirectDatePickerPopoverProps> = ({
  value,
  reminderValue,
  onChange,
  onRemove,
  onClose,
  disabled,
}) => {
  const initialDate = React.useMemo(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  }, [value])

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate)
  const [timeStr, setTimeStr] = useState<string>(() => {
    const h = initialDate.getHours().toString().padStart(2, '0')
    const m = initialDate.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  })

  const [hasDueDate, setHasDueDate] = useState(true)
  const [reminderOption, setReminderOption] = useState(() => reminderValue || '1_day_before')

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const prevMonthDays = Array.from({ length: firstDayOfWeek }).map((_, i) => daysInPrevMonth - firstDayOfWeek + 1 + i)
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1)
  const totalCells = prevMonthDays.length + currentMonthDays.length
  const nextMonthDays = Array.from({ length: (7 - (totalCells % 7)) % 7 }).map((_, i) => i + 1)

  const handlePrevMonth = () => setViewMonth(new Date(year, month - 1, 1))
  const handleNextMonth = () => setViewMonth(new Date(year, month + 1, 1))

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  }

  const handleSelectDay = (day: number) => {
    if (disabled) return
    setSelectedDate(new Date(year, month, day))
  }

  const handleSave = () => {
    if (disabled) return
    if (!hasDueDate) {
      onRemove()
      onClose()
      return
    }
    const [hStr, mStr] = timeStr.split(':')
    const h = parseInt(hStr || '0', 10)
    const m = parseInt(mStr || '0', 10)

    const finalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, m)
    const tzOffset = finalDate.getTimezoneOffset() * 60000
    const localIso = new Date(finalDate.getTime() - tzOffset).toISOString().slice(0, 16)
    onChange(localIso, reminderOption)
    onClose()
  }

  const formattedDueDate = formatDateToDDMMYYYY(selectedDate)

  return (
    <div className="absolute left-0 top-full mt-1.5 w-[calc(100vw-48px)] sm:w-80 max-w-[320px] sm:max-w-none max-h-[350px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 sm:p-3.5 space-y-3 text-slate-800">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <span className="text-xs font-bold text-slate-800">Ngày hạn</span>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 capitalize">
              {viewMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">
            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {prevMonthDays.map(d => (
              <div key={`prev-${d}`} className="py-1.5 text-slate-300 pointer-events-none">
                {d}
              </div>
            ))}
            {currentMonthDays.map(d => {
              const thisDay = new Date(year, month, d)
              const isToday = isSameDay(thisDay, new Date())
              const isSelected = hasDueDate && isSameDay(thisDay, selectedDate)

              const todayClass = isToday ? 'underline underline-offset-4 decoration-2 decoration-blue-600 font-bold' : ''
              const cellBgClass = isSelected
                ? 'bg-blue-600 text-white font-bold rounded-lg shadow-2xs'
                : 'hover:bg-slate-100 text-slate-700 rounded-lg'

              return (
                <button
                  key={`curr-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`py-1.5 transition-colors cursor-pointer text-xs ${cellBgClass} ${todayClass}`}
                >
                  {d}
                </button>
              )
            })}
            {nextMonthDays.map(d => (
              <div key={`next-${d}`} className="py-1.5 text-slate-300 pointer-events-none">
                {d}
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-600">Ngày đến hạn</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasDueDate}
                onChange={e => setHasDueDate(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <input
                type="text"
                readOnly
                value={formattedDueDate}
                className="w-28 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-800 font-medium"
                placeholder="dd/mm/yyyy"
              />
              <input
                type="time"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Thiết lập nhắc nhở hạn chót</label>
            <select
              value={reminderOption}
              onChange={e => setReminderOption(e.target.value)}
              className="select-modern"
            >
              <option value="none">Không có</option>
              <option value="at_due">Tại thời điểm đến hạn</option>
              <option value="5_min_before">5 phút trước</option>
              <option value="15_min_before">15 phút trước</option>
              <option value="1_hour_before">1 giờ trước</option>
              <option value="2_hours_before">2 giờ trước</option>
              <option value="1_day_before">1 ngày trước (Mặc định)</option>
              <option value="2_days_before">2 ngày trước</option>
            </select>
            <p className="text-[10px] text-slate-400 font-medium">Thông báo nhắc nhở sẽ được gửi đến tất cả thành viên của thẻ.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={() => {
              onRemove()
              onClose()
            }}
            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
          >
            Xóa
          </button>
        </div>
      </div>
  )
}

interface ModernSelectOption<T extends string | number> {
  value: T
  label: string
}

interface ModernSelectProps<T extends string | number> {
  value: T
  onChange: (val: T) => void
  options: ModernSelectOption<T>[]
  placeholder?: string
}

function ModernSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Chọn...'
}: ModernSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 p-1 space-y-0.5 max-h-48 overflow-y-auto text-xs">
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <div
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold shrink-0 ml-1" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const EditCardModel: React.FC<EditCardModelProps> = ({
  card,
  open,
  onOpenChange,
  onSave,
}) => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  // Fetch full card details
  const cardDetailQuery = useCardDetailQuery(open ? card?.id : undefined)
  const cardDetail = cardDetailQuery.data

  const updateCardMutation = useUpdateCardMutation()
  const toggleCompletedMutation = useToggleCardCompletedMutation()
  const moveCardMutation = useMoveCardMutation()
  const createCardMutation = useCreateCardMutation()
  const archiveCardMutation = useArchiveCardMutation()

  const isArchived = cardDetail?.archived || card?.archived || false

  const handleArchiveCard = async () => {
    if (!card?.id) return
    try {
      await archiveCardMutation.mutateAsync({ cardId: card.id, archived: true, boardId })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to archive card:', err)
    }
  }

  const handleRestoreCard = async () => {
    if (!card?.id) return
    try {
      await archiveCardMutation.mutateAsync({ cardId: card.id, archived: false, boardId })
    } catch (err) {
      console.error('Failed to restore card:', err)
    }
  }

  const handleDeleteCardPermanently = async () => {
    if (!card?.id) return
    try {
      await deleteCard(card.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to delete card permanently:', err)
    }
  }

  // Checklist mutations
  const createChecklistMutation = useCreateChecklistMutation()
  const updateChecklistMutation = useUpdateChecklistMutation()
  const deleteChecklistMutation = useDeleteChecklistMutation()
  const addChecklistItemMutation = useAddChecklistItemMutation()
  const updateChecklistItemMutation = useUpdateChecklistItemMutation()
  const toggleChecklistItemMutation = useToggleChecklistItemMutation()
  const deleteChecklistItemMutation = useDeleteChecklistItemMutation()

  // Comment mutations
  const addCommentMutation = useAddCommentMutation()
  const updateCommentMutation = useUpdateCommentMutation()
  const deleteCommentMutation = useDeleteCommentMutation()

  // Attachment mutations
  const addLinkAttachmentMutation = useAddLinkAttachmentMutation()
  const uploadFileAttachmentMutation = useUploadFileAttachmentMutation()
  const deleteAttachmentMutation = useDeleteAttachmentMutation()

  // Form states
  const [title, setTitle] = useState(card?.title || '')
  const [titleError, setTitleError] = useState('')
  const [description, setDescription] = useState(card?.description || '')
  const [draftDescription, setDraftDescription] = useState(card?.description || '')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [deadline, setDeadline] = useState(card?.deadline ? formatToDatetimeLocal(card.deadline) : '')
  const [reminder, setReminder] = useState<string>(card?.reminder || '1_day_before')
  const [completed, setCompleted] = useState<boolean>(card?.completed || false)

  // Auto-save state
  const [, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const isInitializedRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef({
    title: card?.title || '',
    description: card?.description || '',
    deadline: card?.deadline ? formatToDatetimeLocal(card.deadline) : '',
    completed: card?.completed || false,
  })

  const handleSaveDescription = async () => {
    const targetCardId = cardDetail?.id || card?.id
    if (!targetCardId || !canEditCard) return
    try {
      await updateCardMutation.mutateAsync({
        cardId: targetCardId,
        cardData: { description: draftDescription },
      })
      setDescription(draftDescription)
      lastSavedRef.current.description = draftDescription
      setIsEditingDesc(false)
    } catch (err) {
      console.error('Failed to save description:', err)
    }
  }

  const handleCancelEditDescription = () => {
    setDraftDescription(description)
    setIsEditingDesc(false)
  }

  // Label management
  const [selectedLabels, setSelectedLabels] = useState<CardLabel[]>([])
  const [newLabelText, setNewLabelText] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_SCHEMES[0])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [labelToDelete, setLabelToDelete] = useState<CardLabel | null>(null)

  const boardDetailQuery = useBoardDetailQuery(boardId)
  const { data: userBoards = [] } = useBoardsQuery()
  const isOwner = boardDetailQuery.data?.currentUserRole === 'OWNER'
  const permissions = boardDetailQuery.data?.currentUserPermissions || []

  const canEditCard = isOwner || permissions.includes('EDIT_CARD')

  const { data: boardLabelsData } = useBoardLabelsQuery(boardId)
  const createBoardLabelMutation = useCreateBoardLabelMutation()
  const updateBoardLabelMutation = useUpdateBoardLabelMutation()
  const deleteBoardLabelMutation = useDeleteBoardLabelMutation()
  const addLabelToCardMutation = useAddLabelToCardMutation()
  const removeLabelFromCardMutation = useRemoveLabelFromCardMutation()

  // Member management
  const assignMemberMutation = useAssignMemberMutation()
  const unassignMemberMutation = useUnassignMemberMutation()
  const availableMembers: MemberItem[] = (boardDetailQuery.data?.members || []).map(m => ({
    id: m.user.id,
    fullName: m.user.fullName,
    email: m.user.email,
    avatarUrl: getAvatarUrl(m.user.avatarUrl),
    isOwner: (m.role || '').toUpperCase() === 'OWNER',
  }))
  const [selectedMembers, setSelectedMembers] = useState<MemberItem[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  // Popover Single Control State
  const [activePopover, setActivePopover] = useState<ActivePopover>(null)
  const [newChecklistTitle, setNewChecklistTitle] = useState('Việc cần làm')
  const [optionsSubView, setOptionsSubView] = useState<'main' | 'move' | 'copy'>('main')

  // Move/Copy Form Selections
  const [selectedTargetBoardId, setSelectedTargetBoardId] = useState<string>(boardId || '')
  const [selectedTargetListId, setSelectedTargetListId] = useState<string>(card?.listId || '')
  const [selectedTargetPosition, setSelectedTargetPosition] = useState<number>(0)
  const [copyCardTitle, setCopyCardTitle] = useState('')

  const targetBoardDetailQuery = useBoardDetailQuery(selectedTargetBoardId)
  const targetBoardLists: BoardList[] = targetBoardDetailQuery.data?.lists || []
  const currentTargetList = targetBoardLists.find(l => l.id === selectedTargetListId) || targetBoardLists[0]
  const targetListCardsCount = currentTargetList?.cards?.length || 0

  // Checklist inline states
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null)
  const [editingChecklistTitleText, setEditingChecklistTitleText] = useState('')
  const [addingItemChecklistId, setAddingItemChecklistId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

  // Comment & Activity log state
  const [newCommentText, setNewCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [showActivityDetails, setShowActivityDetails] = useState(false)

  // Attachment input states
  const [attachmentType, setAttachmentType] = useState<'link' | 'file'>('file')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const togglePopover = (name: ActivePopover) => {
    setActivePopover(prev => (prev === name ? null : name))
    if (name === 'options') {
      setOptionsSubView('main')
    }
  }

  // Sync state when card or cardDetail changes
  useEffect(() => {
    const activeCard = cardDetail || card
    if (activeCard) {
      const initTitle = activeCard.title || ''
      const initDeadline = activeCard.deadline ? formatToDatetimeLocal(activeCard.deadline) : ''
      const initReminder = activeCard.reminder || '1_day_before'
      const initCompleted = activeCard.completed || false
      const initDesc = activeCard.description || ''

      setTitle(initTitle)
      setDeadline(initDeadline)
      setReminder(initReminder)
      setCompleted(initCompleted)
      setDescription(initDesc)
      if (!isEditingDesc) {
        setDraftDescription(initDesc)
      }
      setCopyCardTitle(`${initTitle} (Bản sao)`)

      setSelectedTargetBoardId(boardId || (activeCard as any).boardId || '')
      setSelectedTargetListId(activeCard.listId || '')
      setSelectedTargetPosition((activeCard.position ?? 0) + 1)

      lastSavedRef.current = {
        title: initTitle,
        description: initDesc,
        deadline: initDeadline,
        completed: initCompleted,
      }

      if (activeCard.labels) {
        setSelectedLabels(activeCard.labels)
      } else {
        setSelectedLabels([])
      }

      if (activeCard.assignedMembers) {
        const mappedMembers: MemberItem[] = activeCard.assignedMembers.map((m: any) => {
          const boardMember = (boardDetailQuery.data?.members || []).find(bm => bm.user.id === m.id)
          return {
            id: m.id,
            fullName: m.fullName,
            email: m.email,
            avatarUrl: getAvatarUrl(m.avatarUrl),
            isOwner: (boardMember?.role || '').toUpperCase() === 'OWNER',
          }
        })
        setSelectedMembers(mappedMembers)
      } else {
        setSelectedMembers([])
      }

      isInitializedRef.current = true
      setAutoSaveStatus('idle')
    }
  }, [card, cardDetail, open, boardId, boardDetailQuery.data?.members, isEditingDesc])

  // Reset target list when target board changes
  useEffect(() => {
    if (targetBoardLists.length > 0 && !targetBoardLists.some(l => l.id === selectedTargetListId)) {
      setSelectedTargetListId(targetBoardLists[0].id)
    }
  }, [selectedTargetBoardId, targetBoardLists])

  // Close popups on modal close
  useEffect(() => {
    if (!open) {
      setActivePopover(null)
      setOptionsSubView('main')
      setIsEditingDesc(false)
    }
  }, [open])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!activePopover) return
      const target = event.target as Element | null
      if (target && !target.closest('.popover-container')) {
        setActivePopover(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activePopover])

  // Auto-save effect for title, deadline, completed (Description is saved explicitly via Save button)
  useEffect(() => {
    if (!open || !card?.id || !isInitializedRef.current || !canEditCard) return

    if (!title.trim()) {
      setTitleError('Tên thẻ không được để trống.')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      return
    } else {
      if (titleError) setTitleError('')
    }

    const hasChanged =
      title.trim() !== lastSavedRef.current.title ||
      deadline !== lastSavedRef.current.deadline ||
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
          deadline: formatDeadlineForApi(deadline),
          completed,
        }

        await updateCardMutation.mutateAsync({
          cardId: card.id,
          cardData: payload,
        })

        lastSavedRef.current = {
          title: title.trim(),
          description: lastSavedRef.current.description,
          deadline,
          completed,
        }

        setAutoSaveStatus('saved')

        if (onSave) {
          onSave({
            ...(card || {}),
            title: title.trim(),
            description,
            deadline,
            completed,
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
  }, [title, description, deadline, completed, card?.id, open])

  if (!open) return null

  // Labels & Members handlers
  const handleToggleSelectLabel = async (lbl: CardLabel) => {
    if (!card?.id) return
    if (selectedLabels.some(l => l.id === lbl.id)) {
      await removeLabelFromCardMutation.mutateAsync({ cardId: card.id, labelId: lbl.id })
      setSelectedLabels(prev => prev.filter(l => l.id !== lbl.id))
    } else {
      await addLabelToCardMutation.mutateAsync({ cardId: card.id, labelId: lbl.id })
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

  const handleToggleMember = async (member: MemberItem) => {
    if (!card?.id) return
    if (selectedMembers.some(m => m.id === member.id)) {
      await unassignMemberMutation.mutateAsync({ cardId: card.id, userId: member.id })
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id))
    } else {
      await assignMemberMutation.mutateAsync({ cardId: card.id, userId: member.id })
      setSelectedMembers(prev => [...prev, member])
    }
  }

  const handleToggleCurrentMemberJoin = async () => {
    if (!card?.id || !currentUser) return
    const isJoined = selectedMembers.some(m => m.id === currentUser.id)
    if (isJoined) {
      await unassignMemberMutation.mutateAsync({ cardId: card.id, userId: currentUser.id })
      setSelectedMembers(prev => prev.filter(m => m.id !== currentUser.id))
    } else {
      await assignMemberMutation.mutateAsync({ cardId: card.id, userId: currentUser.id })
      setSelectedMembers(prev => [...prev, {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: getAvatarUrl(currentUser.avatarUrl),
      }])
    }
  }

  const handleToggleComplete = async () => {
    if (!card?.id || !canEditCard) return
    const nextCompleted = !completed
    setCompleted(nextCompleted)
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
      console.error('Failed to toggle completion:', err)
      setCompleted(!nextCompleted)
      setAutoSaveStatus('error')
    }
  }

  // Move & Copy actions
  const handleExecuteMoveCard = async () => {
    if (!card?.id || !selectedTargetListId) return
    try {
      await moveCardMutation.mutateAsync({
        cardId: card.id,
        targetListId: selectedTargetListId,
        targetPosition: Math.max(0, selectedTargetPosition - 1),
      })
      setActivePopover(null)
      setOptionsSubView('main')
      if (selectedTargetBoardId !== boardId) {
        onOpenChange(false)
        navigate(`/b/${selectedTargetBoardId}`)
      }
    } catch (err) {
      console.error('Failed to move card:', err)
    }
  }

  const handleExecuteCopyCard = async () => {
    if (!copyCardTitle.trim() || !selectedTargetListId) return
    try {
      await createCardMutation.mutateAsync({
        listId: selectedTargetListId,
        payload: {
          title: copyCardTitle.trim(),
        },
      })
      setActivePopover(null)
      setOptionsSubView('main')
    } catch (err) {
      console.error('Failed to copy card:', err)
    }
  }

  // Checklist Actions
  const handleCreateChecklist = async () => {
    if (!card?.id || !newChecklistTitle.trim()) return
    await createChecklistMutation.mutateAsync({ cardId: card.id, title: newChecklistTitle.trim() })
    setNewChecklistTitle('Việc cần làm')
    setActivePopover(null)
  }

  const handleSaveChecklistTitle = async (checklistId: string) => {
    if (!card?.id || !editingChecklistTitleText.trim()) return
    await updateChecklistMutation.mutateAsync({
      checklistId,
      title: editingChecklistTitleText.trim(),
      cardId: card.id,
    })
    setEditingChecklistId(null)
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!card?.id) return
    await deleteChecklistMutation.mutateAsync({ checklistId, cardId: card.id })
  }

  const handleAddChecklistItem = async (checklistId: string) => {
    if (!card?.id || !newItemText.trim()) return
    await addChecklistItemMutation.mutateAsync({
      checklistId,
      content: newItemText.trim(),
      cardId: card.id,
    })
    setNewItemText('')
  }

  const handleToggleItem = async (itemId: string) => {
    if (!card?.id) return
    await toggleChecklistItemMutation.mutateAsync({ itemId, cardId: card.id })
  }

  const handleSaveItemContent = async (itemId: string) => {
    if (!card?.id || !editingItemText.trim()) return
    await updateChecklistItemMutation.mutateAsync({
      itemId,
      content: editingItemText.trim(),
      cardId: card.id,
    })
    setEditingItemId(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!card?.id) return
    await deleteChecklistItemMutation.mutateAsync({ itemId, cardId: card.id })
  }

  // Comment Actions
  const handleAddComment = async () => {
    if (!card?.id || !newCommentText.trim()) return
    await addCommentMutation.mutateAsync({ cardId: card.id, content: newCommentText.trim() })
    setNewCommentText('')
  }

  const handleSaveComment = async (commentId: string) => {
    if (!card?.id || !editingCommentText.trim()) return
    await updateCommentMutation.mutateAsync({
      commentId,
      content: editingCommentText.trim(),
      cardId: card.id,
    })
    setEditingCommentId(null)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!card?.id) return
    await deleteCommentMutation.mutateAsync({ commentId, cardId: card.id })
  }

  // Attachment Actions
  const handleAddAttachment = async () => {
    if (!card?.id) return
    if (attachmentType === 'link') {
      if (!attachmentUrl.trim()) return
      let finalUrl = attachmentUrl.trim()
      if (!finalUrl.startsWith('/') && !/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`
      }
      await addLinkAttachmentMutation.mutateAsync({
        cardId: card.id,
        fileUrl: finalUrl,
        fileName: attachmentName.trim() || attachmentUrl.trim(),
      })
    } else {
      if (!selectedFile) return
      await uploadFileAttachmentMutation.mutateAsync({
        cardId: card.id,
        file: selectedFile,
      })
    }
    setAttachmentUrl('')
    setAttachmentName('')
    setSelectedFile(null)
    setActivePopover(null)
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!card?.id) return
    await deleteAttachmentMutation.mutateAsync({ attachmentId, cardId: card.id })
  }

  // Data collections from query or summary prop
  const checklists: ChecklistResponse[] = cardDetail?.checklists || []
  const comments: CommentResponse[] = cardDetail?.comments || []
  const attachments: AttachmentResponse[] = cardDetail?.attachments || []
  const activityLogs: ActivityLogResponse[] = cardDetail?.activityLogs || []

  // Combine comments and important activity logs into a single timeline sorted by date (newest first)
  interface CombinedFeedItem {
    id: string
    type: 'comment' | 'log'
    user?: any
    content?: string
    action?: string
    detail?: string
    createdAt: string
    rawComment?: CommentResponse
  }

  // Filter out redundant "commented" activity log entries since comments are already rendered
  const filteredActivityLogs = activityLogs.filter(log => {
    const act = (log.action || '').toLowerCase()
    const det = (log.detail || '').toLowerCase()
    return !act.includes('comment') && !det.includes('comment') && !det.includes('bình luận')
  })

  const feedItems: CombinedFeedItem[] = [
    ...comments.map(c => ({
      id: c.id,
      type: 'comment' as const,
      user: c.author,
      content: c.content,
      createdAt: c.createdAt,
      rawComment: c,
    })),
    ...filteredActivityLogs.map(l => ({
      id: l.id,
      type: 'log' as const,
      user: l.user,
      action: l.action,
      detail: l.detail,
      createdAt: l.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Helper to translate activity log text & move details to Vietnamese
  const formatActivityLogText = (action?: string, detail?: string) => {
    const act = (action || '').toLowerCase()
    const det = (detail || '').toLowerCase()
    const rawText = detail || action || ''

    // 1. Move logs: "di chuyển từ list nào sang list nào"
    if (act.includes('move') || det.includes('move') || det.includes('di chuyển') || det.includes('chuyển')) {
      const fromToMatch = detail?.match(/(?:from|từ)\s+["']?([^"']+)["']?\s+(?:to|sang)\s+["']?([^"']+)["']?/i)
      if (fromToMatch) {
        return `đã di chuyển thẻ từ danh sách "${fromToMatch[1]}" sang "${fromToMatch[2]}"`
      }
      return `đã di chuyển thẻ sang danh sách mới`
    }

    // 2. Creation logs
    if (act.includes('create') || det.includes('create') || act.includes('tạo') || det.includes('tạo') || det.includes('added card')) {
      return 'đã tạo thẻ này'
    }

    // 3. Copy logs
    if (act.includes('copy') || det.includes('copy') || det.includes('sao chép')) {
      const copyMatch = detail?.match(/(?:from|từ)\s+["']?([^"']+)["']?/i)
      if (copyMatch) {
        return `đã sao chép từ thẻ "${copyMatch[1]}"`
      }
      return 'đã sao chép thẻ này'
    }

    // 4. Completion logs
    if (det.includes('marked complete') || det.includes('đánh dấu hoàn thành') || (act.includes('complete') && !det.includes('incomplete'))) {
      return 'đã đánh dấu hoàn thành thẻ'
    }
    if (det.includes('marked incomplete') || det.includes('chưa hoàn thành')) {
      return 'đã đánh dấu chưa hoàn thành thẻ'
    }

    // 5. Member logs
    if (det.includes('assigned') || act.includes('assign')) {
      const memberMatch = detail?.match(/assigned\s+(.+)/i)
      if (memberMatch) {
        return `đã thêm thành viên ${memberMatch[1]} vào thẻ`
      }
      return 'đã thêm thành viên vào thẻ'
    }
    if (det.includes('unassigned') || det.includes('removed member') || act.includes('unassign')) {
      const memberMatch = detail?.match(/(?:unassigned|removed)\s+(.+)/i)
      if (memberMatch) {
        return `đã xóa thành viên ${memberMatch[1]} khỏi thẻ`
      }
      return 'đã xóa thành viên khỏi thẻ'
    }
    if (det.includes('joined') || act.includes('join')) {
      return 'đã tham gia thẻ'
    }
    if (det.includes('left') || act.includes('leave')) {
      return 'đã rời khỏi thẻ'
    }

    // 6. Deadline logs
    if (det.includes('deadline') || det.includes('due date') || det.includes('ngày đến hạn') || det.includes('hạn chót')) {
      if (det.includes('removed') || det.includes('deleted') || det.includes('xóa')) {
        return 'đã xóa ngày đến hạn của thẻ'
      }
      return 'đã cập nhật ngày đến hạn của thẻ'
    }

    // 7. Checklist logs
    if (det.includes('checklist')) {
      if (det.includes('removed') || det.includes('deleted') || det.includes('xóa')) {
        return 'đã xóa danh sách việc cần làm'
      }
      if (det.includes('added') || det.includes('created') || det.includes('tạo')) {
        return 'đã thêm danh sách việc cần làm'
      }
      return 'đã cập nhật danh sách việc cần làm'
    }

    // 8. Attachment logs
    if (det.includes('attachment') || det.includes('đính kèm')) {
      if (det.includes('removed') || det.includes('deleted') || det.includes('xóa')) {
        return 'đã xóa tệp đính kèm'
      }
      return 'đã thêm tệp đính kèm mới'
    }

    // 9. Generic updates
    if (det.includes('card updated') || act.includes('update')) {
      return 'đã cập nhật thông tin thẻ'
    }

    if (rawText.toLowerCase().startsWith('đã ')) {
      return rawText
    }

    return `đã ${rawText.toLowerCase()}`
  }

  // Helper to detect card creation activity log entries
  const isCreationLog = (item: CombinedFeedItem) => {
    if (item.type !== 'log') return false
    const act = (item.action || '').toLowerCase()
    const det = (item.detail || '').toLowerCase()
    return (
      act.includes('create') ||
      act.includes('tạo') ||
      det.includes('create') ||
      det.includes('tạo') ||
      det.includes('thêm thẻ') ||
      det.includes('thẻ được tạo') ||
      det.includes('added card')
    )
  }

  // Filter feed items: When hidden, show ONLY comments and card creation info. When shown, show all activity logs.
  const displayedFeedItems = showActivityDetails
    ? feedItems
    : feedItems.filter(item => item.type === 'comment' || isCreationLog(item))

  const filteredMembers = availableMembers.filter(m =>
    m.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  )

  const currentListTitle = cardDetail?.listTitle || card?.listId || 'Cột'
  const isCurrentMemberJoined = !!currentUser && selectedMembers.some(m => m.id === currentUser.id)

  const hasMembers = selectedMembers.length > 0
  const hasLabels = selectedLabels.length > 0
  const hasDate = !!deadline

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[95vw] lg:max-w-6xl lg:w-[1140px] h-[95vh] lg:h-[92vh] flex flex-col bg-white text-slate-800 p-4 sm:p-6 lg:p-7 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-100 select-none overflow-hidden"
      >
        {isArchived && (
          <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 font-semibold shadow-2xs shrink-0">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Thẻ này đang ở trong Mục Lưu Trữ</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreCard}
                disabled={archiveCardMutation.isPending}
                className="px-2.5 py-1 bg-white border border-amber-300 hover:border-emerald-500 text-slate-800 hover:text-emerald-700 font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Khôi phục
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleDeleteCardPermanently}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  Xóa vĩnh viễn
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Bar Header */}
        <DialogHeader className="p-0 space-y-0 shrink-0">
          <DialogTitle className="text-left font-normal">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              {/* Left Side: List Name Button Trigger for Move */}
              <div className="relative popover-container flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePopover('move')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer border border-blue-200/60"
                >
                  <span>{currentListTitle}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                </button>

                {/* Move Card Dropdown Popover */}
                {activePopover === 'move' && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3.5 text-slate-800 animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800">Di chuyển thẻ</span>
                      <button type="button" onClick={() => setActivePopover(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-500 font-semibold mb-1.5">Bảng làm việc</label>
                        <select
                          value={selectedTargetBoardId}
                          onChange={e => setSelectedTargetBoardId(e.target.value)}
                          className="select-modern"
                        >
                          {userBoards.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1.5">Danh sách (Cột)</label>
                        <select
                          value={selectedTargetListId}
                          onChange={e => setSelectedTargetListId(e.target.value)}
                          className="select-modern"
                        >
                          {targetBoardLists.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-semibold mb-1.5">Vị trí</label>
                        <select
                          value={selectedTargetPosition}
                          onChange={e => setSelectedTargetPosition(Number(e.target.value))}
                          className="select-modern"
                        >
                          {Array.from({ length: targetListCardsCount + 1 }).map((_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {idx + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteMoveCard}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Di chuyển
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Options Menu (...) & Close (X) Only */}
              <div className="flex items-center gap-2">
                {/* Three Dots Menu Options Dropdown */}
                <div className="relative popover-container">
                  <button
                    type="button"
                    onClick={() => togglePopover('options')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Tùy chọn khác"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {activePopover === 'options' && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                      {/* Main Menu Sub-view */}
                      {optionsSubView === 'main' && (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800">Thao tác thẻ</span>
                            <button type="button" onClick={() => setActivePopover(null)}>
                              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                            </button>
                          </div>

                          <div className="space-y-1 text-xs font-medium">
                            <button
                              type="button"
                              onClick={handleToggleCurrentMemberJoin}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 cursor-pointer"
                            >
                              {isCurrentMemberJoined ? (
                                <>
                                  <UserMinus className="w-4 h-4 text-red-500" />
                                  <span>Rời khỏi thẻ</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 text-blue-600" />
                                  <span>Tham gia thẻ</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setOptionsSubView('move')}
                              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                                <span>Di chuyển</span>
                              </div>
                              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setOptionsSubView('copy')}
                              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <Copy className="w-4 h-4 text-slate-500" />
                                <span>Copy (Tạo bản sao)</span>
                              </div>
                              <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-400" />
                            </button>

                            <button
                              type="button"
                              onClick={handleArchiveCard}
                              disabled={archiveCardMutation.isPending}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-800 font-medium cursor-pointer"
                              title="Lưu trữ thẻ này"
                            >
                              <Archive className="w-4 h-4 text-amber-600" />
                              <span>Lưu trữ thẻ</span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Move Card Sub-view */}
                      {optionsSubView === 'move' && (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => setOptionsSubView('main')}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">Di chuyển thẻ</span>
                            <button type="button" onClick={() => setActivePopover(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Bảng làm việc</label>
                              <ModernSelect
                                value={selectedTargetBoardId}
                                onChange={val => setSelectedTargetBoardId(val)}
                                options={userBoards.map(b => ({ value: b.id, label: b.title }))}
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Danh sách (Cột)</label>
                              <ModernSelect
                                value={selectedTargetListId}
                                onChange={val => setSelectedTargetListId(val)}
                                options={targetBoardLists.map(l => ({ value: l.id, label: l.title }))}
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Vị trí</label>
                              <ModernSelect
                                value={selectedTargetPosition}
                                onChange={val => setSelectedTargetPosition(val)}
                                options={Array.from({ length: targetListCardsCount + 1 }).map((_, idx) => ({
                                  value: idx + 1,
                                  label: String(idx + 1)
                                }))}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleExecuteMoveCard}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                              Di chuyển
                            </button>
                          </div>
                        </>
                      )}

                      {/* Copy Card Sub-view */}
                      {optionsSubView === 'copy' && (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => setOptionsSubView('main')}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">Tạo bản sao thẻ</span>
                            <button type="button" onClick={() => setActivePopover(null)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Tên bản sao</label>
                              <input
                                type="text"
                                value={copyCardTitle}
                                onChange={e => setCopyCardTitle(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Bảng sao chép tới</label>
                              <ModernSelect
                                value={selectedTargetBoardId}
                                onChange={val => setSelectedTargetBoardId(val)}
                                options={userBoards.map(b => ({ value: b.id, label: b.title }))}
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-semibold mb-1.5">Danh sách (Cột)</label>
                              <ModernSelect
                                value={selectedTargetListId}
                                onChange={val => setSelectedTargetListId(val)}
                                options={targetBoardLists.map(l => ({ value: l.id, label: l.title }))}
                              />
                            </div>

                            <button
                              type="button"
                              disabled={!copyCardTitle.trim()}
                              onClick={handleExecuteCopyCard}
                              className="w-full py-2 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Tạo bản sao
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Modal Main 2-Column Parallel Body (Gap 0: Left expands to border, Right stays 340px) */}
        <div className="flex flex-col md:flex-row gap-0 pt-4 min-h-0 flex-1 overflow-hidden">
          {/* Left Column: Card Title, Action Buttons, Waterfall Metadata, Details (Expands directly to right column border) */}
          <div className="flex-1 min-w-0 space-y-6 overflow-y-auto pr-4 max-h-[calc(92vh-100px)]">
            {/* Sticky Scaffold Title & Action Row */}
            <div className="sticky top-0 bg-white z-20 pb-3 pt-1 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={handleToggleComplete}
                    className={`mt-1.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="flex-1">
                    <input
                      type="text"
                      disabled={!canEditCard}
                      value={title}
                      onChange={e => {
                        if (!canEditCard) return
                        setTitle(e.target.value)
                        if (titleError) setTitleError('')
                      }}
                      className={`w-full px-2 py-1 text-xl font-bold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-blue-500 rounded-lg outline-none transition-all ${
                        completed ? 'line-through text-slate-400' : ''
                      }`}
                      placeholder="Nhập tên thẻ..."
                    />
                    {titleError && <p className="text-xs text-red-500 font-medium mt-1 pl-2">{titleError}</p>}
                  </div>
                </div>
              </div>

              {/* Action Pills Bar Directly Below Title */}
              <div className="flex items-center gap-2 flex-wrap pl-8">
                {/* Dedicated Member Pill - Hidden if hasMembers */}
                {!hasMembers && (
                  <div className="relative popover-container">
                    <button
                      type="button"
                      onClick={() => togglePopover('member')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Thành viên</span>
                    </button>

                    {activePopover === 'member' && canEditCard && (
                      <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800">Thành viên</span>
                          <button type="button" onClick={() => setActivePopover(null)}>
                            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={memberSearchQuery}
                            onChange={e => setMemberSearchQuery(e.target.value)}
                            placeholder="Tìm thành viên..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {filteredMembers.map(member => {
                            const isSelected = selectedMembers.some(m => m.id === member.id)
                            return (
                              <div
                                key={member.id}
                                onClick={() => handleToggleMember(member)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {member.avatarUrl ? (
                                    <img
                                      src={getAvatarUrl(member.avatarUrl)}
                                      alt={member.fullName}
                                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                                      {getInitials(member.fullName)}
                                    </div>
                                  )}
                                  <span className="text-xs font-medium truncate">{member.fullName}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Labels Pill - Hidden if hasLabels */}
                {!hasLabels && (
                  <div className="relative popover-container">
                    <button
                      type="button"
                      onClick={() => togglePopover('label')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                    >
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nhãn</span>
                    </button>

                    {activePopover === 'label' && (
                      <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800">Nhãn thẻ</span>
                          <button type="button" onClick={() => setActivePopover(null)}>
                            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newLabelText}
                              onChange={e => setNewLabelText(e.target.value)}
                              placeholder="Tên nhãn..."
                              className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleCreateOrUpdateLabel}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
                            >
                              {editingLabelId ? 'Lưu' : 'Tạo'}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {COLOR_SCHEMES.map(scheme => (
                              <button
                                key={scheme}
                                type="button"
                                onClick={() => setSelectedColor(scheme)}
                                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                                  selectedColor === scheme ? 'ring-2 ring-blue-500 scale-110' : ''
                                }`}
                                style={{ backgroundColor: scheme }}
                              >
                                {selectedColor === scheme && <Check className="w-3 h-3 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto pt-1 border-t border-slate-100">
                          {boardLabelsData?.map(lbl => {
                            const isSelected = selectedLabels.some(l => l.id === lbl.id)
                            return (
                              <div
                                key={lbl.id}
                                onClick={() => handleToggleSelectLabel(lbl)}
                                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                              >
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                                  style={{ backgroundColor: lbl.color || '#5E60CE' }}
                                >
                                  {lbl.name}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dates Pill - Hidden if hasDate */}
                {!hasDate && (
                  <div className="relative popover-container">
                    <button
                      type="button"
                      onClick={() => togglePopover('date')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ngày hạn</span>
                    </button>

                    {activePopover === 'date' && (
                      <DirectDatePickerPopover
                        value={deadline}
                        disabled={!canEditCard}
                        onChange={async iso => {
                          setDeadline(iso)
                          if (card?.id && canEditCard) {
                            await updateCardMutation.mutateAsync({
                              cardId: card.id,
                              cardData: { deadline: iso },
                            })
                            lastSavedRef.current.deadline = iso
                          }
                        }}
                        onRemove={async () => {
                          setDeadline('')
                          if (card?.id && canEditCard) {
                            await updateCardMutation.mutateAsync({
                              cardId: card.id,
                              cardData: { deadline: null },
                            })
                            lastSavedRef.current.deadline = ''
                          }
                        }}
                        onClose={() => setActivePopover(null)}
                      />
                    )}
                  </div>
                )}

                {/* Checklist Pill */}
                <div className="relative popover-container">
                  <button
                    type="button"
                    onClick={() => togglePopover('checklist')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>Việc cần làm</span>
                  </button>

                  {activePopover === 'checklist' && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800">Thêm danh sách công việc</span>
                        <button type="button" onClick={() => setActivePopover(null)}>
                          <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-600">Tiêu đề danh sách</label>
                        <input
                          type="text"
                          value={newChecklistTitle}
                          onChange={e => setNewChecklistTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800"
                          placeholder="Việc cần làm..."
                        />
                        <button
                          type="button"
                          onClick={handleCreateChecklist}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachment Pill */}
                <div className="relative popover-container">
                  <button
                    type="button"
                    onClick={() => togglePopover('attachment')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Đính kèm</span>
                  </button>

                  {activePopover === 'attachment' && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-4 space-y-4 text-slate-800">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800">Đính kèm tệp hoặc link</span>
                        <button type="button" onClick={() => setActivePopover(null)}>
                          <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                        </button>
                      </div>

                      {/* Mode Toggle Tabs */}
                      <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setAttachmentType('file')}
                          className={`flex-1 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                            attachmentType === 'file' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          Tệp máy tính
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachmentType('link')}
                          className={`flex-1 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                            attachmentType === 'link' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          Đường dẫn (URL)
                        </button>
                      </div>

                      {attachmentType === 'file' ? (
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-slate-600">Chọn tệp để tải lên</label>
                          <input
                            type="file"
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                          />
                          <button
                            type="button"
                            disabled={!selectedFile}
                            onClick={handleAddAttachment}
                            className="w-full py-1.5 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                          >
                            Tải tệp lên
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Dán liên kết (URL)</label>
                            <input
                              type="text"
                              value={attachmentUrl}
                              onChange={e => setAttachmentUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên hiển thị (tùy chọn)</label>
                            <input
                              type="text"
                              value={attachmentName}
                              onChange={e => setAttachmentName(e.target.value)}
                              placeholder="Tên tài liệu..."
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-800"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!attachmentUrl.trim()}
                            onClick={handleAddAttachment}
                            className="w-full py-1.5 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                          >
                            Gắn đường dẫn
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Waterfall Section: Members, Labels, Dates */}
              {(hasMembers || hasLabels || hasDate) && (
                <div className="flex flex-wrap items-start gap-5 pl-8 pt-1">
                  {/* Thành viên (Members Waterfall) */}
                  {hasMembers && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Thành viên</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedMembers.map(m => (
                          <div
                            key={m.id}
                            onClick={() => handleToggleMember(m)}
                            className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-red-400 transition-all"
                            title={`${m.fullName} (Click để xóa)`}
                          >
                            {m.avatarUrl ? (
                              <img src={getAvatarUrl(m.avatarUrl)} alt={m.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-700">{getInitials(m.fullName)}</span>
                            )}
                          </div>
                        ))}
                        <div className="relative popover-container">
                          <button
                            type="button"
                            onClick={() => togglePopover('member')}
                            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            title="Thêm thành viên"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Member Popover inside Waterfall */}
                          {activePopover === 'member' && canEditCard && (
                            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800">Thành viên</span>
                                <button type="button" onClick={() => setActivePopover(null)}>
                                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                                </button>
                              </div>

                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                <input
                                  type="text"
                                  value={memberSearchQuery}
                                  onChange={e => setMemberSearchQuery(e.target.value)}
                                  placeholder="Tìm thành viên..."
                                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {filteredMembers.map(member => {
                                  const isSelected = selectedMembers.some(m => m.id === member.id)
                                  return (
                                    <div
                                      key={member.id}
                                      onClick={() => handleToggleMember(member)}
                                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                        isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {member.avatarUrl ? (
                                          <img
                                            src={getAvatarUrl(member.avatarUrl)}
                                            alt={member.fullName}
                                            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                                            {getInitials(member.fullName)}
                                          </div>
                                        )}
                                        <span className="text-xs font-medium truncate">{member.fullName}</span>
                                      </div>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nhãn (Labels Waterfall) */}
                  {hasLabels && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Nhãn</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedLabels.map(lbl => (
                          <span
                            key={lbl.id}
                            onClick={() => handleToggleSelectLabel(lbl)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: lbl.color || '#5E60CE' }}
                          >
                            {lbl.name}
                          </span>
                        ))}
                        <div className="relative popover-container">
                          <button
                            type="button"
                            onClick={() => togglePopover('label')}
                            className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            title="Thêm nhãn"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Label Popover inside Waterfall */}
                          {activePopover === 'label' && (
                            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-3 text-slate-800">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800">Nhãn thẻ</span>
                                <button type="button" onClick={() => setActivePopover(null)}>
                                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={newLabelText}
                                    onChange={e => setNewLabelText(e.target.value)}
                                    placeholder="Tên nhãn..."
                                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateOrUpdateLabel}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
                                  >
                                    {editingLabelId ? 'Lưu' : 'Tạo'}
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                  {COLOR_SCHEMES.map(scheme => (
                                    <button
                                      key={scheme}
                                      type="button"
                                      onClick={() => setSelectedColor(scheme)}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                                        selectedColor === scheme ? 'ring-2 ring-blue-500 scale-110' : ''
                                      }`}
                                      style={{ backgroundColor: scheme }}
                                    >
                                      {selectedColor === scheme && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1 max-h-40 overflow-y-auto pt-1 border-t border-slate-100">
                                {boardLabelsData?.map(lbl => {
                                  const isSelected = selectedLabels.some(l => l.id === lbl.id)
                                  return (
                                    <div
                                      key={lbl.id}
                                      onClick={() => handleToggleSelectLabel(lbl)}
                                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                                    >
                                      <span
                                        className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                                        style={{ backgroundColor: lbl.color || '#5E60CE' }}
                                      >
                                        {lbl.name}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ngày đến hạn (Dates Waterfall) */}
                  {hasDate && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 tracking-wide block uppercase">Ngày đến hạn</span>
                      <div className="relative popover-container">
                        <button
                          type="button"
                          onClick={() => togglePopover('date')}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold border border-slate-200/80 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDateDisplay(deadline)}</span>
                        </button>

                        {activePopover === 'date' && (
                          <DirectDatePickerPopover
                            value={deadline}
                            reminderValue={reminder}
                            disabled={!canEditCard}
                            onChange={async (iso, reminderVal) => {
                              setDeadline(iso)
                              const finalReminder = reminderVal || reminder
                              setReminder(finalReminder)
                              if (card?.id && canEditCard) {
                                await updateCardMutation.mutateAsync({
                                  cardId: card.id,
                                  cardData: { deadline: iso, reminder: finalReminder },
                                })
                                lastSavedRef.current.deadline = iso
                              }
                            }}
                            onRemove={async () => {
                              setDeadline('')
                              if (card?.id && canEditCard) {
                                await updateCardMutation.mutateAsync({
                                  cardId: card.id,
                                  cardData: { deadline: null },
                                })
                                lastSavedRef.current.deadline = ''
                              }
                            }}
                            onClose={() => setActivePopover(null)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Mô tả</h3>
              </div>

              <div className="pl-6 space-y-2">
                <textarea
                  rows={isEditingDesc ? 4 : 2}
                  disabled={!canEditCard}
                  value={isEditingDesc ? draftDescription : description}
                  onFocus={() => {
                    if (!canEditCard) return
                    setDraftDescription(description)
                    setIsEditingDesc(true)
                  }}
                  onChange={e => {
                    if (!canEditCard) return
                    setDraftDescription(e.target.value)
                  }}
                  placeholder="Thêm mô tả chi tiết hơn..."
                  className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-slate-50/70 hover:bg-slate-100/50 focus:bg-white border border-slate-200/80 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
                />
                {isEditingDesc && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      disabled={updateCardMutation.isPending}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditDescription}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments List Section */}
            {attachments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">Tệp đính kèm</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePopover('attachment')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="pl-6 space-y-2">
                  {attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                          {att.fileType === 'link' ? <ExternalLink className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <a
                            href={formatExternalUrl(att.fileUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-slate-800 hover:text-blue-600 truncate block cursor-pointer"
                          >
                            {att.fileName}
                          </a>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Thêm bởi {att.uploadedBy?.fullName || 'thành viên'} • {formatDateDisplay(att.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Xóa đính kèm"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklists Sections */}
            {checklists.map(ck => {
              const totalItems = ck.items?.length || 0
              const completedItems = ck.items?.filter(i => i.completed).length || 0
              const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

              return (
                <div key={ck.id} className="space-y-3">
                  {/* Checklist Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckSquare className="w-4 h-4 text-slate-500 shrink-0" />
                      {editingChecklistId === ck.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingChecklistTitleText}
                            onChange={e => setEditingChecklistTitleText(e.target.value)}
                            className="px-2 py-1 text-sm bg-white border border-blue-500 rounded-lg text-slate-800 outline-none flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveChecklistTitle(ck.id)}
                            className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Lưu
                          </button>
                        </div>
                      ) : (
                        <h3
                          onClick={() => {
                            setEditingChecklistId(ck.id)
                            setEditingChecklistTitleText(ck.title)
                          }}
                          className="text-sm font-bold text-slate-800 hover:text-blue-600 cursor-pointer truncate"
                        >
                          {ck.title}
                        </h3>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteChecklist(ck.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60"
                    >
                      Xóa
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="pl-6 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="pl-6 space-y-2 pt-1">
                    {ck.items?.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between group py-1.5 px-2.5 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id)}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              item.completed
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white hover:border-blue-500'
                            }`}
                          >
                            {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingItemText}
                                onChange={e => setEditingItemText(e.target.value)}
                                className="px-2 py-0.5 text-xs bg-white border border-blue-500 rounded-lg text-slate-800 outline-none flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveItemContent(item.id)}
                                className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingItemId(item.id)
                                setEditingItemText(item.content)
                              }}
                              className={`text-xs text-slate-700 hover:text-slate-900 font-medium cursor-pointer truncate ${
                                item.completed ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {item.content}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add Item Form */}
                    {addingItemChecklistId === ck.id ? (
                      <div className="space-y-2 pt-2">
                        <textarea
                          rows={2}
                          value={newItemText}
                          onChange={e => setNewItemText(e.target.value)}
                          placeholder="Thêm việc cần làm..."
                          className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-blue-500 rounded-xl outline-none resize-none shadow-2xs"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleAddChecklistItem(ck.id)
                              setAddingItemChecklistId(null)
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs"
                          >
                            Thêm công việc
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingItemChecklistId(null)
                              setNewItemText('')
                            }}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingItemChecklistId(ck.id)
                          setNewItemText('')
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer mt-1 border border-slate-200/60"
                      >
                        Thêm việc cần làm
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Column: Parallel Comments & Activity Stream (Fixed 340px width with independent scrollbar) */}
          <div className="w-full md:w-[340px] shrink-0 space-y-5 overflow-y-auto pl-5 border-t md:border-t-0 md:border-l border-slate-100 max-h-[calc(92vh-100px)]">
            {/* Feed Header & Details Toggle */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Bình luận và hoạt động</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowActivityDetails(prev => !prev)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
              >
                {showActivityDetails ? 'Ẩn chi tiết' : 'Hiển thị chi tiết'}
              </button>
            </div>

            {/* Comment Input Box */}
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden mt-0.5 shadow-2xs">
                {currentUser?.avatarUrl ? (
                  <img src={getAvatarUrl(currentUser.avatarUrl)} alt={currentUser.fullName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-700">{getInitials(currentUser?.fullName)}</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none shadow-2xs"
                />
                {newCommentText.trim() && (
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    Lưu
                  </button>
                )}
              </div>
            </div>

            {/* Combined Activity & Comment Stream Feed */}
            <div className="space-y-3.5 pt-1">
              {displayedFeedItems.map(item => (
                <div key={item.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                    {item.user?.avatarUrl ? (
                      <img src={getAvatarUrl(item.user.avatarUrl)} alt={item.user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-700">{getInitials(item.user?.fullName)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">{item.user?.fullName || 'Hệ thống'}</span>
                      {item.type === 'log' && <span className="text-slate-500 font-normal">{formatActivityLogText(item.action, item.detail)}</span>}
                    </div>

                    {item.type === 'comment' && (
                      <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                        {editingCommentId === item.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={e => setEditingCommentText(e.target.value)}
                              className="w-full px-2 py-1 text-xs text-slate-800 bg-white border border-blue-500 rounded-lg outline-none resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveComment(item.id)}
                                className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-lg cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-1 text-[11px] text-slate-500 font-medium cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                            {item.user?.id === currentUser?.id && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(item.id)
                                    setEditingCommentText(item.content || '')
                                  }}
                                  className="hover:underline hover:text-slate-600 cursor-pointer"
                                >
                                  Chỉnh sửa
                                </button>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(item.id)}
                                  className="hover:underline hover:text-red-600 cursor-pointer"
                                >
                                  Xóa
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 font-medium">{formatDateDisplay(item.createdAt)}</p>
                  </div>
                </div>
              ))}

              {displayedFeedItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 font-medium">
                  {showActivityDetails ? 'Chưa có hoạt động nào' : 'Chưa có bình luận hoặc thông tin tạo thẻ nào'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Delete Label Confirmation Modal */}
        {labelToDelete && (
          <ConfirmDeleteModal
            open={!!labelToDelete}
            onOpenChange={() => setLabelToDelete(null)}
            onConfirm={() => {
              if (labelToDelete) {
                deleteBoardLabelMutation.mutateAsync({ labelId: labelToDelete.id, boardId })
                setSelectedLabels(prev => prev.filter(l => l.id !== labelToDelete.id))
                setLabelToDelete(null)
              }
            }}
            title="Xóa nhãn"
            description={`Bạn có chắc chắn muốn xóa nhãn \`${labelToDelete.name}\`?`}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

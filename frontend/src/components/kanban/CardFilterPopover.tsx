import React from 'react'
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "../ui/popover"
import { Filter, User, Calendar, Clock, Tag } from 'lucide-react'
import { useBoardDetailQuery } from '../../services/boardServices'
import { getAvatarUrl, getInitials } from '../../auth/authStorage'
import { useAuth } from '../../auth/authContext'
import type { MemberItem } from '../card/EditCardModel'
import type { FilterCardsPayload } from '../../services/cardService.ts'

interface CardFilterPopoverProps {
    boardId: string
    cardfillterFeatures?: FilterCardsPayload
    setCardFillterFeatures: React.Dispatch<React.SetStateAction<FilterCardsPayload>>
}

export const CardFilterPopover = (props: CardFilterPopoverProps) => {
    const { boardId, cardfillterFeatures, setCardFillterFeatures } = props
    const { user: currentUser } = useAuth()
    const currentUserAvatar = getAvatarUrl(currentUser?.avatarUrl)
    const currentUserInitials = getInitials(currentUser?.fullName || 'Tôi')

    const boardDetailQuery = useBoardDetailQuery(boardId)
    const board = boardDetailQuery.data
    const availableMembers: MemberItem[] = (board?.members || [])
        .filter(m => m.user.id !== currentUser?.id)
        .map(m => ({
            id: m.user.id,
            fullName: m.user.fullName,
            email: m.user.email,
            avatarUrl: getAvatarUrl(m.user.avatarUrl),
        }))
    const labels = board?.labels

    const handleClearFilters = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setCardFillterFeatures({
            search: '',
            listIds: [],
            noMembers: false,
            assignedToMe: false,
            memberIds: [],
            statusDone: false,
            statusPending: false,
            status: null,
            noDeadline: false,
            overdue: false,
            dueNextDay: false,
            dueNextWeek: false,
            dueNextMonth: false,
            deadlineFrom: null,
            deadlineTo: null,
            noLabels: false,
            labelIds: [],
            activityWeek: false,
            activityTwoWeeks: false,
            activityFourWeeks: false,
            noActivityFourWeeks: false,
        })
    }

    const activeFilterCount =
        (cardfillterFeatures?.search?.trim() ? 1 : 0) +
        (cardfillterFeatures?.listIds?.length || 0) +
        (cardfillterFeatures?.noMembers ? 1 : 0) +
        (cardfillterFeatures?.assignedToMe ? 1 : 0) +
        (cardfillterFeatures?.memberIds?.length || 0) +
        (cardfillterFeatures?.statusDone ? 1 : 0) +
        (cardfillterFeatures?.statusPending ? 1 : 0) +
        (cardfillterFeatures?.noDeadline ? 1 : 0) +
        (cardfillterFeatures?.overdue ? 1 : 0) +
        (cardfillterFeatures?.dueNextDay ? 1 : 0) +
        (cardfillterFeatures?.dueNextWeek ? 1 : 0) +
        (cardfillterFeatures?.dueNextMonth ? 1 : 0) +
        (cardfillterFeatures?.noLabels ? 1 : 0) +
        (cardfillterFeatures?.labelIds?.length || 0) +
        (cardfillterFeatures?.activityWeek ? 1 : 0) +
        (cardfillterFeatures?.activityTwoWeeks ? 1 : 0) +
        (cardfillterFeatures?.activityFourWeeks ? 1 : 0) +
        (cardfillterFeatures?.noActivityFourWeeks ? 1 : 0);

    return (
        <div className="flex items-center gap-1.5">
            <Popover>
                <PopoverTrigger className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer rounded-lg outline-none">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lọc</span>
                    {activeFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-80 sm:w-96 max-h-[80vh] overflow-y-auto p-4 z-50 rounded-2xl shadow-xl border border-slate-100" align="end">
                    <PopoverHeader className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                        <PopoverTitle className="text-sm font-bold text-slate-800">Bộ lọc</PopoverTitle>
                    </PopoverHeader>

                    <div className="w-full space-y-5">
                        {/* Keyword input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-800">Từ khóa</label>
                            <input
                                type="text"
                                placeholder="Nhập từ khóa..."
                                value={cardfillterFeatures?.search || ''}
                                onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full px-3 py-2 text-xs outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
                            />
                            <span className="text-[11px] text-slate-400 font-medium">Tìm kiếm thẻ, thành viên, nhãn và hơn thế nữa.</span>
                        </div>

                        {/* 1. Thành viên */}
                        <div>
                            <p className="text-xs font-bold text-slate-800 mb-2">Thành viên</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.noMembers || false}
                                        onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, noMembers: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <span>Không có thành viên</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.assignedToMe || false}
                                        onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, assignedToMe: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    {currentUserAvatar ? (
                                        <img src={currentUserAvatar} alt="Me" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                                            {currentUserInitials}
                                        </div>
                                    )}
                                    <span>Thẻ được giao cho tôi</span>
                                </label>

                                {availableMembers?.map((member) => (
                                    <label key={member.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={cardfillterFeatures?.memberIds?.includes(member.id) || false}
                                            onChange={(e) => {
                                                const checked = e.target.checked
                                                setCardFillterFeatures(prev => ({
                                                    ...prev,
                                                    memberIds: checked
                                                        ? [...(prev.memberIds || []), member.id]
                                                        : (prev.memberIds || []).filter(id => id !== member.id)
                                                }))
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                        />
                                        {member.avatarUrl ? (
                                            <img src={member.avatarUrl} alt={member.fullName} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 uppercase">
                                                {getInitials(member.fullName)}
                                            </div>
                                        )}
                                        <span className="truncate">{member.fullName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 2. Tình trạng */}
                        <div>
                            <p className="text-xs font-bold text-slate-800 mb-2">Tình trạng thẻ</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.statusDone || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                statusDone: checked,
                                                statusPending: checked ? false : prev.statusPending,
                                                status: checked ? true : null
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Đã đánh dấu hoàn thành</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.statusPending || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                statusPending: checked,
                                                statusDone: checked ? false : prev.statusDone,
                                                status: checked ? false : null
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Chưa đánh dấu hoàn thành</span>
                                </label>
                            </div>
                        </div>

                        {/* 3. Ngày đến hạn */}
                        <div>
                            <p className="text-xs font-bold text-slate-800 mb-2">Ngày đến hạn</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.noDeadline || false}
                                        onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, noDeadline: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <span>Không có ngày đến hạn</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.overdue || false}
                                        onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, overdue: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                                    </div>
                                    <span>Quá hạn</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.dueNextDay || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                dueNextDay: checked,
                                                ...(checked ? { dueNextWeek: false, dueNextMonth: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <span>Đến hạn vào ngày mai</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.dueNextWeek || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                dueNextWeek: checked,
                                                ...(checked ? { dueNextDay: false, dueNextMonth: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <span>Đến hạn vào tuần tới</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.dueNextMonth || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                dueNextMonth: checked,
                                                ...(checked ? { dueNextDay: false, dueNextWeek: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <span>Đến hạn vào tháng tới</span>
                                </label>
                            </div>
                        </div>

                        {/* 4. Nhãn */}
                        <div>
                            <p className="text-xs font-bold text-slate-800 mb-2">Nhãn</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.noLabels || false}
                                        onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, noLabels: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <span>Không có nhãn</span>
                                </label>

                                {labels?.map((label) => (
                                    <label key={label.id} className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                                        <input
                                            type="checkbox"
                                            checked={cardfillterFeatures?.labelIds?.includes(label.id) || false}
                                            onChange={(e) => {
                                                const checked = e.target.checked
                                                setCardFillterFeatures(prev => ({
                                                    ...prev,
                                                    labelIds: checked
                                                        ? [...(prev.labelIds || []), label.id]
                                                        : (prev.labelIds || []).filter(id => id !== label.id)
                                                }))
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                        />
                                        <span
                                            className="w-full px-2.5 py-1.5 rounded-lg text-white font-semibold text-xs shadow-2xs"
                                            style={{ backgroundColor: label.color }}
                                        >
                                            {label.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 5. Hoạt động */}
                        <div>
                            <p className="text-xs font-bold text-slate-800 mb-2">Hoạt động</p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.activityWeek || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                activityWeek: checked,
                                                ...(checked ? { activityTwoWeeks: false, activityFourWeeks: false, noActivityFourWeeks: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Hoạt động trong 1 tuần qua</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.activityTwoWeeks || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                activityTwoWeeks: checked,
                                                ...(checked ? { activityWeek: false, activityFourWeeks: false, noActivityFourWeeks: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Hoạt động trong 2 tuần qua</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.activityFourWeeks || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                activityFourWeeks: checked,
                                                ...(checked ? { activityWeek: false, activityTwoWeeks: false, noActivityFourWeeks: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Hoạt động trong 4 tuần qua</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none hover:text-slate-900">
                                    <input
                                        type="checkbox"
                                        checked={cardfillterFeatures?.noActivityFourWeeks || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                noActivityFourWeeks: checked,
                                                ...(checked ? { activityWeek: false, activityTwoWeeks: false, activityFourWeeks: false } : {})
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                                    />
                                    <span>Không có hoạt động trong 4 tuần qua</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {activeFilterCount > 0 && (
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-blue-600 hover:underline cursor-pointer font-medium px-1.5 py-1"
                >
                    Xóa bộ lọc
                </button>
            )}
        </div>
    )
}

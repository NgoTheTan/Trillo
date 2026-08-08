import React from 'react'
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "../ui/popover"
import { Filter } from 'lucide-react'
import { useBoardDetailQuery } from '../../services/boardServices'
import { getInitials } from '../../auth/authStorage'
import type { MemberItem } from '../listCard/EditCardModel'
import type { FilterCardsPayload } from '../../services/cardService.ts'
import { DateTimeInput } from '../common/DateTimeInput.tsx'
import { Button } from '../ui/button.tsx'

interface CardFilterPopoverProps {
    boardId: string
    cardfillterFeatures?: FilterCardsPayload
    setCardFillterFeatures: React.Dispatch<React.SetStateAction<FilterCardsPayload>>
}

export const CardFilterPopover = (props: CardFilterPopoverProps) => {
    const { boardId, cardfillterFeatures, setCardFillterFeatures } = props
    const boardDetailQuery = useBoardDetailQuery(boardId)
    const board = boardDetailQuery.data
    const availableMembers: MemberItem[] = (board?.members || []).map(m => ({
        id: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl || '',
    }))
    const labels = board?.labels
    const columns = board?.lists

    const handleClearFilters = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setCardFillterFeatures({
            search: '',
            listIds: [],
            memberIds: [],
            labelIds: [],
            status: null,
            noDeadline: false,
            deadlineFrom: null,
            deadlineTo: null,
        })
    }

    return (
        <Popover>
            <PopoverTrigger>
                <Button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                    {((cardfillterFeatures?.listIds?.length || 0) +
                        (cardfillterFeatures?.memberIds?.length || 0) +
                        (cardfillterFeatures?.labelIds?.length || 0) +
                        (cardfillterFeatures?.search ? 1 : 0) +
                        (cardfillterFeatures?.status !== null && cardfillterFeatures?.status !== undefined ? 1 : 0) +
                        (cardfillterFeatures?.noDeadline ? 1 : 0) +
                        (cardfillterFeatures?.deadlineFrom ? 1 : 0) +
                        (cardfillterFeatures?.deadlineTo ? 1 : 0)) > 0 && (
                            <>
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                                    {(cardfillterFeatures?.listIds?.length || 0) +
                                        (cardfillterFeatures?.memberIds?.length || 0) +
                                        (cardfillterFeatures?.labelIds?.length || 0) +
                                        (cardfillterFeatures?.search ? 1 : 0) +
                                        (cardfillterFeatures?.status !== null && cardfillterFeatures?.status !== undefined ? 1 : 0) +
                                        (cardfillterFeatures?.noDeadline ? 1 : 0) +
                                        (cardfillterFeatures?.deadlineFrom ? 1 : 0) +
                                        (cardfillterFeatures?.deadlineTo ? 1 : 0)}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                                >
                                    Clear filters
                                </button>
                            </>
                        )}

                </Button>
            </PopoverTrigger>
            <PopoverContent className={"w-100 max-h-[70vh] overflow-y-auto p-3"} align='end' >
                <PopoverHeader className="flex items-center justify-between">
                    <PopoverTitle className={"text-center font-medium"}>Filter</PopoverTitle>
                </PopoverHeader>
                <div className='w-full space-y-4 mt-2'>
                    <div className='flex flex-col gap-2'>
                        <p className='text-sm font-medium'>Key word</p>
                        <input
                            type="text"
                            placeholder="Enter key word"
                            value={cardfillterFeatures?.search || ''}
                            onChange={(e) => setCardFillterFeatures(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full p-2 outline-none border border-slate-200 rounded"
                        />
                        <small className='text-xs text-slate-500'>Filter cards by priority, deadline, or assignee.</small>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Columns</p>
                        <div className='flex flex-col gap-2 mt-2'>
                            {columns?.map((c) => (
                                <div key={c.id} className='flex items-center gap-5'>
                                    <input
                                        type="checkbox"
                                        id={c.id}
                                        checked={cardfillterFeatures?.listIds?.includes(c.id) || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                listIds: checked
                                                    ? [...prev.listIds, c.id]
                                                    : prev.listIds.filter(id => id !== c.id)
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                                    />
                                    <label
                                        htmlFor={c.id}
                                        className={`block font-medium w-full cursor-pointer select-none`}
                                    >
                                        {c.title}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Card status</p>
                        <div className='grid grid-cols-2 gap-4 mt-2'>
                            <div className='flex items-center gap-5'>
                                <input
                                    type="checkbox"
                                    id="status-done"
                                    checked={cardfillterFeatures?.status === true}
                                    onChange={(e) => {
                                        setCardFillterFeatures(prev => ({
                                            ...prev,
                                            status: e.target.checked ? true : null
                                        }))
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                                />
                                <label htmlFor="status-done" className='flex items-center gap-2 cursor-pointer select-none font-medium'>Done</label>
                            </div>
                            <div className='flex items-center gap-5'>
                                <input
                                    type="checkbox"
                                    id="status-pending"
                                    checked={cardfillterFeatures?.status === false}
                                    onChange={(e) => {
                                        setCardFillterFeatures(prev => ({
                                            ...prev,
                                            status: e.target.checked ? false : null
                                        }))
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                                />
                                <label htmlFor="status-pending" className='flex items-center gap-2 cursor-pointer select-none font-medium'>Pending</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Members</p>
                        <div className='grid grid-cols-2 gap-2 mt-2'>
                            {availableMembers?.map((member) => (
                                <div key={member.id} className='flex items-center gap-5'>
                                    <input
                                        type="checkbox"
                                        id={member.id}
                                        checked={cardfillterFeatures?.memberIds?.includes(member.id) || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                memberIds: checked
                                                    ? [...prev.memberIds, member.id]
                                                    : prev.memberIds.filter(id => id !== member.id)
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                                    />
                                    <label className='flex items-center gap-2 cursor-pointer select-none' htmlFor={member.id}>
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
                                        <p className='font-medium line-clamp-1'>{member.fullName}</p>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Labels</p>
                        <div className='flex flex-col gap-2 mt-2'>
                            {labels?.map((label) => (
                                <div key={label.id} className='flex items-center gap-5'>
                                    <input
                                        type="checkbox"
                                        id={label.id}
                                        checked={cardfillterFeatures?.labelIds?.includes(label.id) || false}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setCardFillterFeatures(prev => ({
                                                ...prev,
                                                labelIds: checked
                                                    ? [...prev.labelIds, label.id]
                                                    : prev.labelIds.filter(id => id !== label.id)
                                            }))
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                                    />
                                    <label
                                        htmlFor={label.id}
                                        className={`block font-medium w-full p-2 rounded text-white cursor-pointer select-none`}
                                        style={{ backgroundColor: label.color }}
                                    >
                                        {label.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Time range</p>
                        <div className='flex items-center gap-2 mt-2 mb-1'>
                            <input
                                type="checkbox"
                                id="filter-no-deadline"
                                checked={cardfillterFeatures?.noDeadline || false}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setCardFillterFeatures(prev => ({
                                        ...prev,
                                        noDeadline: checked,
                                        ...(checked ? { deadlineFrom: null, deadlineTo: null } : {})
                                    }));
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all"
                            />
                            <label htmlFor="filter-no-deadline" className='text-xs font-medium text-slate-700 cursor-pointer select-none'>
                                No deadline
                            </label>
                        </div>
                        <div className={`grid grid-cols-2 gap-2 mt-2 transition-opacity ${cardfillterFeatures?.noDeadline ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div>
                                <p className='text-xs font-medium mb-1 text-slate-600'>Start date</p>
                                <DateTimeInput
                                    className='w-full'
                                    value={cardfillterFeatures?.deadlineFrom}
                                    onChange={(date) => setCardFillterFeatures(prev => ({ ...prev, deadlineFrom: date }))}
                                />
                            </div>
                            <div>
                                <p className='text-xs font-medium mb-1 text-slate-600'>End date</p>
                                <DateTimeInput
                                    className='w-full'
                                    value={cardfillterFeatures?.deadlineTo}
                                    onChange={(date) => setCardFillterFeatures(prev => ({ ...prev, deadlineTo: date }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

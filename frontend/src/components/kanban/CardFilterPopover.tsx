import React from 'react'
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "../ui/popover"
import { Filter } from 'lucide-react'
import { useBoardDetailQuery } from '../../services/boardServices'
import { getInitials } from '../../auth/authStorage'
import type { MemberItem } from '../listCard/EditCardModel'

interface CardFilterPopoverProps {
    boardId: string
}

export const CardFilterPopover = (props: CardFilterPopoverProps) => {
    const { boardId } = props
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
    return (
        <Popover>
            <PopoverTrigger>
                <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filter</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className={"w-100 max-h-[80vh] overflow-y-auto p-3"} align='end' >
                <PopoverHeader>
                    <PopoverTitle className={"text-center font-medium"}>Filter</PopoverTitle>
                </PopoverHeader>
                <div className='w-full space-y-4'>
                    <div className='flex flex-col gap-2'>
                        <p className='text-sm font-medium'>Key word</p>
                        <input
                            type="text"
                            placeholder="Enter key word"
                            className="w-full p-2 outline-none border border-slate-200 rounded"
                        />
                        <small className='text-xs text-slate-500'>Filter cards by priority, deadline, or assignee.</small>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Columns</p>
                        <div className='flex flex-col gap-2 mt-2'>
                            {columns?.map((c) => (
                                <div key={c.id} className='flex items-center gap-5'>
                                    <input type="checkbox" id={c.id} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all" />
                                    <label
                                        htmlFor={c.id}
                                        className={`block font-medium w-full`}
                                    >
                                        {c.title}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className='text-sm font-medium'>Members</p>
                        <div className='flex flex-wrap gap-2 mt-2'>
                            {availableMembers?.map((member) => (
                                <div key={member.id} className='flex items-center gap-5'>
                                    <input type="checkbox" id={member.id} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all" />
                                    <label className='flex items-center gap-2' htmlFor={member.id}>
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
                                        <p className='text font-medium'>{member.fullName}</p>
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
                                    <input type="checkbox" id={label.id} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 accent-blue-600 cursor-pointer shrink-0 transition-all" />
                                    <label
                                        htmlFor={label.id}
                                        className={`block font-medium w-full p-2 rounded text-white`}
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
                        <div className='grid grid-cols-2 gap-2 mt-2'>
                            <div>
                                <p className='text-xs font-medium mb-1'>Start date</p>
                                <input type="datetime-local" className='p-2 outline-none border border-slate-200 rounded w-full text-xs' />
                            </div>
                            <div>
                                <p className='text-xs font-medium mb-1'>End date</p>
                                <input type="datetime-local" className='p-2 outline-none border border-slate-200 rounded w-full text-xs' />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

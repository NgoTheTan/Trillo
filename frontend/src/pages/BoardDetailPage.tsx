import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
    Search,
    Filter,
    MoreHorizontal,
    Globe,
    MoreVertical,
    Bookmark,
    Loader2
} from 'lucide-react'
import { useBoardDetailQuery } from '../services/boardServices'
import { KanbanColumn } from '../components/kanban/KanbanColumn'
import { BoardListFormModal } from '../components/boardList/BoardListFormModal'
import {
    useBoardListsQuery,
    useCreateBoardListMutation,
    useUpdateBoardListMutation,
    useDeleteBoardListMutation
} from "../services/boardListServices"
import { useCreateCardMutation } from '../services/listCardServices'

export const BoardDetailPage: React.FC = () => {
    const { boardId } = useParams<{ boardId: string }>()
    const [searchCardQuery, setSearchCardQuery] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const boardQuery = useBoardDetailQuery(boardId)
    const listsQuery = useBoardListsQuery(boardId)

    const createBoardListMutation = useCreateBoardListMutation()
    const updateBoardListMutation = useUpdateBoardListMutation()
    const deleteBoardListMutation = useDeleteBoardListMutation()

    const board = boardQuery.data
    const lists = listsQuery.data || board?.lists || []

    const handleCreateBoardList = async (title: string) => {
        if (!boardId) return
        try {
            await createBoardListMutation.mutateAsync({ boardId, payload: { title } })
            setIsCreateOpen(false)
        } catch (err) {
            console.warn('API error creating board list:', err)
        }
    }

    const handleUpdateTitleColumn = async (bId: string, listId: string, title: string) => {
        try {
            await updateBoardListMutation.mutateAsync({ boardId: bId, listId, payload: { title } })
        } catch (err) {
            console.warn('API error updating title:', err)
        }
    }

    const handleDeleteColumn = async (bId: string, listId: string) => {
        try {
            await deleteBoardListMutation.mutateAsync({ boardId: bId, listId })
        } catch (err) {
            console.warn('API error deleting list:', err)
        }
    }


    if (boardQuery.isLoading || listsQuery.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Loading Kanban Board...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto text-slate-800">
            {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4  p-4 rounded-2xl">
                {/* Left Section: Board Icon, Title, Visibility, Bookmark, Members, Invite */}
                <div className="flex items-center gap-3 flex-wrap">

                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {board?.title}
                        </h1>
                        <span className="text-slate-400 font-bold cursor-pointer hover:text-slate-600">..</span>
                    </div>

                    {/* Visibility Pill */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        {board?.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                    </span>

                    {/* Bookmark Button */}
                    <button className="p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer">
                        <Bookmark className="w-4 h-4 fill-amber-500" />
                    </button>

                    {/* Member Avatars Stack */}
                    <div className="flex -space-x-2.5 overflow-hidden items-center ml-1">
                        {board?.members.map(m => (
                            <img
                                key={m.id}
                                src={m.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt={m.user.fullName}
                                title={m.user.fullName}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                            />
                        ))}
                    </div>

                    {/* Options Dots */}
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Invite Button */}
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                        <span>Invite</span>
                    </button>
                </div>

                {/* Right Section: Filter, Search, More Options */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filter</span>
                    </button>

                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search cards..."
                            value={searchCardQuery}
                            onChange={e => setSearchCardQuery(e.target.value)}
                            className="pl-9 pr-3.5 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44 sm:w-56 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── KANBAN BOARD COLUMNS ──────────────────────────────────────────────── */}
            <div className="flex gap-3">
                {lists.map(list => (
                    <KanbanColumn
                        key={list.id}
                        list={list}
                        handleDeleteColumn={handleDeleteColumn}
                        handleUpdateTitleColumn={handleUpdateTitleColumn}
                    />
                ))}
                {
                    <BoardListFormModal
                        isOpen={isCreateOpen}
                        onClose={() => setIsCreateOpen(false)}
                        onOpen={() => setIsCreateOpen(true)}
                        onSubmit={handleCreateBoardList}
                    />
                }
            </div>
        </div>
    )
}


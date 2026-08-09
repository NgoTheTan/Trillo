import React, { useState } from 'react'
import { Button } from '../ui/button'

interface BoardListFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (title: string) => void
    onOpen: () => void
}

export const BoardListFormModal = ({ isOpen, onClose, onSubmit, onOpen }: BoardListFormModalProps) => {
    const [title, setTitle] = useState("")
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(title)
    }
    return (
        <div>
            {
                isOpen ?
                    <form onSubmit={handleSubmit} className='border border-gray-300 p-3 bg-white rounded-xl shadow-lg space-y-3 w-70'>
                        <p className='font-bold text-sm text-gray-800'>Cột mới</p>
                        <input
                            placeholder='Nhập tên danh sách...'
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                        />
                        <div className='grid grid-cols-2 gap-2'>
                            <Button type='button' variant='outline' onClick={onClose} className='hover:bg-gray-200 border-gray-200 cursor-pointer text-gray-500'>
                                Hủy
                            </Button>
                            <Button type='submit' className='cursor-pointer text-white bg-blue-700 hover:bg-blue-800'>Thêm danh sách</Button>
                        </div>
                    </form>
                    :
                    <Button onClick={onOpen} className='w-70 py-5 border border-dashed border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-colors cursor-pointer'>
                        + Thêm danh sách
                    </Button>
            }

        </div>
    )
}

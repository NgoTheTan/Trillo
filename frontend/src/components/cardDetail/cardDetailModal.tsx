import React from 'react';
import Checklist from './Checklist';
import CommentSection from './CommentSection';
import Attachments from './Attachments';
import ActivityLog from './ActivityLog';

export default function CardDetailModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Tiêu đề công việc mẫu (Mock Title)</h2>
          <p className="text-sm text-slate-500">Nằm trong danh sách: <strong>To Do</strong></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Cột trái */}
          <div className="md:col-span-3 space-y-8">
            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <h3 className="font-semibold mb-2">Mô tả</h3>
              <p className="text-sm text-slate-600">Đây là phần mô tả chi tiết công việc...</p>
            </div>

            <Attachments />
            <Checklist />
            <CommentSection />
          </div>

          {/* Cột phải */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700">Thêm vào thẻ</h3>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Thành viên</button>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Nhãn (Labels)</button>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Ngày hết hạn</button>
            
            <hr className="my-6" />
            <ActivityLog />
          </div>
        </div>

        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">
          ✕
        </button>
      </div>
    </div>
  );
}
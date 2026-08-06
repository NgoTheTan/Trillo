import React from 'react';

export default function CardDetailModal() {
  return (
    // Lớp nền đen mờ phía sau
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      
      // Khung cửa sổ chính
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        
        {/* Tiêu đề Card */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Tiêu đề công việc mẫu (Mock Title)</h2>
          <p className="text-sm text-slate-500">Nằm trong danh sách: <strong>To Do</strong></p>
        </div>

        {/* Nội dung chia 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Cột trái:Chi tiết, Checklist, Comment */}
          <div className="md:col-span-3 space-y-6">
            {/* TODO: Lắp component Mô tả vào đây */}
            <div className="p-4 bg-slate-50 rounded border border-slate-200">Mô tả công việc...</div>
            
            {/* TODO: Lắp component Attachments vào đây */}
            <div className="p-4 bg-slate-50 rounded border border-slate-200">Khu vực File đính kèm...</div>

            {/* TODO: Lắp component Checklist vào đây */}
            <div className="p-4 bg-slate-50 rounded border border-slate-200">Khu vực Checklist...</div>
            
            {/* TODO: Lắp component Comment vào đây */}
            <div className="p-4 bg-slate-50 rounded border border-slate-200">Khu vực Comment...</div>
          </div>

          {/* Cột phải: Các nút thao tác & Log */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700">Thêm vào thẻ</h3>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Thành viên</button>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Nhãn (Labels)</button>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Checklist</button>
            <button className="w-full text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition">Đính kèm</button>
            
            <hr className="my-4" />
            
            {/* TODO: Lắp component ActivityLog vào đây */}
            <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs">Lịch sử hoạt động...</div>
          </div>
        </div>

        {/* Nút đóng Modal tạm thời */}
        <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl">
          ✕
        </button>
      </div>
    </div>
  );
}
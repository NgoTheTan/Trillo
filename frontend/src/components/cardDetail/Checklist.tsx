import { useState } from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';

interface ChecklistItem {
  id: number;
  text: string;
  isCompleted: boolean;
}

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: 1, text: 'Thiết kế UI bản nháp', isCompleted: true },
    { id: 2, text: 'Ghép API lấy dữ liệu', isCompleted: false },
  ]);
  const [newItem, setNewItem] = useState('');

  // Tính phần trăm hoàn thành
  const completedCount = items.filter((item) => item.isCompleted).length;
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  const handleToggle = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  };

  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItem.trim()) {
      setItems([...items, { id: Date.now(), text: newItem.trim(), isCompleted: false }]);
      setNewItem('');
    }
  };

  const handleDelete = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
        <CheckSquare className="w-5 h-5" />
        <h3>Checklist</h3>
      </div>

      {/* Thanh tiến độ */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500 w-8">{progress}%</span>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Danh sách công việc */}
      <div className="space-y-2 pl-11">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between group hover:bg-slate-50 p-1 -ml-1 rounded">
            <label className="flex items-center gap-3 cursor-pointer flex-1">
              <input 
                type="checkbox" 
                checked={item.isCompleted}
                onChange={() => handleToggle(item.id)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className={`text-sm ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item.text}
              </span>
            </label>
            <button 
              onClick={() => handleDelete(item.id)}
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Ô nhập task mới */}
      <div className="pl-11">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleAdd}
          placeholder="Thêm một mục mới (Nhấn Enter để lưu)..."
          className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
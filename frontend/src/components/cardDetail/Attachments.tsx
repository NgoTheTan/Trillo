import { useState } from 'react';
import { Paperclip } from 'lucide-react';

interface Attachment {
  id: number;
  name: string;
  type: string;
  date: string;
}

export default function Attachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([
    { id: 1, name: 'Tai_lieu_thiet_ke.pdf', type: 'PDF', date: 'Vài giây trước' },
    { id: 2, name: 'Link Figma UI', type: 'Link', date: '1 giờ trước' },
  ]);

  const handleAddAttachment = () => {
    // Giả lập việc thêm 1 file mới
    const newFile: Attachment = {
      id: Date.now(),
      name: `File_moi_upload_${Math.floor(Math.random() * 100)}.png`,
      type: 'IMG',
      date: 'Vừa xong'
    };
    
    // Đẩy file mới lên đầu danh sách
    setAttachments([newFile, ...attachments]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
          <Paperclip className="w-5 h-5" />
          <h3>Đính kèm</h3>
        </div>
        <button 
          onClick={handleAddAttachment}
          className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded font-medium transition"
        >
          Thêm đính kèm
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-11">
        {attachments.map((file) => (
          <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer transition">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center font-bold text-xs">
              {file.type}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{file.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
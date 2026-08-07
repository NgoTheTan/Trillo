import { Activity } from 'lucide-react';

export default function ActivityLog() {
  const logs = [
    { id: 1, user: 'Lò Châu Minh', action: 'đã thêm thẻ này vào To Do', time: '2 giờ trước' },
    { id: 2, user: 'Đào Danh Đức', action: 'đã đính kèm Link Figma UI', time: '1 giờ trước' },
    { id: 3, user: 'Ngô Thế Tân', action: 'đã hoàn thành mục Thiết kế UI bản nháp', time: '10 phút trước' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
        <Activity className="w-5 h-5" />
        <h3>Hoạt động</h3>
      </div>

      <div className="space-y-4 pl-11 relative before:absolute before:inset-0 before:ml-[1.3rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {logs.map((log) => (
          <div key={log.id} className="relative flex items-start gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold flex-shrink-0 z-10 border-4 border-white">
              {log.user.charAt(0)}
            </div>
            <div className="mt-1">
              <span className="font-semibold text-slate-800 mr-1">{log.user}</span>
              <span className="text-slate-600">{log.action}</span>
              <div className="text-xs text-slate-400 mt-0.5">{log.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: number;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
}

export default function CommentSection() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      user: 'Lò Châu Minh',
      avatar: 'M',
      content: 'Tôi đã thiết kế xong bản nháp UI cho phần này nhé.',
      timestamp: 'Vài giây trước'
    }
  ]);
  const [newComment, setNewComment] = useState('');

  const handleSend = () => {
    if (newComment.trim()) {
      setComments([
        {
          id: Date.now(),
          user: 'Lò Châu Minh',
          avatar: 'M',
          content: newComment.trim(),
          timestamp: 'Vừa xong'
        },
        ...comments
      ]);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
        <MessageSquare className="w-5 h-5" />
        <h3>Bình luận</h3>
      </div>

      {/* Khu vực nhập bình luận */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
          M
        </div>
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận..."
            className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
          />
          <button 
            onClick={handleSend}
            disabled={!newComment.trim()}
            className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Danh sách bình luận */}
      <div className="space-y-4 pt-4 pl-11">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-slate-800">{comment.user}</span>
              <span className="text-xs text-slate-500">{comment.timestamp}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm text-slate-700">
              {comment.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
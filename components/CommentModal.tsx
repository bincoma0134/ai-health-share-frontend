"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Send, Heart, User as UserIcon, Sparkles, Bookmark, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  user: any;
  userRole: string;
}

export default function CommentModal({ isOpen, onClose, serviceId, user, userRole }: CommentModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- 1. FETCH DỮ LIỆU ---
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const url = `https://ai-health-share-backend.onrender.com/comments/${serviceId}${user ? `?user_id=${user.id}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") setComments(data.data);
    } catch (e) {
      toast.error("Không thể kết nối không gian thảo luận.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsAnimating(true), 10);
      fetchComments();
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, serviceId]);

  // --- 2. XỬ LÝ GỬI BÌNH LUẬN ---
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Vui lòng đăng nhập để tham gia thảo luận!");
      return;
    }
    if (!newComment.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://ai-health-share-backend.onrender.com/comments`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
            service_id: serviceId, 
            content: newComment.trim(),
            parent_id: replyingTo?.id || null // Gửi ID cha thật xuống Backend
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchComments(); // Reload để nhận cấu trúc Tree chuẩn từ Backend
        setNewComment("");
        setReplyingTo(null);
        toast.success("Đã đăng bình luận!");
      }
    } catch (e) { toast.error("Lỗi khi gửi phản hồi."); }
  };

  // --- 3. RECURSIVE RENDER (HIỂN THỊ CÂY RẼ NHÁNH) ---
  const CommentItem = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => {
    const role = comment.users?.role || "USER";
    return (
      <div className={`flex flex-col gap-2 ${isReply ? "ml-10 border-l-2 border-slate-100 dark:border-white/5 pl-4 mt-2" : "mt-4"}`}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0">
            {comment.users?.avatar_url ? <img src={comment.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={16} className="m-auto mt-2 text-slate-400"/>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">{comment.users?.full_name || "Thành viên"}</span>
              {role === 'PARTNER_ADMIN' && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-sm border border-emerald-500/20">EXPERTISER</span>}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{comment.content}</p>
            <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(comment.created_at).toLocaleDateString('vi-VN')}</span>
                <button onClick={() => setReplyingTo({ id: comment.id, name: comment.users?.full_name || "Thành viên" })} className="text-[10px] font-black text-slate-500 hover:text-emerald-500 uppercase tracking-wider">Trả lời</button>
                {comment.likes_count > 0 && <span className="text-[10px] font-bold text-rose-500">{comment.likes_count} ❤️</span>}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} isReply={true} />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden pointer-events-none">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto ${isAnimating ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
      <div className={`relative w-full md:w-[450px] h-[80vh] md:h-full mt-auto md:mt-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-3xl shadow-2xl flex flex-col transition-transform duration-500 ease-out transform pointer-events-auto rounded-t-[2.5rem] md:rounded-none md:rounded-l-[2.5rem] ${isAnimating ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}`}>
        
        {/* Header */}
        <div className="pt-8 pb-4 px-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Thảo luận</h3>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500"><X size={20}/></button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-70"></div>
                <div className="absolute inset-2 bg-emerald-400 rounded-full flex items-center justify-center"><Sparkles className="text-white w-4 h-4 animate-pulse" /></div>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Đang kết nối...</span>
            </div>
          ) : (
            comments.map(c => <CommentItem key={c.id} comment={c} />)
          )}
        </div>

        {/* Form nhập */}
        <div className="p-6 bg-white dark:bg-[#121212] border-t border-slate-100 dark:border-white/5">
          {replyingTo && (
              <div className="flex justify-between items-center mb-3 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 animate-slide-up">
                  <span className="text-[11px] font-bold text-emerald-500">Phản hồi @{replyingTo.name}</span>
                  <button onClick={() => setReplyingTo(null)}><X size={14}/></button>
              </div>
          )}
          <form onSubmit={handlePostComment} className="flex gap-3">
            <textarea 
                className="flex-1 bg-slate-100 dark:bg-white/5 px-5 py-3 text-sm rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none no-scrollbar" 
                placeholder="Viết cảm nghĩ..."
                value={newComment} 
                onChange={e => setNewComment(e.target.value)} 
                rows={1}
            />
            <button type="submit" className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"><Send size={18} className="ml-1"/></button>
          </form>
        </div>
      </div>
    </div>
  );
}
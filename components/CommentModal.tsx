"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Send, User as UserIcon, Sparkles, MoreHorizontal, AlertTriangle, EyeOff, Crown, ShieldCheck, BadgeCheck, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string; 
  videoAuthorId: string;
  user: any;
  userRole: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

export default function CommentModal({ isOpen, onClose, videoId, videoAuthorId, user, userRole, onCommentAdded, onCommentDeleted }: CommentModalProps) {
  const router = useRouter();
  const [rawComments, setRawComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; name: string } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/tiktok/feeds/${videoId}/comments`);
      const data = await res.json();
      if (data.status === "success") setRawComments(data.data);
    } catch (e) { toast.error("Không thể kết nối tải bình luận."); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (isOpen && videoId) {
      setTimeout(() => setIsAnimating(true), 10);
      fetchComments();
    } else {
      setIsAnimating(false); setReplyingTo(null); setActiveDropdown(null);
    }
  }, [isOpen, videoId]);

  const commentTree = useMemo(() => {
    const map = new Map();
    const roots: any[] = [];
    rawComments.forEach(c => map.set(c.id, { ...c, replies: [] }));
    rawComments.forEach(c => {
      if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).replies.push(map.get(c.id));
      else roots.push(map.get(c.id)); 
    });
    return roots;
  }, [rawComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.info("Vui lòng đăng nhập để thảo luận!");
    if (!newComment.trim()) return;

    const tid = toast.loading("Đang gửi...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { content: newComment.trim(), parent_id: replyingTo?.id || null };
      const res = await fetch(`${API_URL}/tiktok/feeds/${videoId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        await fetchComments(); 
        setNewComment(""); setReplyingTo(null);
        toast.success("Đã đăng bình luận!", { id: tid });
        if (onCommentAdded) onCommentAdded(); 
      } else throw new Error(data.message);
    } catch (e: any) { toast.error(e.message || "Lỗi mạng.", { id: tid }); }
  };

  const handleDeleteComment = async (commentId: string) => {
      if (!confirm("Bạn có chắc chắn muốn xóa bình luận này? Thao tác không thể hoàn tác.")) return;
      const tid = toast.loading("Đang xóa bình luận...");
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API_URL}/tiktok/feeds/comments/${commentId}`, {
              method: "DELETE", headers: { "Authorization": `Bearer ${session?.access_token}` }
          });
          if (res.ok) {
              setRawComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
              toast.success("Bình luận đã bị gỡ.", { id: tid });
              setActiveDropdown(null);
              if (onCommentDeleted) onCommentDeleted();
          } else throw new Error();
      } catch { toast.error("Không thể xóa bình luận lúc này.", { id: tid }); }
  };

  const navigateToProfile = (username?: string) => {
      if (username) { onClose(); setTimeout(() => router.push(`/${username}`), 300); }
  };

  const renderTextWithMentions = (text: string) => {
      return text.split(/(@\w+)/g).map((part, i) => part.startsWith('@') ? 
        <span key={i} onClick={(e) => { e.stopPropagation(); navigateToProfile(part.slice(1)); }} className="text-blue-500 dark:text-blue-400 cursor-pointer hover:underline font-semibold">{part}</span> 
        : <span key={i}>{part}</span>
      );
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: any; depth?: number }) => {
    // 1. Tách biệt Logic Role và Logic Author
    const role = comment.users?.role || "USER";
    const username = comment.users?.username || `user_${comment.id.substring(0,5)}`;
    const isAuthor = comment.user_id === videoAuthorId;
    
    // 2. Logic Thẩm quyền xóa (Bản thân, Admin, hoặc Mod)
    const canDelete = user?.id === comment.user_id || userRole === 'SUPER_ADMIN' || userRole === 'MODERATOR';
    
    const indentClass = depth === 0 ? "mt-5" : depth <= 1 ? "ml-10 md:ml-12 mt-3 border-l border-slate-200 dark:border-white/10 pl-3 md:pl-4" : "mt-3"; 

    return (
      <div className={`flex flex-col gap-2 ${indentClass}`}>
        <div className="flex gap-3 relative">
          <div onClick={() => navigateToProfile(username)} className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 cursor-pointer border border-transparent hover:border-[#80BF84] transition-colors">
            {comment.users?.avatar_url ? <img src={comment.users.avatar_url} className="w-full h-full object-cover"/> : <UserIcon size={16} className="m-auto mt-2 text-slate-400"/>}
          </div>
          
          <div className="flex-1 group">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                  <span onClick={() => navigateToProfile(username)} className="text-xs font-black text-slate-900 dark:text-white cursor-pointer hover:underline">{comment.users?.full_name || "Thành viên"}</span>
                  
                  {/* HUY HIỆU TÁC GIẢ (Độc lập với Role) */}
                  {isAuthor && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-sm flex items-center gap-1 shadow-sm"><Sparkles size={10}/> TÁC GIẢ</span>}
                  
                  {/* HUY HIỆU ROLE (Cơ chế Badge Chồng) */}
                  {role === 'SUPER_ADMIN' && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-sm flex items-center gap-1"><Crown size={10}/> ADMIN</span>}
                  {(role === 'PARTNER_ADMIN' || role === 'PARTNER') && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-black rounded-sm flex items-center gap-1"><BadgeCheck size={10}/> BUSINESS</span>}
                  {role === 'MODERATOR' && <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[8px] font-black rounded-sm flex items-center gap-1"><ShieldCheck size={10}/> MOD</span>}
                  {role === 'CREATOR' && <span className="px-1.5 py-0.5 bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[8px] font-black rounded-sm flex items-center gap-1"><Sparkles size={10}/> CREATOR</span>}
              </div>

              <div className="relative">
                  <button onClick={() => setActiveDropdown(activeDropdown === comment.id ? null : comment.id)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14}/></button>
                  {activeDropdown === comment.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 animate-fade-in py-1">
                          {canDelete && <button onClick={() => handleDeleteComment(comment.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"><Trash2 size={14}/> Xóa bình luận</button>}
                          <button onClick={() => { setRawComments(prev => prev.filter(c => c.id !== comment.id && c.parent_id !== comment.id)); setActiveDropdown(null); toast.success("Đã ẩn bình luận này."); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"><EyeOff size={14}/> Ẩn phía tôi</button>
                          <button onClick={() => { setActiveDropdown(null); toast.success("Đã gửi báo cáo vi phạm!"); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"><AlertTriangle size={14}/> Báo cáo</button>
                      </div>
                  )}
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{renderTextWithMentions(comment.content)}</p>
            
            <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] font-bold text-slate-400">{new Date(comment.created_at).toLocaleDateString('vi-VN')}</span>
                <button onClick={() => {
                    setReplyingTo({ id: comment.id, username: username, name: comment.users?.full_name || "Thành viên" });
                    setNewComment(`@${username} `); inputRef.current?.focus();
                }} className="text-[10px] font-black text-slate-500 hover:text-blue-500 transition-colors">Trả lời</button>
            </div>
          </div>
        </div>
        
        {comment.replies?.length > 0 && (
            <div className="relative">
                {depth <= 0 && <div className="absolute left-[17px] top-[-10px] bottom-6 w-px bg-slate-200 dark:bg-white/10"></div>}
                {comment.replies.map((reply: any) => <CommentItem key={reply.id} comment={reply} depth={depth + 1} />)}
            </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden pointer-events-none font-be-vietnam">
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto ${isAnimating ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
      <div className={`relative w-full md:w-[480px] h-[85vh] md:h-full mt-auto md:mt-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-3xl shadow-2xl flex flex-col transition-transform duration-500 ease-out transform pointer-events-auto rounded-t-[2.5rem] md:rounded-none md:rounded-l-[2.5rem] border-l border-white/20 dark:border-white/5 ${isAnimating ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}`}>
        <div className="pt-8 pb-4 px-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">Bình luận <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-md text-slate-500">{rawComments.length}</span></h3>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-2 no-scrollbar pb-6" onClick={() => setActiveDropdown(null)}>
          {isLoading ? <div className="flex flex-col items-center justify-center h-full gap-4"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div></div> : rawComments.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2 text-center opacity-50"><MessageCircle size={48} className="text-slate-400 mb-2"/><p className="font-bold text-slate-500">Chưa có bình luận nào.</p></div> : commentTree.map(c => <CommentItem key={c.id} comment={c} />)}
        </div>

        <div className="p-4 md:p-6 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-white/5 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          {replyingTo && <div className="flex justify-between items-center mb-3 bg-blue-50 dark:bg-blue-500/10 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/20 animate-slide-up"><span className="text-xs font-bold text-blue-600 dark:text-blue-400">Đang trả lời <span className="font-black">@{replyingTo.username}</span></span><button onClick={() => {setReplyingTo(null); setNewComment("");}} className="text-blue-400 hover:text-blue-600"><X size={16}/></button></div>}
          <form onSubmit={handlePostComment} className="flex gap-3 items-end">
            <div className="flex-1 relative">
                <textarea ref={inputRef} className="w-full bg-slate-100 dark:bg-white/5 px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-white rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none no-scrollbar block" placeholder={user ? "Thêm bình luận..." : "Đăng nhập để bình luận"} value={newComment} onChange={e => setNewComment(e.target.value)} rows={1} disabled={!user} />
            </div>
            <button type="submit" disabled={!newComment.trim() || !user} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-zinc-800 shrink-0"><Send size={18} className="ml-0.5"/></button>
          </form>
        </div>
      </div>
    </div>
  );
}
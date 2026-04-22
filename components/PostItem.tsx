"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, ShieldCheck, Crown, Sparkles, Send } from "lucide-react";

export default function PostItem({ post, onLike, currentUserId }: any) {
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[9px] font-black uppercase"><Crown size={10}/> Tối cao</span>;
      case "PARTNER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#80BF84]/10 border border-[#80BF84]/20 text-[#80BF84] text-[9px] font-black uppercase"><ShieldCheck size={10}/> Doanh nghiệp</span>;
      case "CREATOR": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase"><Sparkles size={10}/> Sáng tạo</span>;
      default: return null;
    }
  };

  return (
    <div className="relative group/post mb-6">
      <div className="absolute inset-0 bg-white/0 dark:bg-white/5 rounded-[2rem] opacity-0 group-hover/post:opacity-100 transition-opacity blur-lg"></div>
      <div className="relative bg-white/70 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/50 dark:border-white/5 p-5 md:p-6 shadow-lg transition-all z-10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <a href={`/${post.author?.username || ''}`} className="flex items-center gap-3 group/author">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
              <img src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.full_name}&background=random`} className="w-full h-full object-cover group-hover/author:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-none group-hover/author:text-[#80BF84] transition-colors">{post.author?.full_name}</h4>
                {getRoleBadge(post.author?.role)}
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">2 giờ trước</span>
            </div>
          </a>
          <button className="p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"><MoreHorizontal size={20}/></button>
        </div>

        {/* Content */}
        <p className="text-slate-800 dark:text-zinc-200 text-[15px] leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>
        {post.image_url && <img src={post.image_url} className="w-full rounded-2xl mb-6 border border-white/10 shadow-lg" alt="post" />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-6">
            <button onClick={() => onLike(post.id)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.isLiked ? 'text-rose-500' : 'text-slate-500 dark:text-zinc-400 hover:text-rose-500'}`}>
              <Heart size={18} className={post.isLiked ? 'fill-rose-500' : ''} /> {post.likes_count || 0}
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-500">
              <MessageCircle size={18} /> {post.comments_count || 0}
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-[#80BF84] transition-colors"><Share2 size={18} /> Chia sẻ</button>
        </div>
      </div>
    </div>
  );
}
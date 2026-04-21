"use client";

import { useState, useEffect } from "react";
import { 
  Sun, Moon, Bell, Heart, MessageCircle, Share2, Send, 
  Image as ImageIcon, Sparkles, MoreHorizontal, ShieldCheck, Crown
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- DỮ LIỆU MẪU (MOCK DATA) ---
const INITIAL_POSTS = [
  {
    id: "1",
    author: { full_name: "BS. Nguyễn Trần Tâm", role: "PARTNER_ADMIN", avatar_url: "" },
    content: "Mùa lạnh đến rồi, các bạn nhớ giữ ấm vùng cổ và vai gáy nhé. Bên clinic mình vừa cập nhật liệu trình massage đá nóng chuyên sâu giúp đã thông kinh lạc cực kỳ hiệu quả. Ai cần tư vấn cứ để lại bình luận nha! 🌿✨",
    likes: 124,
    comments: 18,
    isLiked: false,
    time_ago: "2 giờ trước"
  },
  {
    id: "2",
    author: { full_name: "Healthie By My", role: "CREATOR", avatar_url: "" },
    content: "Sáng nay thử bài Yoga 15 phút mở khớp hông của hệ thống gợi ý, thấy cơ thể nhẹ nhõm hẳn. Mọi người đã tập gì hôm nay chưa? Khoe thành tích xuống đây nào! 💪🧘‍♀️",
    likes: 356,
    comments: 42,
    isLiked: true,
    time_ago: "5 giờ trước"
  },
  {
    id: "3",
    author: { full_name: "Trần Văn A", role: "USER", avatar_url: "" },
    content: "Lần đầu tiên đặt lịch qua hệ thống AI Health Share. Công nhận thanh toán bảo chứng Escrow làm mình yên tâm hẳn. Spa phục vụ cũng rất chu đáo. Sẽ ủng hộ dài dài!",
    likes: 12,
    comments: 2,
    isLiked: false,
    time_ago: "1 ngày trước"
  }
];

export default function CommunityPage() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { setIsNotifOpen, setIsAuthModalOpen } = useUI();
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[9px] font-black uppercase tracking-wider"><Crown size={10}/> Quyền lực tối cao</span>;
      case "PARTNER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#80BF84]/10 border border-[#80BF84]/20 text-[#80BF84] text-[9px] font-black uppercase tracking-wider"><ShieldCheck size={10}/> Doanh nghiệp</span>;
      case "MODERATOR": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-wider"><ShieldCheck size={10}/> Kiểm duyệt viên</span>;
      case "CREATOR": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider"><Sparkles size={10}/> Nhà sáng tạo</span>;
      default: return <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-wider">Thành viên</span>;
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    // Giả lập call API
    setTimeout(() => {
      const newPost = {
        id: Date.now().toString(),
        author: { full_name: user.user_metadata?.full_name || user.email?.split('@')[0], role: userRole, avatar_url: "" },
        content: newPostContent,
        likes: 0, comments: 0, isLiked: false, time_ago: "Vừa xong"
      };
      setPosts([newPost, ...posts]);
      setNewPostContent("");
      setIsSubmitting(false);
      toast.success("Đã đăng bài viết thành công!");
    }, 600);
  };

  const handleLike = (postId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    }));
  };

  return (
    <div className="relative h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-y-auto no-scrollbar scroll-smooth transition-colors duration-500 flex justify-center">
      
      {/* Nút Sáng Tối & Thông báo */}
      <div className="fixed top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
        <button onClick={handleThemeToggle} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
          {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
        <button onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:scale-105 transition-all shadow-lg">
          <Bell size={20}/>
        </button>
      </div>

      <div className="w-full max-w-2xl pt-20 md:pt-24 pb-32 px-4 md:px-0">
        
        {/* HEADER */}
        <div className="mb-8 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                Cộng đồng AI Health <Sparkles className="text-[#80BF84]" size={28}/>
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 font-medium">Nơi chia sẻ trải nghiệm, kết nối và lan tỏa lối sống khỏe.</p>
        </div>

        {/* KHỐI ĐĂNG BÀI (COMPOSER) */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <form onSubmit={handleCreatePost} className="relative bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl rounded-[2rem] border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group overflow-hidden transition-all focus-within:border-[#80BF84]/50 focus-within:shadow-[0_0_30px_rgba(128,191,132,0.15)]">
                {/* Glow Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-[#80BF84] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden border-2 border-transparent group-focus-within:border-[#80BF84] transition-colors">
                        <img src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'A'}&background=80BF84&color=fff`} className="w-full h-full object-cover" alt="avatar" />
                    </div>
                    <div className="flex-1">
                        <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Chia sẻ hành trình sống khỏe của bạn hôm nay..." 
                            className="w-full bg-transparent border-none outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 font-medium text-lg pt-2"
                            rows={3}
                        />
                    </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex gap-2">
                        <button type="button" className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 hover:text-[#80BF84] dark:hover:text-[#80BF84] transition-colors tooltip-trigger" title="Đính kèm ảnh/video"><ImageIcon size={20}/></button>
                    </div>
                    <button type="submit" disabled={!newPostContent.trim() || isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-[#80BF84] text-zinc-950 font-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                        {isSubmitting ? <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <Send size={16}/>}
                        Đăng bài
                    </button>
                </div>
            </form>
        </div>

        {/* DANH SÁCH BÀI VIẾT (FEED) */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {posts.map((post) => (
                <div key={post.id} className="bg-white/60 dark:bg-black/40 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 p-5 md:p-6 shadow-lg hover:border-slate-300 dark:hover:border-white/20 transition-all">
                    
                    {/* Post Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${post.author.full_name}&background=random`} className="w-full h-full object-cover" alt="avatar" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-none">{post.author.full_name}</h4>
                                    {getRoleBadge(post.author.role)}
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">{post.time_ago}</span>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreHorizontal size={20}/></button>
                    </div>

                    {/* Post Body */}
                    <p className="text-slate-700 dark:text-zinc-300 text-[15px] leading-relaxed mb-6 whitespace-pre-wrap">
                        {post.content}
                    </p>

                    {/* Post Footer (Actions) */}
                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-sm font-bold transition-colors group ${post.isLiked ? 'text-rose-500' : 'text-slate-500 dark:text-zinc-400 hover:text-rose-500'}`}>
                            <div className={`p-2 rounded-full transition-all ${post.isLiked ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-rose-500/10'}`}>
                                <Heart size={18} className={post.isLiked ? 'fill-rose-500' : ''} />
                            </div>
                            {post.likes}
                        </button>
                        
                        <button className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-500 transition-colors group">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-blue-500/10 transition-all">
                                <MessageCircle size={18} />
                            </div>
                            {post.comments}
                        </button>

                        <button className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-[#80BF84] transition-colors group ml-auto">
                            <div className="p-2 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-[#80BF84]/10 transition-all">
                                <Share2 size={18} />
                            </div>
                            Chia sẻ
                        </button>
                    </div>

                </div>
            ))}
        </div>

      </div>
    </div>
  );
}
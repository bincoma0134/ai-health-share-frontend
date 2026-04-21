"use client";

import { useState, useEffect } from "react";
import { 
  Sun, Moon, Bell, Heart, MessageCircle, Share2, Send, 
  Image as ImageIcon, Sparkles, MoreHorizontal, ShieldCheck, 
  Crown, Flame, Clock, Users, Hash
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
    content: "Mùa lạnh đến rồi, các bạn nhớ giữ ấm vùng cổ và vai gáy nhé. Bên clinic mình vừa cập nhật liệu trình massage đá nóng chuyên sâu giúp đả thông kinh lạc cực kỳ hiệu quả. Ai cần tư vấn cứ để lại bình luận nha! 🌿✨",
    likes: 124,
    comments: 18,
    isLiked: false,
    time_ago: "2 giờ trước"
  },
  {
    id: "2",
    author: { full_name: "Healthie By My", role: "CREATOR", avatar_url: "" },
    content: "Sáng nay thử bài Yoga 15 phút mở khớp hông của hệ thống gợi ý, thấy cơ thể nhẹ nhõm hẳn. Mọi người đã tập gì hôm nay chưa? Khoe thành tích xuống đây nào! 💪🧘‍♀️\n\n#YogaMoiNgay #HealthJourney",
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
  const [activeTab, setActiveTab] = useState("Dành cho bạn");

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
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-500 text-[9px] font-black uppercase tracking-wider"><Crown size={10}/> Tối cao</span>;
      case "PARTNER_ADMIN": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#80BF84]/10 border border-[#80BF84]/20 text-[#80BF84] text-[9px] font-black uppercase tracking-wider"><ShieldCheck size={10}/> Doanh nghiệp</span>;
      case "MODERATOR": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-wider"><ShieldCheck size={10}/> Kiểm duyệt</span>;
      case "CREATOR": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider"><Sparkles size={10}/> Sáng tạo</span>;
      default: return <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-wider">Thành viên</span>;
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setIsAuthModalOpen(true);
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
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
      toast.success("Đã chia sẻ thành công!");
    }, 600);
  };

  const handleLike = (postId: string) => {
    if (!user) return setIsAuthModalOpen(true);
    setPosts(posts.map(p => {
      if (p.id === postId) return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      return p;
    }));
  };

  return (
    <div className="relative h-[100dvh] w-full bg-slate-50 dark:bg-zinc-950 overflow-y-auto no-scrollbar scroll-smooth transition-colors duration-500 flex justify-center font-be-vietnam">
      
      {/* Nút Sáng Tối & Thông báo */}
      <div className="fixed top-6 right-6 md:top-8 md:right-8 z-[60] flex items-center gap-3">
        <button onClick={handleThemeToggle} className="w-11 h-11 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition-all">
          {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
        <button onClick={() => setIsNotifOpen(true)} className="w-11 h-11 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition-all">
          <Bell size={20}/>
        </button>
      </div>

      <div className="w-full max-w-2xl pt-20 md:pt-24 pb-32 px-4 md:px-0">
        
        {/* HEADER & FILTERS */}
        <div className="mb-8 animate-slide-up sticky top-0 pt-4 pb-4 z-50 bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-xl">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                Cộng đồng <Sparkles className="text-[#80BF84]" size={28}/>
            </h2>
            
            {/* Social Filters (Pills) */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {[
                  { name: "Dành cho bạn", icon: Flame },
                  { name: "Mới nhất", icon: Clock },
                  { name: "Đang theo dõi", icon: Users },
                  { name: "Thảo luận", icon: Hash }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.name;
                  return (
                    <button 
                      key={tab.name} 
                      onClick={() => setActiveTab(tab.name)}
                      className={`whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border ${
                        isActive 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg scale-105' 
                        : 'bg-white/60 dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-[#80BF84]' : ''} /> {tab.name}
                    </button>
                  );
                })}
            </div>
        </div>

        {/* KHỐI ĐĂNG BÀI (COMPOSER) - GLOW MẠNH MẼ HƠN */}
        <div className="mb-8 animate-slide-up relative group/composer" style={{ animationDelay: '0.1s' }}>
            {/* Ambient Glow Tỏa ra xung quanh trong Dark Mode */}
            <div className="absolute inset-[-2px] bg-gradient-to-r from-[#80BF84]/0 via-[#80BF84]/20 to-[#80BF84]/0 rounded-[2.5rem] blur-xl opacity-0 dark:group-focus-within/composer:opacity-100 transition-opacity duration-700"></div>

            <form onSubmit={handleCreatePost} className="relative bg-white/70 dark:bg-zinc-900/60 backdrop-blur-3xl rounded-[2rem] border border-white/50 dark:border-white/10 p-5 md:p-6 shadow-xl dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.5)] transition-all z-10">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden border border-slate-300 dark:border-zinc-700 shadow-inner">
                        <img src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'A'}&background=80BF84&color=fff`} className="w-full h-full object-cover" alt="avatar" />
                    </div>
                    <div className="flex-1">
                        <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Chia sẻ hành trình sống khỏe, đặt câu hỏi hoặc review dịch vụ..." 
                            className="w-full bg-transparent border-none outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 font-medium text-lg pt-2 focus:ring-0"
                            rows={3}
                        />
                    </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
                    <div className="flex gap-2">
                        <button type="button" className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 hover:text-[#80BF84] dark:hover:text-[#80BF84] hover:bg-[#80BF84]/10 transition-colors" title="Đính kèm ảnh/video"><ImageIcon size={20}/></button>
                    </div>
                    <button type="submit" disabled={!newPostContent.trim() || isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#80BF84] to-emerald-500 text-zinc-950 font-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_20px_rgba(128,191,132,0.3)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(128,191,132,0.2)]">
                        {isSubmitting ? <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> : <Send size={16}/>}
                        Chia sẻ
                    </button>
                </div>
            </form>
        </div>

        {/* DANH SÁCH BÀI VIẾT (FEED) */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {posts.map((post) => (
                <div key={post.id} className="relative group/post">
                    {/* Hover Glow cho từng bài viết trong Dark Mode */}
                    <div className="absolute inset-0 bg-white/0 dark:bg-white/5 rounded-[2rem] opacity-0 group-hover/post:opacity-100 transition-opacity blur-lg"></div>

                    <div className="relative bg-white/70 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/50 dark:border-white/5 p-5 md:p-6 shadow-lg dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.4)] transition-all z-10">
                        
                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 cursor-pointer group/author">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
                                    <img src={`https://ui-avatars.com/api/?name=${post.author.full_name}&background=random`} className="w-full h-full object-cover group-hover/author:scale-110 transition-transform" alt="avatar" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-base leading-none group-hover/author:text-[#80BF84] transition-colors">{post.author.full_name}</h4>
                                        {getRoleBadge(post.author.role)}
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">{post.time_ago}</span>
                                </div>
                            </div>
                            <button className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"><MoreHorizontal size={20}/></button>
                        </div>

                        {/* Post Body */}
                        <p className="text-slate-800 dark:text-zinc-200 text-[15px] leading-relaxed mb-6 whitespace-pre-wrap">
                            {post.content}
                        </p>

                        {/* Post Footer (Actions) */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/5">
                            <div className="flex items-center gap-6">
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
                            </div>

                            <button className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-zinc-400 hover:text-[#80BF84] transition-colors group">
                                <div className="p-2 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-[#80BF84]/10 transition-all">
                                    <Share2 size={18} />
                                </div>
                                <span className="hidden sm:block">Chia sẻ</span>
                            </button>
                        </div>

                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}
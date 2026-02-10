/// <reference lib="dom.iterable" />
/// <reference lib="es2015.iterable" />

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  TrendingUp,
  MessageSquare,
  Plus,
  ArrowUp,
  ArrowDown,
  Award,
  Bookmark,
  Share2,
} from 'lucide-react';

const IS_TEST = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

interface Forum {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon_url?: string;
  member_count: number;
  post_count: number;
  category: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
  user: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  forum: {
    name: string;
    display_name: string;
  };
  user_vote?: 'up' | 'down' | null;
}

export function ForumHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [forums, setForums] = useState<Forum[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (IS_TEST) return;
    loadForums();
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredForums = useMemo(() => {
    if (!searchQuery.trim()) return forums;
    const q = searchQuery.toLowerCase();
    return forums.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.display_name.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q)
    );
  }, [forums, searchQuery]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        p.forum.display_name.toLowerCase().includes(q) ||
        p.forum.name.toLowerCase().includes(q) ||
        (p.user.display_name || '').toLowerCase().includes(q) ||
        (p.user.username || '').toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery]);

  async function loadForums() {
    if (IS_TEST) return;
    const { data } = await supabase
      .from('forums')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(10);

    if (data) setForums(data);
  }

  async function loadPosts() {
    if (IS_TEST) return;
    setLoading(true);

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        user:profiles!user_id(username, display_name, avatar_url),
        forum:forums!forum_id(name, display_name)
      `);

    if (sortBy === 'hot' || sortBy === 'top') {
      query = query.order('vote_count', { ascending: false });
    } else if (sortBy === 'new') {
      query = query.order('created_at', { ascending: false });
    }

    const { data } = await query.limit(50);

    if (data) setPosts(data as Post[]);
    setLoading(false);
  }

  async function handleVote(postId: string, voteType: 'up' | 'down') {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { error } = await supabase.from('forum_votes').upsert({
      user_id: user.id,
      post_id: postId,
      vote_type: voteType,
    });

    if (!error) {
      loadPosts();
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <CladeLogoAnimated size={24} className="text-primary" />
              <h1 className="text-2xl font-bold">Forums</h1>
            </div>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forums and posts..."
                  className="pl-10"
                />
              </div>
            </div>

            <Button onClick={() => navigate('/forum/create-post')}>
              <Plus className="h-5 w-5 mr-2" />
              Create Post
            </Button>

            <ProfileCircle />
          </div>

          <div className="flex gap-2 mt-4">
            {(['hot', 'new', 'top'] as const).map((sort) => (
              <Button
                key={sort}
                variant={sortBy === sort ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setSortBy(sort);
                  loadPosts();
                }}
              >
                {sort === 'hot' && <TrendingUp className="h-4 w-4 mr-2" />}
                <span>{sort.charAt(0).toUpperCase() + sort.slice(1)}</span>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={handleVote}
                  onClick={() => navigate(`/forum/post/${post.id}`)}
                />
              ))
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Popular Forums
              </h2>

              <div className="space-y-3">
                {filteredForums.map((forum) => (
                  <motion.button
                    key={forum.id}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/forum/${forum.name}`)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">f/{forum.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {forum.member_count.toLocaleString()} members
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Join
                      </Button>
                    </div>
                  </motion.button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-bold mb-2">Create a Forum</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Build a community around your passion
              </p>
              <Button className="w-full" onClick={() => navigate('/forum/create-forum')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Forum
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: Post;
  onVote: (postId: string, voteType: 'up' | 'down') => void;
  onClick: () => void;
}

function PostCard({ post, onVote, onClick }: PostCardProps) {
  const [localVoteCount, setLocalVoteCount] = useState(post.vote_count);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(post.user_vote || null);

  const handleVote = (voteType: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();

    if (userVote === voteType) {
      setUserVote(null);
      setLocalVoteCount(localVoteCount - (voteType === 'up' ? 1 : -1));
    } else if (userVote) {
      setUserVote(voteType);
      setLocalVoteCount(localVoteCount + (voteType === 'up' ? 2 : -2));
    } else {
      setUserVote(voteType);
      setLocalVoteCount(localVoteCount + (voteType === 'up' ? 1 : -1));
    }

    onVote(post.id, voteType);
  };

  return (
    <Card className="p-4 hover:border-border/80 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <button onClick={(e) => handleVote('up', e)}>
            <ArrowUp className="h-5 w-5" />
          </button>

          <span className="text-sm font-bold">{localVoteCount}</span>

          <button onClick={(e) => handleVote('down', e)}>
            <ArrowDown className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-2">
            f/{post.forum.name} • u/{post.user.username} • {getTimeAgo(post.created_at)}
          </div>

          <h3 className="text-lg font-bold mb-2">{post.title}</h3>

          {post.content && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.content}</p>
          )}

          <div className="flex gap-4 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <Award className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
            <Bookmark className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

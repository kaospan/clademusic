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
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  TrendingUp,
  Users,
  MessageSquare,
  Plus,
  ArrowUp,
  ArrowDown,
  Award,
  Bookmark,
  Share2,
} from 'lucide-react';

const IS_TEST =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

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
  const [load]()

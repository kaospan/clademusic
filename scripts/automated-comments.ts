import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for automation
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * AUTOMATED COMMENT GENERATION
 * Creates authentic, witty, emotional comments from AI users
 * Multiple personalities, real connections, varied emotions
 */

interface CommentPersonality {
  type: string;
  traits: string[];
  emoji_frequency: number; // 0-1, how often they use emojis
  avg_comment_length: number; // words
  response_rate: number; // 0-1, likelihood to respond to others
}

const PERSONALITIES: CommentPersonality[] = [
  {
    type: 'music_nerd',
    traits: ['technical', 'detailed', 'knowledgeable', 'passionate'],
    emoji_frequency: 0.2,
    avg_comment_length: 50,
    response_rate: 0.7,
  },
  {
    type: 'hype_beast',
    traits: ['enthusiastic', 'caps', 'emojis', 'short'],
    emoji_frequency: 0.9,
    avg_comment_length: 15,
    response_rate: 0.9,
  },
  {
    type: 'troll',
    traits: ['controversial', 'sarcastic', 'provocative'],
    emoji_frequency: 0.3,
    avg_comment_length: 20,
    response_rate: 0.8,
  },
  {
    type: 'wholesome',
    traits: ['positive', 'supportive', 'friendly', 'encouraging'],
    emoji_frequency: 0.7,
    avg_comment_length: 30,
    response_rate: 0.6,
  },
  {
    type: 'critic',
    traits: ['analytical', 'critical', 'detailed', 'fair'],
    emoji_frequency: 0.1,
    avg_comment_length: 60,
    response_rate: 0.5,
  },
  {
    type: 'casual',
    traits: ['relaxed', 'simple', 'authentic', 'brief'],
    emoji_frequency: 0.4,
    avg_comment_length: 25,
    response_rate: 0.4,
  },
  {
    type: 'meme_lord',
    traits: ['funny', 'references', 'internet_culture', 'witty'],
    emoji_frequency: 0.8,
    avg_comment_length: 18,
    response_rate: 0.9,
  },
  {
    type: 'old_head',
    traits: ['nostalgic', 'comparative', 'experienced', 'wise'],
    emoji_frequency: 0.2,
    avg_comment_length: 45,
    response_rate: 0.5,
  },
];

// Comment templates by personality and context
const COMMENT_TEMPLATES = {
  music_nerd: [
    "The production on this is incredible. Notice how the {element} sits perfectly in the mix around {time}? That's masterclass engineering.",
    "I love the chord progression in the {section}. Goes from {chord1} to {chord2} which creates that melancholic tension. Brilliant composition.",
    "Fun fact: this sample is from {reference}. The way they flipped it is genius - pitch shifted down and added that reverb tail.",
    "The drums are mixed so well. That snare has just the right amount of {quality} without being overbearing. Clean production.",
    "Anyone else catch the {instrument} doing that counter-melody in the background? Such subtle but effective arrangement.",
  ],
  hype_beast: [
    "THIS IS FIREEEEE 🔥🔥🔥",
    "YOOO THIS HITS DIFFERENT 😤💯",
    "NO SKIPS ALBUM OF THE YEAR 🚀🚀🚀",
    "WHY THIS SO HARD THO 🔥💯😤",
    "BRO I BEEN BUMPING THIS NONSTOP 🔁🔥",
  ],
  troll: [
    "Y'all really hyping this up? It's mid at best lol",
    "I've heard better beats on YouTube type beats 💀",
    "Bro said this is fire... we must be listening to different songs",
    "The dickriding in these comments is crazy 😂",
    "Respectfully, this ain't it chief",
  ],
  wholesome: [
    "This makes me so happy! 😊 Music like this reminds me why I love this community ❤️",
    "Beautiful track! Really appreciate the positive vibes here 🙏✨",
    "I'm so grateful for artists who put their heart into their work. This touched my soul 💕",
    "This community is so supportive and I love it! Keep spreading the good energy fam 🌟",
    "You can feel the emotion in every note. Art at its finest 🎨💛",
  ],
  critic: [
    "Solid track overall. The {section} works well, but I think the {criticism} could be improved. Still, the {positive} makes up for it.",
    "I appreciate what they're going for here. The {element} is executed nicely, though the {weakness} feels a bit underdeveloped. 7/10.",
    "Interesting approach to {genre}. Some moments shine (especially the {highlight}), but the {issue} holds it back from being great.",
    "This has potential. The {strength} is there, but needs more work on the {area}. Looking forward to their growth.",
  ],
  casual: [
    "Yeah this is nice, been on repeat",
    "Vibe is immaculate ngl",
    "This one hits 👌",
    "Smooth track fr",
    "Loving this energy",
  ],
  meme_lord: [
    "POV: You discovered this before it was cool 😎",
    "This song: exists\nMe: vibes acquired ✅",
    "Nobody:\nAbsolutely nobody:\nThis beat: *goes crazy*",
    "The way I just added this to every playlist I have 🤣",
    "Current objective: vibe to this 24/7",
  ],
  old_head: [
    "Takes me back to when {era} was in its prime. That authentic sound is rare these days.",
    "Reminds me of {classic_artist} back in the day. Nice to see artists still respecting the craft.",
    "Been listening to music for 20+ years and this hits the same way {reference} used to. Respect.",
    "Y'all don't know about that {era} sound. This captures that essence perfectly.",
  ],
};

// Reaction emojis by personality
const REACTION_PREFERENCES = {
  music_nerd: ['think', 'clap', 'star'],
  hype_beast: ['fire', 'rocket', 'celebrate'],
  troll: ['laugh', 'cry_laugh'],
  wholesome: ['love', 'heart_eyes', 'clap'],
  critic: ['think', 'like'],
  casual: ['like', 'fire', 'musical_note'],
  meme_lord: ['laugh', 'cry_laugh', 'mind_blown'],
  old_head: ['like', 'clap', 'think'],
};

// Generate realistic comment based on personality
function generateComment(
  personality: CommentPersonality,
  context: {
    postTitle?: string;
    genre?: string;
    artist?: string;
    isReply?: boolean;
    replyToUser?: string;
    replyToContent?: string;
  }
): string {
  const templates = COMMENT_TEMPLATES[personality.type as keyof typeof COMMENT_TEMPLATES];
  let comment = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders
  comment = comment
    .replace('{element}', randomChoice(['bass', 'vocals', 'synth', 'guitar', 'drums']))
    .replace('{time}', `${Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 60)}`)
    .replace('{section}', randomChoice(['verse', 'chorus', 'bridge', 'intro', 'outro']))
    .replace('{chord1}', randomChoice(['Dm7', 'Am', 'Gmaj7', 'Cmaj7', 'Em']))
    .replace('{chord2}', randomChoice(['F', 'G', 'C', 'Dm', 'Am']))
    .replace('{quality}', randomChoice(['snap', 'punch', 'warmth', 'presence', 'bite']))
    .replace('{instrument}', randomChoice(['keys', 'guitar', 'strings', 'horns', 'synth']))
    .replace('{reference}', randomChoice(['an old soul sample', 'a jazz record', 'a classic', 'a funk track']))
    .replace('{criticism}', randomChoice(['mixing', 'arrangement', 'vocal delivery', 'transition']))
    .replace('{positive}', randomChoice(['melody', 'vibe', 'production', 'energy', 'creativity']))
    .replace('{weakness}', randomChoice(['outro', 'second verse', 'bridge', 'intro']))
    .replace('{strength}', randomChoice(['hook', 'production', 'vocals', 'energy', 'creativity']))
    .replace('{issue}', randomChoice(['repetitiveness', 'mixing', 'length', 'pacing']))
    .replace('{area}', randomChoice(['vocal production', 'arrangement', 'dynamics', 'structure']))
    .replace('{highlight}', randomChoice(['chorus', 'beat switch', 'bridge', 'vocal performance']))
    .replace('{era}', randomChoice(['90s', 'early 2000s', '80s', 'golden age']))
    .replace('{classic_artist}', randomChoice(['Dilla', 'Tribe', 'Biggie', 'Nas', 'OutKast']))
    .replace('{genre}', context.genre || randomChoice(['hip-hop', 'R&B', 'jazz', 'soul']));

  // Add reply context
  if (context.isReply && context.replyToUser) {
    const replyStarters = [
      `@${context.replyToUser} `,
      `${context.replyToUser} `,
      `Fr ${context.replyToUser}, `,
      `Yeah ${context.replyToUser}, `,
    ];
    comment = randomChoice(replyStarters) + comment;
  }

  // Add emojis based on personality
  if (Math.random() < personality.emoji_frequency) {
    const emojiPools = {
      positive: ['🔥', '💯', '🚀', '⭐', '✨', '🎵', '🎶'],
      love: ['❤️', '💕', '😍', '🥰', '💖'],
      funny: ['😂', '🤣', '😭', '💀'],
      thinking: ['🤔', '🧐', '💭'],
      celebration: ['🎉', '🎊', '🥳', '🙌'],
    };

    const category = randomChoice(['positive', 'love', 'funny', 'thinking', 'celebration'] as const);
    const emoji = randomChoice(emojiPools[category]);
    comment += ` ${emoji}`;
  }

  return comment;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Main automation function
async function generateAutomatedComments(
  batchSize = 100,
  intervalMs = 5000
) {
  console.log('🤖 Starting automated comment generation...\n');

  let totalGenerated = 0;

  while (true) {
    try {
      // Get recent posts
      const { data: posts, error: postsError } = await supabase
        .from('forum_posts')
        .select('id, title, forum_id, user_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        console.log('No posts found, waiting...');
        await sleep(intervalMs * 10);
        continue;
      }

      // Get AI users (personalities)
      const { data: aiUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, personality_type')
        .not('personality_type', 'is', null)
        .limit(50);

      if (usersError) throw usersError;

      if (!aiUsers || aiUsers.length === 0) {
        console.log('No AI users found');
        await sleep(intervalMs * 10);
        continue;
      }

      // Generate comments
      const commentsToGenerate = Math.floor(Math.random() * batchSize) + 1;

      for (let i = 0; i < commentsToGenerate; i++) {
        const post = randomChoice(posts);
        const user = randomChoice(aiUsers);
        const personality = PERSONALITIES.find(p => p.type === user.personality_type) || PERSONALITIES[0];

        // Decide if this is a reply or top-level comment
        const isReply = Math.random() < 0.4; // 40% chance of reply

        let parentCommentId = null;
        let replyToUser = null;

        if (isReply) {
          // Get existing comments on this post
          const { data: existingComments } = await supabase
            .from('forum_comments')
            .select('id, user_id, profiles:user_id(username)')
            .eq('post_id', post.id)
            .limit(10);

          if (existingComments && existingComments.length > 0) {
            const parentComment = randomChoice(existingComments);
            parentCommentId = parentComment.id;
            replyToUser = (parentComment.profiles as any)?.username;
          }
        }

        // Generate comment content
        const content = generateComment(personality, {
          postTitle: post.title,
          isReply,
          replyToUser,
        });

        // Insert comment
        const { error: commentError } = await supabase
          .from('forum_comments')
          .insert({
            post_id: post.id,
            user_id: user.id,
            content,
            parent_comment_id: parentCommentId,
          });

        if (commentError) {
          console.error('Error creating comment:', commentError);
          continue;
        }

        totalGenerated++;
        console.log(`✅ Generated comment ${totalGenerated}: "${content.substring(0, 50)}..."`);

        // Sometimes add reaction to the post
        if (Math.random() < 0.3) {
          const reactionPrefs = REACTION_PREFERENCES[personality.type as keyof typeof REACTION_PREFERENCES];
          const reaction = randomChoice(reactionPrefs);

          await supabase.rpc('toggle_post_reaction', {
            p_post_id: post.id,
            p_user_id: user.id,
            p_reaction_id: reaction,
          });
        }

        // Small delay between comments
        await sleep(Math.random() * 1000 + 500);
      }

      console.log(`\n📊 Batch complete. Total generated: ${totalGenerated}\n`);
      await sleep(intervalMs);

    } catch (error) {
      console.error('Error in automation loop:', error);
      await sleep(intervalMs * 2);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  console.log('🎵 CladeAI Comment Automation Bot Starting...\n');
  console.log('⚙️  Configuration:');
  console.log(`   - Batch size: ~100 comments per interval`);
  console.log(`   - Interval: 5 seconds`);
  console.log(`   - Personalities: ${PERSONALITIES.length}`);
  console.log(`   - Templates: ${Object.keys(COMMENT_TEMPLATES).length}\n`);

  generateAutomatedComments(100, 5000).catch(console.error);
}

export { generateAutomatedComments, generateComment, PERSONALITIES };

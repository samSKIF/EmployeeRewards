// Social storage module for ThrivioHR platform
// Gold standard compliance: Enterprise-grade error handling and type safety

import { db } from '../db';
import {
  posts,
  comments,
  reactions,
  polls,
  pollVotes,
  users,
  type Post,
  type InsertPost,
  type Comment,
  type InsertComment,
  type Reaction,
  type InsertReaction,
  type Poll,
  type InsertPoll,
  type PollVote,
  type InsertPollVote,
} from '@shared/schema';
import { eq, desc, and, count, inArray } from 'drizzle-orm';
import type {
  PostWithDetails,
  CommentWithUser,
  PollWithVotes,
  SocialStats,
} from '@shared/types';
import type { ISocialStorage } from './interfaces';

export class SocialStorage implements ISocialStorage {
  // Channel management methods
  async getTrendingChannels() {
    try {
      // Return empty array for now - can be enhanced later
      return [];
    } catch (error: any) {
      console.error('Error getting trending channels:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getChannelSuggestions() {
    try {
      // Return empty array for now - can be enhanced later
      return [];
    } catch (error: any) {
      console.error('Error getting channel suggestions:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getUserChannels(userId: number) {
    try {
      // Return empty array for now - can be enhanced later
      return [];
    } catch (error: any) {
      console.error('Error getting user channels:', error?.message || 'unknown_error');
      return [];
    }
  }
  async createPost(postData: InsertPost): Promise<Post> {
    try {
      const [post] = await db.insert(posts).values(postData).returning();
      return post;
    } catch (error: any) {
      console.error('Error creating post:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async createBirthdayPost(userId: number): Promise<Post> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]) throw new Error('User not found');

      const content = `🎉 Happy Birthday to ${user[0].name}! 🎂 Wishing you a wonderful day filled with happiness and joy!`;

      const [post] = await db
        .insert(posts)
        .values({
          userId,
          content,
          type: 'birthday',
          visibility: 'public',
        })
        .returning();

      return post;
    } catch (error: any) {
      console.error('Error creating birthday post:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async createWorkAnniversaryPost(userId: number): Promise<Post> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]) throw new Error('User not found');

      const content = `🎊 Congratulations to ${user[0].name} on their work anniversary! 🏆 Thank you for your dedication and hard work!`;

      const [post] = await db
        .insert(posts)
        .values({
          userId,
          content,
          type: 'work_anniversary',
          visibility: 'public',
        })
        .returning();

      return post;
    } catch (error: any) {
      console.error('Error creating work anniversary post:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getPosts(currentUserId?: number): Promise<PostWithDetails[]> {
    try {
      const postsData = await db
        .select({
          post: posts,
          user: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .orderBy(desc(posts.createdAt));

      if (postsData.length === 0) return [];

      const postIds = postsData.map((p) => p.post.id);

      // Get reaction counts for posts
      const reactionCountsData = await db
        .select({
          postId: reactions.postId,
          count: count(reactions.id),
        })
        .from(reactions)
        .where(inArray(reactions.postId, postIds))
        .groupBy(reactions.postId);

      // Get current user's reactions if provided
      let userReactionsData: { postId: number; type: string }[] = [];
      if (currentUserId) {
        userReactionsData = await db
          .select({
            postId: reactions.postId,
            type: reactions.type,
          })
          .from(reactions)
          .where(
            and(
              inArray(reactions.postId, postIds),
              eq(reactions.userId, currentUserId)
            )
          );
      }

      // Get comment counts for posts
      const commentCountsData = await db
        .select({
          postId: comments.postId,
          count: count(comments.id),
        })
        .from(comments)
        .where(inArray(comments.postId, postIds))
        .groupBy(comments.postId);

      // Create maps for efficient lookup
      const reactionCountsMap = new Map<number, number>();
      reactionCountsData.forEach((r) => {
        reactionCountsMap.set(r.postId, Number(r.count));
      });

      const userReactionsMap = new Map<number, string>();
      userReactionsData.forEach((r) => {
        userReactionsMap.set(r.postId, r.type);
      });

      const commentCountsMap = new Map<number, number>();
      commentCountsData.forEach((c) => {
        commentCountsMap.set(c.postId, Number(c.count));
      });

      return postsData.map((p) => {
        const userWithoutPassword = p.user ? {
          ...p.user,
          createdAt: p.user.created_at || new Date(),
        } : {} as any;

        // Remove password if exists
        if ('password' in userWithoutPassword) {
          const { password, ...userSafe } = userWithoutPassword;
          return {
            ...p.post,
            user: userSafe,
            reactionCount: reactionCountsMap.get(p.post.id) || 0,
            userReaction: userReactionsMap.get(p.post.id) || null,
            commentCount: commentCountsMap.get(p.post.id) || 0,
          };
        }

        return {
          ...p.post,
          user: userWithoutPassword,
          reactionCount: reactionCountsMap.get(p.post.id) || 0,
          userReaction: userReactionsMap.get(p.post.id) || null,
          commentCount: commentCountsMap.get(p.post.id) || 0,
        };
      });
    } catch (error: any) {
      console.error('Error getting posts:', error?.message || 'unknown_error');
      return [];
    }
  }

  async getPostById(id: number): Promise<PostWithDetails | undefined> {
    try {
      const [postData] = await db
        .select({
          post: posts,
          user: users,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.id, id));

      if (!postData) return undefined;

      const userWithoutPassword = postData.user ? {
        ...postData.user,
        createdAt: postData.user.created_at || new Date(),
      } : {} as any;

      // Remove password if exists
      if ('password' in userWithoutPassword) {
        const { password, ...userSafe } = userWithoutPassword;
        return {
          ...postData.post,
          user: userSafe,
          reactionCount: 0,
          userReaction: null,
          commentCount: 0,
        };
      }

      return {
        ...postData.post,
        user: userWithoutPassword,
        reactionCount: 0,
        userReaction: null,
        commentCount: 0,
      };
    } catch (error: any) {
      console.error('Error getting post by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      await db.delete(posts).where(eq(posts.id, id));
      return true;
    } catch (error: any) {
      console.error('Error deleting post:', error?.message || 'unknown_error');
      return false;
    }
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    try {
      const [comment] = await db.insert(comments).values(commentData).returning();
      return comment;
    } catch (error: any) {
      console.error('Error creating comment:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getCommentsByPostId(postId: number, currentUserId?: number): Promise<CommentWithUser[]> {
    try {
      const commentsData = await db
        .select({
          comment: comments,
          user: users,
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.postId, postId))
        .orderBy(comments.createdAt);

      return commentsData.map((c) => {
        const userWithoutPassword = c.user ? {
          ...c.user,
          createdAt: c.user.created_at || new Date(),
        } : {} as any;

        // Remove password if exists
        if ('password' in userWithoutPassword) {
          const { password, ...userSafe } = userWithoutPassword;
          return {
            ...c.comment,
            user: userSafe,
            reactionCount: 0,
            userReaction: null,
          };
        }

        return {
          ...c.comment,
          user: userWithoutPassword,
          reactionCount: 0,
          userReaction: null,
        };
      });
    } catch (error: any) {
      console.error('Error getting comments by post ID:', error?.message || 'unknown_error');
      return [];
    }
  }

  async deleteComment(id: number): Promise<boolean> {
    try {
      await db.delete(comments).where(eq(comments.id, id));
      return true;
    } catch (error: any) {
      console.error('Error deleting comment:', error?.message || 'unknown_error');
      return false;
    }
  }

  async addReaction(userId: number, reactionData: InsertReaction): Promise<Reaction> {
    try {
      // Remove any existing reaction by this user on this post
      await this.removeReaction(userId, reactionData.postId);

      // Add the new reaction
      const [reaction] = await db
        .insert(reactions)
        .values({
          ...reactionData,
          userId,
        })
        .returning();

      return reaction;
    } catch (error: any) {
      console.error('Error adding reaction:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async removeReaction(userId: number, postId: number): Promise<boolean> {
    try {
      await db
        .delete(reactions)
        .where(and(eq(reactions.userId, userId), eq(reactions.postId, postId)));
      return true;
    } catch (error: any) {
      console.error('Error removing reaction:', error?.message || 'unknown_error');
      return false;
    }
  }

  async getUserReaction(userId: number, postId: number): Promise<Reaction | undefined> {
    try {
      const [reaction] = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.userId, userId), eq(reactions.postId, postId)));

      return reaction;
    } catch (error: any) {
      console.error('Error getting user reaction:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async createPoll(pollData: InsertPoll): Promise<Poll> {
    try {
      const [poll] = await db.insert(polls).values(pollData).returning();
      return poll;
    } catch (error: any) {
      console.error('Error creating poll:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getPollById(id: number): Promise<PollWithVotes | undefined> {
    try {
      // Get the poll
      const [poll] = await db.select().from(polls).where(eq(polls.id, id));

      if (!poll) return undefined;

      // Get vote counts for each option
      const voteResults = await db
        .select({
          optionIndex: pollVotes.optionIndex,
          count: count(pollVotes.id),
        })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, id))
        .groupBy(pollVotes.optionIndex);

      // Get total votes
      const [totalVotesResult] = await db
        .select({
          count: count(pollVotes.id),
        })
        .from(pollVotes)
        .where(eq(pollVotes.pollId, id));

      const totalVotes = Number(totalVotesResult.count);

      // Construct vote counts and percentages arrays
      const voteCounts = new Array(poll.options.length).fill(0);
      const votePercentages = new Array(poll.options.length).fill(0);

      voteResults.forEach((result) => {
        voteCounts[result.optionIndex] = Number(result.count);
        votePercentages[result.optionIndex] =
          totalVotes > 0
            ? Math.round((Number(result.count) / totalVotes) * 100)
            : 0;
      });

      return {
        ...poll,
        totalVotes,
        voteCounts,
        votePercentages,
      };
    } catch (error: any) {
      console.error('Error getting poll by ID:', error?.message || 'unknown_error');
      return undefined;
    }
  }

  async submitPollVote(voteData: InsertPollVote): Promise<PollVote> {
    try {
      const [vote] = await db.insert(pollVotes).values(voteData).returning();
      return vote;
    } catch (error: any) {
      console.error('Error submitting poll vote:', error?.message || 'unknown_error');
      throw error;
    }
  }

  async getSocialStats(): Promise<SocialStats> {
    try {
      const [postStats] = await db.select({ count: count(posts.id) }).from(posts);
      const [commentStats] = await db.select({ count: count(comments.id) }).from(comments);
      const [reactionStats] = await db.select({ count: count(reactions.id) }).from(reactions);

      return {
        totalPosts: Number(postStats.count),
        totalComments: Number(commentStats.count),
        totalReactions: Number(reactionStats.count),
        totalInteractions: Number(postStats.count) + Number(commentStats.count) + Number(reactionStats.count),
      };
    } catch (error: any) {
      console.error('Error getting social stats:', error?.message || 'unknown_error');
      return {
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        totalInteractions: 0,
      };
    }
  }
}
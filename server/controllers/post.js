import mongoose from 'mongoose'
import Post from '../models/Post.js'
import cloudinary from '../cloudinary.js'
import User from '../models/User.js'

const safeDestroy = async publicId => {
    try {
        let r = await cloudinary.uploader.destroy(publicId)
        if (r.result !== 'ok' && r.result !== 'not found') {
            r = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
        }
        return r
    } catch (e) {
        console.error('safeDestroy', e)
        return null
    }
}

export const getFeed = async (req, res) => {
    try {
        const viewerId = new mongoose.Types.ObjectId(req.userId);

        const me = await User.findById(viewerId).select('following').lean();
        if (!me) return res.status(401).json({ message: 'unauthorized' });

        const authorIds = [viewerId, ...(me.following || [])].map(id => new mongoose.Types.ObjectId(id));

        const limit = Math.min(parseInt(req.query.limit || '10', 10), 25);
        const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

        const match = { author: { $in: authorIds } };
        if (cursor) match.createdAt = { $lt: cursor };

        const pipeline = [
            { $match: match },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $project: {
                    caption: 1,
                    media: {
                        $map: {
                            input: '$media',
                            as: 'm',
                            in: {
                                kind: '$$m.kind',
                                src: '$$m.src',
                                publicId: '$$m.publicId',
                                width: '$$m.width',
                                height: '$$m.height',
                                duration: '$$m.duration'
                            }
                        }
                    },
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        _id: '$author._id',
                        username: '$author.username',
                        profilePic: '$author.profilePic'
                    },
                    likesCount: { $size: { $ifNull: ['$likes', []] } },
                    commentsCount: { $size: { $ifNull: ['$comments', []] } },
                    isLiked: { $in: [viewerId, { $ifNull: ['$likes', []] }] }
                }
            }
        ];

        const items = await Post.aggregate(pipeline)
            .hint({ author: 1, createdAt: -1 })
            .allowDiskUse(true);

        const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;
        res.status(200).json({ items, nextCursor });
    } catch (err) {
        console.error('getFeed error', err);
        res.status(500).json({ message: 'server error' });
    }
};

export const getForYouFeed = async (req, res) => {
    try {
        const viewerId = new mongoose.Types.ObjectId(req.userId);
        
        const me = await User.findById(viewerId).select('following').lean();
        if (!me) return res.status(401).json({ message: 'unauthorized' });

        const limit = Math.min(parseInt(req.query.limit || '10', 10), 25);
        const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

        // First, let's see what posts exist in total
        const totalPosts = await Post.countDocuments();
        const postsFromOthers = await Post.countDocuments({
            author: { $nin: [viewerId, ...(me.following || [])] }
        });
        const postsNotLiked = await Post.countDocuments({
            author: { $nin: [viewerId, ...(me.following || [])] },
            likes: { $ne: viewerId }
        });

        console.log('Debug counts:');
        console.log('- Total posts in DB:', totalPosts);
        console.log('- Posts from non-followed users:', postsFromOthers);
        console.log('- Posts from non-followed users that you haven\'t liked:', postsNotLiked);

        // More lenient approach: if no posts from criteria above, show any posts you haven't liked
        let match;
        if (postsNotLiked === 0) {
            console.log('No posts from strict criteria, using lenient approach...');
            match = {
                author: { $ne: viewerId }, // Just exclude your own posts
                likes: { $ne: viewerId }   // And posts you've liked
            };
        } else {
            match = {
                author: { $nin: [viewerId, ...(me.following || [])] },
                likes: { $ne: viewerId }
            };
        }

        if (cursor) match.createdAt = { $lt: cursor };

        console.log('Using match criteria:', match);

        // Get user's interaction history to analyze interests
        const userInteractions = await Post.find({
            $or: [
                { likes: viewerId },
                { 'comments.user': viewerId }
            ]
        }).select('caption author').limit(50).lean();

        // Extract hashtags and keywords from user's liked/commented posts
        const userHashtags = new Set();
        const userKeywords = new Set();
        const interactedAuthors = new Set();

        userInteractions.forEach(post => {
            interactedAuthors.add(post.author.toString());
            
            if (post.caption) {
                // Extract hashtags
                const hashtags = post.caption.match(/#\w+/g) || [];
                hashtags.forEach(tag => userHashtags.add(tag.toLowerCase()));
                
                // Extract keywords (words longer than 3 chars, not hashtags/mentions/URLs)
                const words = post.caption.toLowerCase()
                    .split(/\s+/)
                    .filter(word => 
                        word.length > 3 && 
                        !word.startsWith('#') && 
                        !word.startsWith('@') &&
                        !/^https?:\/\//.test(word)
                    );
                words.forEach(word => userKeywords.add(word));
            }
        });

        const hashtagsArray = Array.from(userHashtags);
        const keywordsArray = Array.from(userKeywords);
        const authorsArray = Array.from(interactedAuthors);

        console.log('User interests found:');
        console.log('- Hashtags from liked posts:', hashtagsArray.slice(0, 10));
        console.log('- Keywords from liked posts:', keywordsArray.slice(0, 10));
        console.log('- Interacted authors count:', authorsArray.length);

        // Enhanced pipeline with interest-based scoring
        const pipeline = [
            { $match: match },
            {
                $addFields: {
                    // Extract hashtags from this post's caption
                    postHashtags: {
                        $map: {
                            input: {
                                $filter: {
                                    input: { $split: [{ $ifNull: ['$caption', ''] }, ' '] },
                                    cond: { $regexMatch: { input: '$$this', regex: '^#\\w+' } }
                                }
                            },
                            as: 'tag',
                            in: { $toLower: '$$tag' }
                        }
                    },
                    // Extract words from this post's caption
                    postWords: {
                        $filter: {
                            input: {
                                $map: {
                                    input: { $split: [{ $toLower: { $ifNull: ['$caption', ''] } }, ' '] },
                                    as: 'word',
                                    in: {
                                        $cond: {
                                            if: {
                                                $and: [
                                                    { $gt: [{ $strLenCP: '$$word' }, 3] },
                                                    { $not: { $regexMatch: { input: '$$word', regex: '^[#@]' } } },
                                                    { $not: { $regexMatch: { input: '$$word', regex: '^https?://' } } }
                                                ]
                                            },
                                            then: '$$word',
                                            else: null
                                        }
                                    }
                                }
                            },
                            cond: { $ne: ['$$this', null] }
                        }
                    },
                    // Basic engagement and recency
                    engagementScore: {
                        $add: [
                            { $size: { $ifNull: ['$likes', []] } },
                            { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] }
                        ]
                    },
                    daysSinceCreated: {
                        $divide: [
                            { $subtract: [new Date(), '$createdAt'] },
                            86400000
                        ]
                    }
                }
            },
            {
                $addFields: {
                    finalScore: {
                        $add: [
                            // 1. INTEREST-BASED SCORING (HIGHEST PRIORITY)
                            
                            // Hashtag similarity (0-20 points) - VERY HIGH IMPACT
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: ['$postHashtags', hashtagsArray]
                                        }
                                    },
                                    10 // Each matching hashtag = 10 points
                                ]
                            },
                            
                            // Keyword similarity (0-15 points) - HIGH IMPACT  
                            {
                                $multiply: [
                                    {
                                        $size: {
                                            $setIntersection: ['$postWords', keywordsArray]
                                        }
                                    },
                                    3 // Each matching keyword = 3 points
                                ]
                            },
                            
                            // Author similarity (0-15 points) - if you've interacted with this author before
                            {
                                $cond: {
                                    if: { 
                                        $in: [
                                            '$author', 
                                            authorsArray.map(id => new mongoose.Types.ObjectId(id))
                                        ] 
                                    },
                                    then: 15,
                                    else: 0
                                }
                            },

                            // 2. ENGAGEMENT SCORING (MEDIUM PRIORITY)
                            {
                                $multiply: ['$engagementScore', 0.3] // Reduced from 0.5
                            },

                            // 3. RECENCY BONUS (MEDIUM PRIORITY)
                            {
                                $max: [
                                    0,
                                    { $subtract: [8, '$daysSinceCreated'] } // Reduced from 10
                                ]
                            },

                            // 4. CONTENT QUALITY INDICATORS
                            {
                                $cond: {
                                    if: { $gt: [{ $strLenCP: { $ifNull: ['$caption', ''] } }, 20] },
                                    then: 2, // Bonus for posts with substantial captions
                                    else: 0
                                }
                            },

                            // 5. DIVERSITY (LOWEST PRIORITY)
                            { $multiply: [{ $rand: {} }, 3] } // Reduced randomness
                        ]
                    }
                }
            },
            { $sort: { finalScore: -1, createdAt: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $project: {
                    caption: 1,
                    media: {
                        $map: {
                            input: '$media',
                            as: 'm',
                            in: {
                                kind: '$$m.kind',
                                src: '$$m.src',
                                publicId: '$$m.publicId',
                                width: '$$m.width',
                                height: '$$m.height',
                                duration: '$$m.duration'
                            }
                        }
                    },
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        _id: '$author._id',
                        username: '$author.username',
                        profilePic: '$author.profilePic'
                    },
                    likesCount: { $size: { $ifNull: ['$likes', []] } },
                    commentsCount: { $size: { $ifNull: ['$comments', []] } },
                    isLiked: { $in: [viewerId, { $ifNull: ['$likes', []] }] },
                    finalScore: 1,
                    engagementScore: 1,
                    // Debug fields to see what matched
                    matchedHashtags: {
                        $setIntersection: ['$postHashtags', hashtagsArray]
                    },
                    matchedKeywords: {
                        $setIntersection: ['$postWords', keywordsArray]
                    }
                }
            }
        ];

        const items = await Post.aggregate(pipeline).allowDiskUse(true);
        
        console.log('ForYou results count:', items.length);
        if (items.length > 0) {
            console.log('Sample results:', items.slice(0, 3).map(item => ({
                id: item._id,
                author: item.author.username,
                finalScore: item.finalScore,
                engagementScore: item.engagementScore,
                likes: item.likesCount,
                comments: item.commentsCount,
                isLiked: item.isLiked,
                matchedHashtags: item.matchedHashtags,
                matchedKeywords: item.matchedKeywords
            })));
        }

        const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;
        res.status(200).json({ items, nextCursor });
    } catch (err) {
        console.error('getForYouFeed error', err);
        res.status(500).json({ message: 'server error' });
    }
};


export const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username profilePic')
            .populate('comments.user', 'username profilePic')
            .populate('comments.replies.user', 'username profilePic')
        if (!post) return res.status(404).json({ message: 'not found' })
        res.json(post)
    } catch (e) {
        console.error('getPost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const createPost = async (req, res) => {
    try {
        const { caption = '', media = [] } = req.body
        if (!Array.isArray(media) || media.length === 0) return res.status(400).json({ message: 'media required' })
        if (media.some(m => typeof m?.src !== 'string' || m.src.startsWith('data:'))) {
            return res.status(400).json({ message: 'base64 not allowed, upload to /upload/media first' })
        }
        const doc = await Post.create({ author: req.userId, caption, media })
        const populated = await Post.findById(doc._id).populate('author', 'username profilePic')
        res.status(201).json(populated)
    } catch (e) {
        console.error('createPost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const updatePost = async (req, res) => {
    try {
        const { caption, media, removedPublicIds = [] } = req.body
        const post = await Post.findById(req.params.id)
        if (!post) return res.status(404).json({ message: 'not found' })
        if (post.author.toString() !== req.userId) return res.status(403).json({ message: 'forbidden' })
        if (Array.isArray(media) && media.some(m => typeof m?.src !== 'string' || m.src.startsWith('data:'))) {
            return res.status(400).json({ message: 'base64 not allowed' })
        }
        if (typeof caption === 'string') post.caption = caption
        if (Array.isArray(media)) post.media = media
        await post.save()
        for (const pid of removedPublicIds) await safeDestroy(pid)
        const populated = await Post.findById(post._id).populate('author', 'username profilePic')
        res.json(populated)
    } catch (e) {
        console.error('updatePost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) return res.status(404).json({ message: 'not found' })
        if (post.author.toString() !== req.userId) return res.status(403).json({ message: 'forbidden' })
        const pids = (post.media || []).map(m => m.publicId).filter(Boolean)
        await post.deleteOne()
        for (const pid of pids) await safeDestroy(pid)
        res.json({ ok: true })
    } catch (e) {
        console.error('deletePost', e)
        res.status(500).json({ message: 'server error' })
    }
}

export const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'invalid user id' })
        }

        // cursor-paginated, stable sort
        const rawLimit = Number(req.query.limit) || 10
        const limit = Math.min(Math.max(rawLimit, 1), 30)
        const cursor = req.query.cursor || null

        const match = { author: new mongoose.Types.ObjectId(userId) }

        // support cursor in the form "<ISO>|<_id>" or just "<ISO>"
        if (cursor) {
            let createdAt, id
            if (cursor.includes('|')) {
                const [iso, hex] = cursor.split('|')
                const d = new Date(iso)
                if (!isNaN(d)) createdAt = d
                if (mongoose.Types.ObjectId.isValid(hex)) id = new mongoose.Types.ObjectId(hex)
            } else {
                const d = new Date(cursor)
                if (!isNaN(d)) createdAt = d
            }

            if (createdAt) {
                match.$or = [
                    { createdAt: { $lt: createdAt } },
                    { createdAt, _id: { $lt: id || new mongoose.Types.ObjectId('ffffffffffffffffffffffff') } }
                ]
            }
        }

        const items = await Post.aggregate([
            { $match: match },
            { $sort: { createdAt: -1, _id: -1 } },    // uses author_1_createdAt_-1 index for the scan
            { $limit: limit },
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
            { $unwind: '$author' },
            {
                $project: {
                    _id: 1,
                    caption: 1,
                    media: { kind: 1, src: 1, publicId: 1 },
                    createdAt: 1,
                    updatedAt: 1,
                    likesCount: { $size: { $ifNull: ['$likes', []] } },
                    commentsCount: { $size: { $ifNull: ['$comments', []] } },
                    author: { _id: '$author._id', username: '$author.username', profilePic: '$author.profilePic' }
                }
            }
        ])

        let nextCursor = null
        if (items.length === limit) {
            const last = items[items.length - 1]
            nextCursor = `${last.createdAt.toISOString()}|${last._id}`
        }

        res.json({ items, nextCursor })
    } catch (err) {
        console.error('getUserPosts', err)
        res.status(500).json({ message: err.message || 'server error' })
    }
}

export const likePost = async (req, res) => {
    const { id } = req.params
    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const index = post.likes.indexOf(req.userId)
        if (index === -1) {
            post.likes.push(req.userId)
        } else {
            post.likes.splice(index, 1)
        }
        await post.save()
        res.status(200).json(post)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export const getComments = async (req, res) => {
    const { id } = req.params
    try {
        const post = await Post.findById(id)
            .populate('comments.user', 'username profilePic')
            .populate('comments.replies.user', 'username profilePic')
        if (!post) return res.status(404).json({ message: 'Post not found' })
        res.status(200).json(post.comments)
    } catch (err) {
        console.error('Error fetching comments:', err)
        res.status(500).json({ message: 'Server error' })
    }
}


export const addComment = async (req, res) => {
    const { id } = req.params
    const { text, parentId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!text || text.trim() === '') return res.status(400).json({ message: 'No Comment is Inputted' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        // create either a top-level comment or a reply
        if (parentId) {
            const parent = post.comments.id(parentId)
            if (!parent) return res.status(404).json({ message: 'Parent comment not found' })

            parent.replies.push({ user: req.userId, text: text.trim() })
            // capture the new reply id before requery
            const newReplyId = parent.replies[parent.replies.length - 1]._id
            await post.save()

            // requery and populate from the parent doc, then pick the one we just added
            const populated = await Post.findById(post._id)
                .select('comments')
                .populate([
                    { path: 'comments.user', select: 'username profilePic' },
                    { path: 'comments.replies.user', select: 'username profilePic' }
                ])

            const parentPop = populated.comments.id(parentId)
            const replyPop = parentPop?.replies.id(newReplyId)
            return res.status(201).json({ kind: 'reply', parentId, reply: replyPop })
        } else {
            post.comments.push({ user: req.userId, text: text.trim() })
            const newCommentId = post.comments[post.comments.length - 1]._id
            await post.save()

            const populated = await Post.findById(post._id)
                .select('comments')
                .populate({ path: 'comments.user', select: 'username profilePic' })

            const commentPop = populated.comments.id(newCommentId)
            return res.status(201).json({ kind: 'comment', comment: commentPop })
        }
    } catch (err) {
        console.error('Error adding comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const likeComment = async (req, res) => {
    const { id, commentId } = req.params
    const { replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const targetComment = post.comments.id(commentId)
        if (!targetComment) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const reply = targetComment.replies.id(replyId)
            if (!reply) return res.status(404).json({ message: 'Reply not found' })
            const idx = reply.likes.findIndex(u => u.toString() === req.userId)
            if (idx === -1) reply.likes.push(req.userId)
            else reply.likes.splice(idx, 1)
        } else {
            const idx = targetComment.likes.findIndex(u => u.toString() === req.userId)
            if (idx === -1) targetComment.likes.push(req.userId)
            else targetComment.likes.splice(idx, 1)
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error liking comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const editComment = async (req, res) => {
    const { id, commentId } = req.params
    const { text, replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!text || text.trim() === '') return res.status(400).json({ message: 'No text provided' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const c = post.comments.id(commentId)
        if (!c) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const r = c.replies.id(replyId)
            if (!r) return res.status(404).json({ message: 'Reply not found' })
            if (r.user.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' })
            r.text = text.trim()
            r.editedAt = new Date()
        } else {
            if (c.user.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' })
            c.text = text.trim()
            c.editedAt = new Date()
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error editing comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

export const deleteComment = async (req, res) => {
    const { id, commentId } = req.params
    const { replyId } = req.body
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
        const post = await Post.findById(id)
        if (!post) return res.status(404).json({ message: 'Post not found' })

        const c = post.comments.id(commentId)
        if (!c) return res.status(404).json({ message: 'Comment not found' })

        if (replyId) {
            const r = c.replies.id(replyId)
            if (!r) return res.status(404).json({ message: 'Reply not found' })
            if (r.user.toString() !== req.userId && post.author.toString() !== req.userId) {
                return res.status(403).json({ message: 'Forbidden' })
            }
            r.deleteOne()
        } else {
            if (c.user.toString() !== req.userId && post.author.toString() !== req.userId) {
                return res.status(403).json({ message: 'Forbidden' })
            }
            c.deleteOne()
        }

        await post.save()
        res.status(200).json({ ok: true })
    } catch (err) {
        console.error('Error deleting comment:', err)
        res.status(500).json({ message: 'Server error' })
    }
}
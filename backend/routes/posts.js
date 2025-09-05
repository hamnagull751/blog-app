const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Post Schema
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  coverImage: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty values
        // Basic URL validation
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Cover image must be a valid image URL (jpg, jpeg, png, gif, webp)'
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each tag cannot exceed 50 characters']
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

postSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Create indexes for better performance
postSchema.index({ createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' });

// Check if model already exists to avoid OverwriteModelError
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

// GET /api/posts - Get all posts with optional query parameters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tag } = req.query;
    const query = {};
    
    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Add tag filtering
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    const options = {
      sort: { createdAt: -1 },
      limit: Math.min(parseInt(limit), 50), // Cap at 50 posts per request
      skip: (parseInt(page) - 1) * parseInt(limit)
    };
    
    const posts = await Post.find(query, null, options);
    const total = await Post.countDocuments(query);
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/:id - Get single post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/posts - Create new post
router.post('/', async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, tags } = req.body;
    
    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    if (title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long' });
    }
    
    if (content.trim().length < 10) {
      return res.status(400).json({ error: 'Content must be at least 10 characters long' });
    }
    
    // Process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.map(tag => tag.trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }
    
    // Create new post
    const post = new Post({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt ? excerpt.trim() : undefined,
      coverImage: coverImage ? coverImage.trim() : undefined,
      tags: processedTags
    });
    
    const savedPost = await post.save();
    console.log('New post created:', savedPost._id);
    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, coverImage, tags } = req.body;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID format' });
    }
    
    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    if (title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long' });
    }
    
    if (content.trim().length < 10) {
      return res.status(400).json({ error: 'Content must be at least 10 characters long' });
    }
    
    // Process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags.map(tag => tag.trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }
    
    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt ? excerpt.trim() : undefined,
        coverImage: coverImage ? coverImage.trim() : undefined,
        tags: processedTags,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Post updated:', updatedPost._id);
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    const deletedPost = await Post.findByIdAndDelete(id);
    
    if (!deletedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully', deletedPost });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
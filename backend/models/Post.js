const mongoose = require('mongoose');
const slugify = require('slugify');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: String,
  tags: [String],
  coverImage: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// generate unique slug (append counter when needed)
PostSchema.pre('validate', async function (next) {
  if (this.title && (!this.slug || this.isModified('title'))) {
    const base = slugify(this.title, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${counter++}`;
    }
    this.slug = slug;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Post', PostSchema);

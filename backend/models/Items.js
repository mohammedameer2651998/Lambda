const mongoose = require('mongoose');

/**
 * ============================================
 * ITEM (DOCUMENT) SCHEMA
 * ============================================
 * 
 * Schema vs Model:
 * - Schema: Blueprint/structure definition
 * - Model: Constructor compiled from schema (used to create/query documents)
 * 
 * Relationships (Day 11):
 * - Belongs to one Category (Many-to-One)
 * - Created by one User (Many-to-One)
 * 
 * Visual:
 * ┌──────────┐       ┌──────────┐
 * │ Category │──────<│   Item   │
 * └──────────┘ 1   N └──────────┘
 *                          │
 *                          │ N
 *                          ▼
 *                    ┌──────────┐
 *                    │   User   │
 *                    └──────────┘ 1
 */
const itemSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // BASIC FIELDS
    // ─────────────────────────────────────────
    
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
      minlength: [1, 'Name cannot be empty'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    // ─────────────────────────────────────────
    // RELATIONSHIPS (Day 11)
    // ─────────────────────────────────────────
    
    /**
     * Reference to Category
     * 
     * What is ObjectId?
     * - MongoDB's unique identifier for documents
     * - 12 bytes: timestamp + machine id + process id + counter
     * - Example: "507f1f77bcf86cd799439011"
     * 
     * What is 'ref'?
     * - Tells Mongoose which model to use when populating
     * - Enables .populate('category') to fetch the full category document
     */
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',  // Must match the model name exactly
      required: [true, 'Category is required'],
      index: true,      // Index for faster queries by category
    },

    /**
     * Reference to User who created this document
     * 
     * Why track createdBy?
     * - Ownership: Know who created what
     * - Permissions: Can limit edit access to owner
     * - Audit: Track document history
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },

    /**
     * Last modifier (optional but useful for audit)
     */
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─────────────────────────────────────────
    // S3 FILE UPLOADS (Day 6)
    // ─────────────────────────────────────────
    
    files: [
      {
        filename: String,
        s3Key: String,
        s3Url: String,
        size: Number,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ─────────────────────────────────────────
    // STATUS & METADATA
    // ─────────────────────────────────────────
    
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },

    /**
     * Tags for flexible categorization
     * Unlike category (single), tags allow multiple labels
     */
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  {
    // ─────────────────────────────────────────
    // SCHEMA OPTIONS
    // ─────────────────────────────────────────
    
    timestamps: true,  // Automatically adds createdAt and updatedAt
    
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────
// Compound indexes for common query patterns

itemSchema.index({ name: 'text', description: 'text' });  // Full-text search
itemSchema.index({ createdAt: -1 });                       // Sort by newest
itemSchema.index({ category: 1, status: 1 });              // Filter by category and status
itemSchema.index({ createdBy: 1, createdAt: -1 });         // User's documents by date
itemSchema.index({ tags: 1 });                             // Query by tags

// ─────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────

/**
 * Get a summary string for this document
 */
itemSchema.methods.getSummary = function () {
  return `${this.name} (${this.files.length} files)`;
};

/**
 * Check if a user can edit this document
 */
itemSchema.methods.canEdit = function (userId) {
  return this.createdBy.toString() === userId.toString();
};

// ─────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────

/**
 * Find documents by status
 */
itemSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate('category', 'name color')  // Only get name and color
    .populate('createdBy', 'name email'); // Only get name and email
};

/**
 * Find documents by category
 */
itemSchema.statics.findByCategory = function (categoryId) {
  return this.find({ category: categoryId, status: 'active' })
    .populate('category', 'name color')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Find documents created by a user
 */
itemSchema.statics.findByUser = function (userId) {
  return this.find({ createdBy: userId, status: { $ne: 'deleted' } })
    .populate('category', 'name color')
    .sort({ createdAt: -1 });
};

/**
 * Get document counts by category
 * Returns: [{ _id: categoryId, count: 5 }, ...]
 */
itemSchema.statics.countByCategory = function () {
  return this.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
};

// Compile schema into Model
const Item = mongoose.model('Item', itemSchema);

module.exports = { Item };
const mongoose = require('mongoose');

/**
 * ============================================
 * CATEGORY SCHEMA
 * ============================================
 * 
 * Purpose: Organize documents into logical groups
 * 
 * Relationship: One-to-Many with Documents
 * - One category can have many documents
 * - One document belongs to one category
 * 
 * Example categories: Contracts, Reports, Invoices
 */
const categorySchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // BASIC FIELDS
    // ─────────────────────────────────────────
    
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,  // No duplicate category names
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },

    // ─────────────────────────────────────────
    // UI CUSTOMIZATION
    // ─────────────────────────────────────────
    
    color: {
      type: String,
      default: '#6B7280',  // Gray as default
      // Store hex colors for flexibility in UI
      // Examples: #EF4444 (red), #3B82F6 (blue), #10B981 (green)
    },

    icon: {
      type: String,
      default: 'document',  // Icon name for UI (optional)
    },

    // ─────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────
    
    isActive: {
      type: Boolean,
      default: true,
      // Allows "soft delete" - hide category without removing it
    },
  },
  {
    // ─────────────────────────────────────────
    // SCHEMA OPTIONS
    // ─────────────────────────────────────────
    
    timestamps: true,  // Adds createdAt and updatedAt automatically
    
    toJSON: {
      // Transform _id to id when converting to JSON
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────
// Note: 'name' has unique: true which auto-creates an index
// Add additional indexes for common query patterns

categorySchema.index({ isActive: 1 });  // Quick filter for active categories

// ─────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────
// These are called on the Model itself: Category.findActive()

/**
 * Find all active categories
 * Usage: const categories = await Category.findActive();
 */
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Compile schema into Model
const Category = mongoose.model('Category', categorySchema);

module.exports = { Category };

const mongoose = require('mongoose');

/**
 * ============================================
 * USER SCHEMA
 * ============================================
 * 
 * Purpose: Track document ownership and actions
 * 
 * NOTE: This is a "placeholder" User model.
 * In Day 12, we'll integrate Okta for real authentication.
 * For now, this lets us:
 * - Design the data relationships
 * - Test document ownership
 * - Build the API structure
 * 
 * Relationships:
 * - User creates many Documents (One-to-Many)
 * - User can be assigned many Documents (Many-to-Many, future)
 */
const userSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // IDENTITY FIELDS
    // ─────────────────────────────────────────
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,  // Normalize: "John@Email.com" → "john@email.com"
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        'Please provide a valid email address',
      ],
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    // ─────────────────────────────────────────
    // AUTHORIZATION
    // ─────────────────────────────────────────
    
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'user'],
        message: 'Role must be admin, manager, or user',
      },
      default: 'user',
    },

    /**
     * Role Permissions (for future implementation):
     * 
     * admin   - Full access to all documents and settings
     * manager - Can manage documents and view reports
     * user    - Can create/edit own documents only
     */

    // ─────────────────────────────────────────
    // EXTERNAL IDENTITY (for future Okta)
    // ─────────────────────────────────────────
    
    externalId: {
      type: String,
      sparse: true,  // Allow null but enforce uniqueness when set
      // Will store Okta user ID in Day 12
    },

    // ─────────────────────────────────────────
    // PREFERENCES
    // ─────────────────────────────────────────
    
    preferences: {
      defaultCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',  // Reference to Category model
        default: null,
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },

    // ─────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────
    
    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // Never expose sensitive fields in JSON
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────
// Note: 'email' has unique: true which auto-creates an index

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ─────────────────────────────────────────────────
// VIRTUAL PROPERTIES
// ─────────────────────────────────────────────────
// Computed fields that don't get stored in the database

/**
 * Get user's first name
 * Usage: user.firstName → "John" (from "John Doe")
 */
userSchema.virtual('firstName').get(function() {
  return this.name.split(' ')[0];
});

// ─────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────
// These are called on a document instance: user.updateLoginTime()

/**
 * Update the last login timestamp
 */
userSchema.methods.updateLoginTime = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// ─────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────

/**
 * Find active users by role
 * Usage: const admins = await User.findByRole('admin');
 */
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true }).sort({ name: 1 });
};

/**
 * Find or create user by email (useful for SSO)
 */
userSchema.statics.findOrCreate = async function(email, userData = {}) {
  let user = await this.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    user = await this.create({
      email,
      name: userData.name || email.split('@')[0],
      role: userData.role || 'user',
      externalId: userData.externalId || null,
    });
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = { User };

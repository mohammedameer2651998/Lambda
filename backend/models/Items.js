const mongoose = require('mongoose');

/**
 * Item Schema - Defines the structure of an Item document
 * 
 * Schema vs Model:
 * - Schema: Blueprint/structure definition
 * - Model: Constructor compiled from schema (used to create/query documents)
 */
const itemSchema = new mongoose.Schema(
  {
    // Field definitions with validation
    name: {
      type: String,
      required: [true, 'Item name is required'],  // Custom error message
      trim: true,                                  // Remove whitespace
      minlength: [1, 'Name cannot be empty'],
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      default: '',  // Optional field with default
    },

    // For S3 file uploads (Day 6)
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

    // Metadata
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],  // Only these values allowed
      default: 'active',
    },
  },
  {
    // Schema options
    timestamps: true,  // Automatically adds createdAt and updatedAt fields
    
    // Transform output when converting to JSON
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;  // Add 'id' field (frontend friendly)
        delete ret.__v;     // Remove version key
        return ret;
      },
    },
  }
);

// Create index for faster queries (important for large datasets)
itemSchema.index({ name: 'text' });  // Text search on name
itemSchema.index({ createdAt: -1 }); // Sort by newest first

/**
 * Instance method - Available on document instances
 * Example: const item = new Item(); item.getSummary();
 */
itemSchema.methods.getSummary = function () {
  return `${this.name} (${this.files.length} files)`;
};

/**
 * Static method - Available on the Model itself
 * Example: Item.findByStatus('active')
 */
itemSchema.statics.findByStatus = function (status) {
  return this.find({ status });
};

// Compile schema into Model
const Item = mongoose.model('Item', itemSchema);

// Export the model
module.exports = { Item };
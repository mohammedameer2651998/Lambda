// Load environment variables FIRST (before anything else)
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import database connection and model
const { connectDB } = require('./config/database');
const { Item } = require('./models/Items');

// Import file upload middleware and S3 service
const { upload } = require('./middleware/upload');
const { uploadFile, getPresignedUrl, deleteFile } = require('./services/s3Service');

const app = express();
const port = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB Atlas'
  });
});

// Test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from MongoDB-powered API!' });
});

// ============================================
// CRUD OPERATIONS FOR ITEMS
// ============================================

/**
 * GET /api/items
 * Fetch all items from MongoDB
 * Query params: ?status=active, ?search=keyword
 */
app.get('/api/items', async (req, res) => {
  try {
    const { status, search } = req.query;
    
    // Build query object
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }

    // Find items, sort by newest first
    const items = await Item.find(query).sort({ createdAt: -1 });
    
    res.json({ 
      items,
      count: items.length 
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * GET /api/items/:id
 * Fetch single item by ID
 */
app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Mongoose uses ObjectId, validate format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

/**
 * POST /api/items
 * Create a new item
 */
app.post('/api/items', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation (Mongoose also validates, but good to check early)
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Invalid "name" provided' });
    }

    // Create new item using Mongoose model
    const newItem = new Item({
      name: name.trim(),
      description: description?.trim() || '',
    });

    // Save to MongoDB
    const savedItem = await newItem.save();
    
    console.log('Item created:', savedItem.id);
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Error creating item:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Failed to create item' });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item
 */
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    // Find and update, return the new document
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { 
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(status && { status })
      },
      { new: true, runValidators: true } // Return updated doc, run schema validators
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/items/:id
 * Delete an item (soft delete - set status to 'deleted')
 */
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    // Soft delete - just mark as deleted
    const deletedItem = await Item.findByIdAndUpdate(
      id,
      { status: 'deleted' },
      { new: true }
    );

    // Or hard delete:
    // const deletedItem = await Item.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', item: deletedItem });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================
// FILE UPLOAD ROUTES (S3)
// ============================================

/**
 * POST /api/items/:id/files
 * Upload a file and attach it to an item
 */
app.post('/api/items/:id/files', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Find the item
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Generate unique S3 key: items/{itemId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const s3Key = `items/${id}/${timestamp}-${req.file.originalname}`;

    // Upload to S3
    const uploadResult = await uploadFile(
      req.file.buffer,
      s3Key,
      req.file.mimetype
    );

    // Add file info to item's files array
    const fileData = {
      filename: req.file.originalname,
      s3Key: uploadResult.key,
      s3Url: uploadResult.url,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    };

    item.files.push(fileData);
    await item.save();

    console.log(`📁 File uploaded for item ${id}: ${req.file.originalname}`);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileData,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * GET /api/items/:id/files
 * Get all files for an item (with presigned URLs)
 */
app.get('/api/items/:id/files', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      item.files.map(async (file) => {
        const presignedUrl = await getPresignedUrl(file.s3Key);
        return {
          ...file.toObject(),
          downloadUrl: presignedUrl,
        };
      })
    );

    res.json({ files: filesWithUrls });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * GET /api/items/:id/files/:fileId
 * Get a single file's presigned URL for download
 */
app.get('/api/items/:id/files/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/) || !fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Find the file in the item's files array
    const file = item.files.find(f => f._id.toString() === fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate presigned URL
    const presignedUrl = await getPresignedUrl(file.s3Key);

    res.json({ 
      url: presignedUrl,
      filename: file.filename,
      mimeType: file.mimeType
    });
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({ error: 'Failed to get file URL' });
  }
});

/**
 * DELETE /api/items/:id/files/:fileId
 * Delete a file from S3 and remove from item
 */
app.delete('/api/items/:id/files/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/) || !fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Find the file in the item's files array
    const fileIndex = item.files.findIndex(f => f._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = item.files[fileIndex];

    // Delete from S3
    await deleteFile(file.s3Key);

    // Remove from item's files array
    item.files.splice(fileIndex, 1);
    await item.save();

    console.log(`🗑️ File deleted for item ${id}: ${file.filename}`);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler - Route not found
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
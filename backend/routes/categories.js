const express = require('express');
const router = express.Router();
const { Category } = require('../models/Category');

/**
 * ============================================
 * CATEGORY ROUTES
 * ============================================
 * 
 * REST API Pattern:
 * 
 * GET    /api/categories      → List all categories
 * GET    /api/categories/:id  → Get one category
 * POST   /api/categories      → Create category
 * PUT    /api/categories/:id  → Update category
 * DELETE /api/categories/:id  → Delete category (soft delete)
 */

// ─────────────────────────────────────────────────
// GET /api/categories - List all categories
// ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Query parameter: ?active=true (optional filter)
    const filter = {};
    if (req.query.active === 'true') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// GET /api/categories/:id - Get single category
// ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
      });
    }

    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// POST /api/categories - Create new category
// ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check for duplicate name
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }  // Case-insensitive
    });

    if (existing) {
      return res.status(409).json({  // 409 Conflict
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6B7280',
      icon: icon || 'document',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('Error creating category:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// PUT /api/categories/:id - Update category
// ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    // Build update object (only include provided fields)
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (isActive !== undefined) updates.isActive = isActive;

    // Check for duplicate name (if name is being changed)
    if (updates.name) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
        _id: { $ne: req.params.id },  // Exclude current category
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A category with this name already exists',
        });
      }
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updates,
      { 
        new: true,           // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
      });
    }

    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// DELETE /api/categories/:id - Soft delete category
// ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    /**
     * Soft Delete vs Hard Delete:
     * 
     * Soft Delete (what we do):
     * - Set isActive = false
     * - Data preserved for audit/recovery
     * - Documents still reference valid category
     * 
     * Hard Delete:
     * - Actually removes from database
     * - Could leave orphaned references
     * - No recovery possible
     */

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      message: 'Category deactivated successfully',
      data: category,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format',
      });
    }

    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// POST /api/categories/seed - Seed default categories
// ─────────────────────────────────────────────────
router.post('/seed', async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'Contracts', description: 'Legal agreements and contracts', color: '#EF4444', icon: 'document-text' },
      { name: 'Reports', description: 'Business and financial reports', color: '#3B82F6', icon: 'chart-bar' },
      { name: 'Invoices', description: 'Billing and invoice documents', color: '#10B981', icon: 'currency-dollar' },
      { name: 'Proposals', description: 'Project and business proposals', color: '#8B5CF6', icon: 'light-bulb' },
      { name: 'Internal', description: 'Internal company documents', color: '#F59E0B', icon: 'office-building' },
      { name: 'Other', description: 'Miscellaneous documents', color: '#6B7280', icon: 'document' },
    ];

    const results = {
      created: [],
      skipped: [],
    };

    for (const cat of defaultCategories) {
      const existing = await Category.findOne({ name: cat.name });
      if (existing) {
        results.skipped.push(cat.name);
      } else {
        await Category.create(cat);
        results.created.push(cat.name);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Seed complete',
      data: results,
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed categories',
      error: error.message,
    });
  }
});

module.exports = router;

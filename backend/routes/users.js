const express = require('express');
const router = express.Router();
const { User } = require('../models/User');

/**
 * ============================================
 * USER ROUTES
 * ============================================
 * 
 * NOTE: This is a temporary user management API.
 * In Day 12 (Okta integration), users will be created
 * automatically during authentication.
 * 
 * For now, this lets us:
 * - Create test users
 * - Assign users to documents
 * - Test the relationship structure
 * 
 * REST Endpoints:
 * GET    /api/users      → List all users
 * GET    /api/users/:id  → Get one user
 * POST   /api/users      → Create user
 * PUT    /api/users/:id  → Update user
 * DELETE /api/users/:id  → Deactivate user
 */

// ─────────────────────────────────────────────────
// GET /api/users - List all users
// ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    // Optional filters
    if (req.query.active === 'true') {
      filter.isActive = true;
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter)
      .select('-__v')  // Exclude version field
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// GET /api/users/:id - Get single user
// ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('preferences.defaultCategory', 'name color');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// POST /api/users - Create new user
// ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { email, name, role } = req.body;

    // Validation
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Check for duplicate email
    const existing = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const user = await User.create({
      email: email.trim(),
      name: name.trim(),
      role: role || 'user',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error creating user:', error);

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
      message: 'Failed to create user',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// PUT /api/users/:id - Update user
// ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, role, preferences, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (preferences !== undefined) updates.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// DELETE /api/users/:id - Soft delete user
// ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────
// POST /api/users/seed - Seed test users
// ─────────────────────────────────────────────────
router.post('/seed', async (req, res) => {
  try {
    const testUsers = [
      { email: 'admin@example.com', name: 'Admin User', role: 'admin' },
      { email: 'manager@example.com', name: 'Manager User', role: 'manager' },
      { email: 'user@example.com', name: 'Regular User', role: 'user' },
    ];

    const results = {
      created: [],
      skipped: [],
    };

    for (const userData of testUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        results.skipped.push(userData.email);
      } else {
        await User.create(userData);
        results.created.push(userData.email);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Seed complete',
      data: results,
    });
  } catch (error) {
    console.error('Error seeding users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed users',
      error: error.message,
    });
  }
});

module.exports = router;

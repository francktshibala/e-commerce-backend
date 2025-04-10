const User = require('../models/user.model');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Get all users
 * @route GET /api/users
 * @access Admin only
 */
const getUsers = async (req, res, next) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      search
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Text search
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const users = await User.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .select('-password');
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / Number(limit)),
      currentPage: Number(page),
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Admin or Own User
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 * @route POST /api/users
 * @access Admin only
 */
const createUser = async (req, res, next) => {
  try {
    const {
      email,
      firstName,
      lastName,
      password,
      role,
      addresses,
      phone,
      isActive
    } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }
    
    // Create user
    const user = new User({
      email,
      firstName,
      lastName,
      password,
      role: role || 'customer',
      addresses: addresses || [],
      phone,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await user.save();
    
    // Don't return password in response
    user.password = undefined;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Admin or Own User
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check for email uniqueness if changing email
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        throw new ApiError(400, 'Email is already in use');
      }
    }
    
    // Don't allow direct role changes for security (separate endpoint for admin)
    if (updates.role && req.user.role !== 'admin') {
      delete updates.role;
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Admin or Own User
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Delete user
    await user.remove();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    // User is already available from auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/profile
 * @access Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Don't allow role changes from this endpoint
    if (updates.role) {
      delete updates.role;
    }
    
    // Check for email uniqueness if changing email
    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user.id }
      });
      
      if (existingUser) {
        throw new ApiError(400, 'Email is already in use');
      }
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add address to user
 * @route POST /api/users/:id/addresses
 * @access Private
 */
const addUserAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addressData = req.body;
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // If this is the first address or setting as default
    if (user.addresses.length === 0 || addressData.isDefault) {
      // Set all existing addresses of the same type to non-default
      if (addressData.isDefault) {
        user.addresses.forEach(address => {
          if (address.type === addressData.type) {
            address.isDefault = false;
          }
        });
      }
      // First address is automatically default
      addressData.isDefault = true;
    }
    
    // Add address to user
    user.addresses.push(addressData);
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove address from user
 * @route DELETE /api/users/:userId/addresses/:addressId
 * @access Private
 */
const removeUserAddress = async (req, res, next) => {
  try {
    const { userId, addressId } = req.params;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Find address index
    const addressIndex = user.addresses.findIndex(
      address => address._id.toString() === addressId
    );
    
    if (addressIndex === -1) {
      throw new ApiError(404, 'Address not found');
    }
    
    // Check if we're removing a default address
    const removedAddress = user.addresses[addressIndex];
    
    // Remove address
    user.addresses.splice(addressIndex, 1);
    
    // If we removed a default address and we have other addresses of the same type,
    // set the first one as default
    if (removedAddress.isDefault && user.addresses.length > 0) {
      const sameTypeAddress = user.addresses.find(
        address => address.type === removedAddress.type
      );
      
      if (sameTypeAddress) {
        sameTypeAddress.isDefault = true;
      }
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  removeUserAddress
};
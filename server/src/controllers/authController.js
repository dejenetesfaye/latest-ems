const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @route POST /api/auth/login
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId,
        token: generateToken(user._id, user.role),
      });
    }
    res.status(401).json({ message: 'Invalid username or password' });
  } catch (err) {
    console.error('Login error detail:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
  }
};

// @route POST /api/auth/register — used by systemadmin & superadmin
const registerUser = async (req, res) => {
  const { name, username, password, role } = req.body;
  const caller = req.user;

  // Role creation rules
  const allowed = {
    systemadmin: ['superadmin'],
    superadmin: ['manager', 'supervisor', 'client'],
  };

  if (!allowed[caller.role] || !allowed[caller.role].includes(role)) {
    return res.status(403).json({
      message: `Your role (${caller.role}) cannot create a user with role (${role})`,
    });
  }

  try {
    if (await User.findOne({ username }))
      return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    // Determine which org this user belongs to
    const organizationId =
      caller.role === 'superadmin' ? caller.id : null;

    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      role,
      organizationId,
      createdBy: caller.id,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { loginUser, registerUser };

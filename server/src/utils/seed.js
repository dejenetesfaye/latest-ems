const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

const hash = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // 1. System Admin
    let sysAdmin = await User.findOne({ username: 'sysadmin' });
    if (!sysAdmin) {
      sysAdmin = await User.create({
        name: 'System Admin',
        username: 'sysadmin',
        password: await hash('sys123'),
        role: 'systemadmin',
      });
      console.log('✅ systemadmin  → username: sysadmin    | password: sys123');
    } else {
      console.log('⚠️  systemadmin already exists, skipping.');
    }

    // 2. Super Admin (belongs to no org — IS the org)
    let superAdmin = await User.findOne({ username: 'admin' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Abebe Events',
        username: 'admin',
        password: await hash('admin123'),
        role: 'superadmin',
        createdBy: sysAdmin._id,
      });
      console.log('✅ superadmin   → username: admin        | password: admin123');
    } else {
      // update createdBy if missing
      if (!superAdmin.createdBy) {
        superAdmin.createdBy = sysAdmin._id;
        await superAdmin.save();
      }
      console.log('⚠️  superadmin already exists, skipping.');
    }

    // 3. Manager
    let manager = await User.findOne({ username: 'manager1' });
    if (!manager) {
      manager = await User.create({
        name: 'John Manager',
        username: 'manager1',
        password: await hash('manager123'),
        role: 'manager',
        organizationId: superAdmin._id,
        createdBy: superAdmin._id,
      });
      console.log('✅ manager      → username: manager1     | password: manager123');
    } else { console.log('⚠️  manager1 already exists, skipping.'); }

    // 4. Supervisor
    let supervisor = await User.findOne({ username: 'supervisor1' });
    if (!supervisor) {
      supervisor = await User.create({
        name: 'Tom Supervisor',
        username: 'supervisor1',
        password: await hash('super123'),
        role: 'supervisor',
        organizationId: superAdmin._id,
        createdBy: superAdmin._id,
      });
      console.log('✅ supervisor   → username: supervisor1  | password: super123');
    } else { console.log('⚠️  supervisor1 already exists, skipping.'); }

    // 5. Client
    let client = await User.findOne({ username: 'client1' });
    if (!client) {
      client = await User.create({
        name: 'Sara Client',
        username: 'client1',
        password: await hash('client123'),
        role: 'client',
        organizationId: superAdmin._id,
        createdBy: superAdmin._id,
      });
      console.log('✅ client       → username: client1      | password: client123');
    } else { console.log('⚠️  client1 already exists, skipping.'); }

    // Migrate old bride1 if exists
    const oldBride = await User.findOne({ username: 'bride1' });
    if (oldBride) {
      oldBride.role = 'client';
      oldBride.organizationId = superAdmin._id;
      await oldBride.save();
      console.log('🔄 Migrated bride1 → client role');
    }

    console.log('\n========= All accounts ready =========');
    console.log('sysadmin    → sysadmin   / sys123');
    console.log('superadmin  → admin      / admin123');
    console.log('manager     → manager1   / manager123');
    console.log('supervisor  → supervisor1/ super123');
    console.log('client      → client1    / client123');
    process.exit();
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedAll();

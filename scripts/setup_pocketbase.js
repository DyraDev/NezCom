import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
  console.log('Connecting to PocketBase...');
  try {
    await pb.admins.authWithPassword('admin@nezcom.local', 'Admin123456!');
    console.log('Superuser authenticated!');
  } catch (err) {
    console.error('Failed to auth as superuser:', err.message);
    process.exit(1);
  }

  async function setupCollection(collectionData) {
    try {
      const existing = await pb.collections.getOne(collectionData.name).catch(() => null);
      if (existing) {
        console.log(`Collection "${collectionData.name}" exists, updating...`);
        return await pb.collections.update(existing.id, collectionData);
      } else {
        console.log(`Creating collection "${collectionData.name}"...`);
        return await pb.collections.create(collectionData);
      }
    } catch (err) {
      console.error(`Error configuring collection ${collectionData.name}:`, err.response?.data || err.message);
    }
  }

  // 1. Update users collection schema
  console.log('Updating "users" collection...');
  try {
    const usersColl = await pb.collections.getOne('users');
    const customFields = [
      { name: 'username', type: 'text', required: false },
      { name: 'name', type: 'text', required: false },
      {
        name: 'role',
        type: 'select',
        required: true,
        values: ['superadmin', 'teacher', 'student'],
        maxSelect: 1
      },
      { name: 'class_name', type: 'text', required: false },
      { name: 'can_broadcast', type: 'bool', required: false },
      { name: 'typing_to', type: 'text', required: false }
    ];

    const existingFieldNames = usersColl.fields ? usersColl.fields.map(f => f.name) : [];
    const fieldsToUpdate = [...(usersColl.fields || [])];

    for (const f of customFields) {
      if (!existingFieldNames.includes(f.name)) {
        fieldsToUpdate.push(f);
      }
    }

    usersColl.fields = fieldsToUpdate;
    usersColl.listRule = '@request.auth.id != ""';
    usersColl.viewRule = '@request.auth.id != ""';
    usersColl.updateRule = '@request.auth.id = id || @request.auth.role = "superadmin"';
    const existingIndexes = usersColl.indexes || [];
    if (!existingIndexes.some(idx => idx.includes('username'))) {
      usersColl.indexes = [...existingIndexes, "CREATE UNIQUE INDEX `idx_username_users` ON `users` (`username`) WHERE `username` != ''"];
    }

    usersColl.passwordAuth = {
      enabled: true,
      identityFields: ['username', 'email']
    };
    
    await pb.collections.update('users', usersColl);
    console.log('Users collection updated successfully with typing_to field!');
  } catch (err) {
    console.error('Error updating users collection:', err.response?.data || err.message);
  }

  const usersColl = await pb.collections.getOne('users');

  // 2. Setup "groups" collection
  const groupsColl = await setupCollection({
    name: 'groups',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "superadmin" || @request.auth.role = "teacher"',
    updateRule: '@request.auth.role = "superadmin" || created_by = @request.auth.id',
    deleteRule: '@request.auth.role = "superadmin" || created_by = @request.auth.id',
    fields: [
      { name: 'name', type: 'text', required: true },
      {
        name: 'type',
        type: 'select',
        required: true,
        values: ['class', 'custom', 'broadcast'],
        maxSelect: 1
      },
      { name: 'class_name_ref', type: 'text', required: false },
      {
        name: 'created_by',
        type: 'relation',
        required: false,
        collectionId: usersColl.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      { name: 'avatar', type: 'file', maxSelect: 1 }
    ]
  });

  // 3. Setup "group_members" collection
  const groupMembersColl = await setupCollection({
    name: 'group_members',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "superadmin" || @request.auth.role = "teacher" || user = @request.auth.id',
    updateRule: '@request.auth.id = user || @request.auth.role = "superadmin" || @request.auth.role = "teacher"',
    deleteRule: '@request.auth.role = "superadmin" || @request.auth.role = "teacher" || user = @request.auth.id',
    fields: [
      {
        name: 'group',
        type: 'relation',
        required: true,
        collectionId: groupsColl.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        collectionId: usersColl.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      { name: 'last_read_message_id', type: 'text', required: false },
      { name: 'joined_at', type: 'date', required: false }
    ]
  });

  // 4. Setup "messages" collection (with reply_to)
  const messagesColl = await setupCollection({
    name: 'messages',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = sender || receiver = @request.auth.id || @request.auth.role = "superadmin"',
    deleteRule: '@request.auth.id = sender || @request.auth.role = "superadmin"',
    fields: [
      {
        name: 'sender',
        type: 'relation',
        required: true,
        collectionId: usersColl.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: 'receiver',
        type: 'relation',
        required: false,
        collectionId: usersColl.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: 'group',
        type: 'relation',
        required: false,
        collectionId: groupsColl.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      { name: 'content', type: 'text', required: false },
      { name: 'attachments', type: 'file', maxSelect: 5 },
      { name: 'read_at', type: 'date', required: false },
      { name: 'reply_to', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ]
  });

  // 5. Setup "app_settings" collection
  await setupCollection({
    name: 'app_settings',
    type: 'base',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "superadmin"',
    updateRule: '@request.auth.role = "superadmin"',
    deleteRule: '@request.auth.role = "superadmin"',
    fields: [
      { name: 'key', type: 'text', required: true },
      { name: 'value', type: 'text', required: true }
    ]
  });

  console.log('--- SEEDING INITIAL SUPERADMIN & SYSTEM SETTINGS ---');

  async function seedUser(username, name, password, role, className = '', canBroadcast = false) {
    try {
      const email = `${username}@nezcom.local`;
      const existing = await pb.collection('users').getFirstListItem(`username="${username}" || email="${email}"`).catch(() => null);
      if (existing) {
        if (!existing.username) {
          await pb.collection('users').update(existing.id, { username });
        }
        return existing;
      }
      console.log(`Creating user ${username} (${role})...`);
      return await pb.collection('users').create({
        username,
        name,
        email,
        emailVisibility: true,
        password,
        passwordConfirm: password,
        role,
        class_name: className,
        can_broadcast: canBroadcast
      });
    } catch (err) {
      console.error(`Failed to create user ${username}:`, err.response?.data || err.message);
    }
  }

  // 1. Seed Superadmin account
  const superadmin = await seedUser('superadmin', 'Super Administrator', 'admin123456', 'superadmin', '', true);

  // 2. Seed Global Broadcast Group
  let broadcastGroup = await pb.collection('groups').getFirstListItem('type="broadcast"').catch(() => null);
  if (!broadcastGroup) {
    console.log('Creating global Broadcast Group...');
    broadcastGroup = await pb.collection('groups').create({
      name: '📢 Broadcast',
      type: 'broadcast',
      created_by: superadmin?.id
    });
  }

  // 3. Seed Default App Settings
  const settingExist = await pb.collection('app_settings').getFirstListItem('key="broadcast_policy"').catch(() => null);
  if (!settingExist) {
    await pb.collection('app_settings').create({
      key: 'broadcast_policy',
      value: 'whitelisted_only'
    });
  }

  console.log('✅ PocketBase Setup Completed Successfully!');
  console.log('🔑 Superadmin Account Ready:');
  console.log('   Username: superadmin');
  console.log('   Password: admin123456');
}

main().catch(console.error);

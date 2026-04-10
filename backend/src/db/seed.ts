import dotenv from 'dotenv';
dotenv.config();

import { db } from '../config/database';
import { users, twilioSubaccounts } from './schema';
import bcrypt from 'bcrypt';
import { EncryptionService } from '../services/encryption.service';

/**
 * Seed database with sample data for development
 */
async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create a test user
    const passwordHash = await bcrypt.hash('password123', 10);

    const [user] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        passwordHash,
      })
      .returning();

    console.log('✅ Created test user:', user.email);

    // Create a test subaccount
    const encryptedToken = EncryptionService.encrypt('test_auth_token_12345');

    const [subaccount] = await db
      .insert(twilioSubaccounts)
      .values({
        userId: user.id,
        friendlyName: 'Test Subaccount',
        twilioSid: 'AC1234567890abcdef1234567890abcdef',
        twilioAuthTokenEncrypted: encryptedToken,
        isActive: true,
      })
      .returning();

    console.log('✅ Created test subaccount:', subaccount.friendlyName);

    console.log('\n📝 Test credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

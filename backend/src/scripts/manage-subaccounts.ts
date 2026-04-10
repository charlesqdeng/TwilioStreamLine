#!/usr/bin/env tsx

/**
 * Admin Script: Manage Subaccounts
 *
 * Useful commands:
 * - List all subaccounts: npm run script:subaccounts list
 * - Delete by Twilio SID: npm run script:subaccounts delete AC...
 * - Show user's subaccounts: npm run script:subaccounts user email@example.com
 */

import dotenv from 'dotenv';
import { db } from '../config/database';
import { twilioSubaccounts, users } from '../db/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

async function listAllSubaccounts() {
  console.log('\n📋 All Subaccounts:\n');

  const allSubaccounts = await db
    .select({
      id: twilioSubaccounts.id,
      friendlyName: twilioSubaccounts.friendlyName,
      twilioSid: twilioSubaccounts.twilioSid,
      userId: twilioSubaccounts.userId,
      userEmail: users.email,
      createdAt: twilioSubaccounts.createdAt,
    })
    .from(twilioSubaccounts)
    .leftJoin(users, eq(twilioSubaccounts.userId, users.id))
    .orderBy(twilioSubaccounts.createdAt);

  if (allSubaccounts.length === 0) {
    console.log('No subaccounts found.\n');
    return;
  }

  allSubaccounts.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.friendlyName}`);
    console.log(`   Twilio SID: ${sub.twilioSid}`);
    console.log(`   User: ${sub.userEmail} (${sub.userId})`);
    console.log(`   Created: ${sub.createdAt}`);
    console.log('');
  });
}

async function deleteSubaccountByTwilioSid(twilioSid: string) {
  console.log(`\n🗑️  Deleting subaccount: ${twilioSid}\n`);

  const subaccount = await db.query.twilioSubaccounts.findFirst({
    where: eq(twilioSubaccounts.twilioSid, twilioSid),
  });

  if (!subaccount) {
    console.log('❌ Subaccount not found.\n');
    return;
  }

  console.log(`Found: ${subaccount.friendlyName}`);
  console.log(`User ID: ${subaccount.userId}`);

  await db.delete(twilioSubaccounts).where(eq(twilioSubaccounts.twilioSid, twilioSid));

  console.log('✅ Subaccount deleted successfully (cascade deleted subscriptions and events).\n');
}

async function showUserSubaccounts(email: string) {
  console.log(`\n👤 Subaccounts for ${email}:\n`);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log('❌ User not found.\n');
    return;
  }

  const userSubaccounts = await db.query.twilioSubaccounts.findMany({
    where: eq(twilioSubaccounts.userId, user.id),
  });

  if (userSubaccounts.length === 0) {
    console.log('No subaccounts linked to this user.\n');
    return;
  }

  userSubaccounts.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.friendlyName}`);
    console.log(`   Twilio SID: ${sub.twilioSid}`);
    console.log(`   Sink SID: ${sub.sinkSid || 'None'}`);
    console.log(`   Created: ${sub.createdAt}`);
    console.log('');
  });
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'list':
      await listAllSubaccounts();
      break;

    case 'delete':
      if (!arg) {
        console.log('❌ Usage: npm run script:subaccounts delete AC...');
        process.exit(1);
      }
      await deleteSubaccountByTwilioSid(arg);
      break;

    case 'user':
      if (!arg) {
        console.log('❌ Usage: npm run script:subaccounts user email@example.com');
        process.exit(1);
      }
      await showUserSubaccounts(arg);
      break;

    default:
      console.log('\n📘 Manage Subaccounts Script\n');
      console.log('Usage:');
      console.log('  npm run script:subaccounts list                    - List all subaccounts');
      console.log('  npm run script:subaccounts delete AC...            - Delete subaccount by Twilio SID');
      console.log('  npm run script:subaccounts user email@example.com  - Show user\'s subaccounts');
      console.log('');
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

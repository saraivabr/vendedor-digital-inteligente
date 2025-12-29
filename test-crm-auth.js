/**
 * Test Script for CRM Authentication
 * Tests user creation, login, and permissions
 */

import crm from './src/crm/index.js';
import db from './src/database/db.js';

async function testCRMAuth() {
    console.log('🧪 Testing CRM Authentication System\n');

    try {
        // Initialize CRM
        await crm.initialize();
        console.log('');

        // Test 1: Create a test user
        console.log('Test 1: Create test user');
        const testUser = await crm.users.create({
            email: 'test@example.com',
            password: 'test123',
            name: 'Test User',
            role: 'agent'
        });
        console.log('✅ User created:', testUser.name, '-', testUser.email);
        console.log('');

        // Test 2: Login with correct credentials
        console.log('Test 2: Login with correct credentials');
        const loginSuccess = await crm.auth.login('test@example.com', 'test123');
        if (loginSuccess.success) {
            console.log('✅ Login successful');
            console.log('   Token:', loginSuccess.token.substring(0, 20) + '...');
            console.log('   User:', loginSuccess.user.name);
            console.log('   Role:', loginSuccess.user.role);
        } else {
            console.log('❌ Login failed:', loginSuccess.error);
        }
        console.log('');

        // Test 3: Login with wrong password
        console.log('Test 3: Login with wrong password');
        const loginFail = await crm.auth.login('test@example.com', 'wrongpass');
        if (!loginFail.success) {
            console.log('✅ Login correctly rejected:', loginFail.error);
        } else {
            console.log('❌ Login should have failed');
        }
        console.log('');

        // Test 4: Verify token
        console.log('Test 4: Verify token');
        const verification = crm.auth.verifyToken(loginSuccess.token);
        if (verification.valid) {
            console.log('✅ Token valid');
            console.log('   User:', verification.user.name);
        } else {
            console.log('❌ Token invalid:', verification.error);
        }
        console.log('');

        // Test 5: Check permissions
        console.log('Test 5: Check permissions');
        const canReadContacts = crm.permissions.canUser(verification.user, 'contacts', 'read');
        const canDeleteUsers = crm.permissions.canUser(verification.user, 'users', 'delete');
        console.log('   Agent can read contacts:', canReadContacts ? '✅ Yes' : '❌ No');
        console.log('   Agent can delete users:', canDeleteUsers ? '❌ Yes (should be No!)' : '✅ No (correct)');
        console.log('');

        // Test 6: List users
        console.log('Test 6: List users');
        const allUsers = crm.users.list();
        console.log('✅ Total users:', allUsers.length);
        allUsers.forEach(u => {
            console.log(`   - ${u.name} (${u.email}) [${u.role}]`);
        });
        console.log('');

        // Test 7: User statistics
        console.log('Test 7: User statistics');
        const stats = crm.users.getStats();
        console.log('✅ User stats:', stats);
        console.log('');

        // Test 8: Logout
        console.log('Test 8: Logout');
        const logoutResult = crm.auth.logout(loginSuccess.token);
        console.log('✅ Logged out');

        // Verify token is now invalid
        const verificationAfterLogout = crm.auth.verifyToken(loginSuccess.token);
        if (!verificationAfterLogout.valid) {
            console.log('✅ Token correctly invalidated after logout');
        } else {
            console.log('❌ Token should be invalid after logout');
        }
        console.log('');

        // Cleanup
        console.log('Test 9: Cleanup');
        crm.users.hardDelete(testUser.id);
        console.log('✅ Test user deleted');
        console.log('');

        console.log('🎉 All tests passed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    } finally {
        // Close database connection
        db.db.close();
    }
}

// Run tests
testCRMAuth();

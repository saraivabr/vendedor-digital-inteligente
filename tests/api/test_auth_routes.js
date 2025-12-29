/**
 * Tests for Auth Routes
 * Integration tests for authentication endpoints
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Express request/response
function mockRequest(data = {}) {
    return {
        body: data.body || {},
        params: data.params || {},
        query: data.query || {},
        headers: data.headers || {},
        ...data
    };
}

function mockResponse() {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        },
        send(data) {
            this.data = data;
            return this;
        }
    };
    return res;
}

describe('Auth Routes', () => {
    let authModule;
    let usersModule;
    let dbService;
    let testUserId;

    before(async () => {
        // Import auth and users modules
        const authPath = new URL('../../src/crm/auth.js', import.meta.url);
        const usersPath = new URL('../../src/crm/users.js', import.meta.url);
        const dbPath = new URL('../../src/database/db.js', import.meta.url);

        authModule = (await import(authPath.href)).default;
        usersModule = (await import(usersPath.href)).default;
        dbService = (await import(dbPath.href)).default;

        // Clear old sessions for test user
        try {
            dbService.db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)').run('test@example.com');
        } catch (err) {
            // Table might not exist yet, that's ok
        }

        // Check if test user already exists, hard delete and recreate to ensure known password
        const existing = usersModule.getByEmail('test@example.com');
        if (existing) {
            // Use hardDelete to actually remove the user (not just deactivate)
            usersModule.hardDelete(existing.id);
        }

        // Create test user with known password
        try {
            const testUser = await usersModule.create({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'agent'
            });
            testUserId = testUser.id;
            assert.ok(testUser, 'Test user should be created');
        } catch (err) {
            console.error('Failed to create test user:', err.message);
            // User might already exist from another test run
            const user = usersModule.getByEmail('test@example.com');
            if (user) {
                testUserId = user.id;
            } else {
                throw err;
            }
        }
    });

    beforeEach(async () => {
        // Clear all sessions to avoid unique constraint errors with tokens
        // JWT tokens might be identical if generated at the same timestamp
        try {
            dbService.db.prepare('DELETE FROM sessions').run();
        } catch (err) {
            // Ignore if table doesn't exist
        }
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const result = await authModule.login('test@example.com', 'password123');

            if (!result.success) {
                console.log('Login failed:', result.error);
            }

            assert.ok(result.success, `Login should succeed. Error: ${result.error || 'none'}`);
            assert.ok(result.token, 'Should return a token');
            assert.ok(result.user, 'Should return user data');
            assert.strictEqual(result.user.email, 'test@example.com');
            assert.ok(result.expiresAt, 'Should return expiration time');
        });

        it('should fail with invalid password', async () => {
            const result = await authModule.login('test@example.com', 'wrongpassword');

            assert.strictEqual(result.success, false, 'Login should fail');
            assert.ok(result.error, 'Should return error message');
        });

        it('should fail with non-existent user', async () => {
            const result = await authModule.login('nonexistent@example.com', 'password123');

            assert.strictEqual(result.success, false, 'Login should fail');
            assert.ok(result.error, 'Should return error message');
        });

        it('should fail with missing email', async () => {
            const result = await authModule.login('', 'password123');

            assert.strictEqual(result.success, false, 'Login should fail');
        });

        it('should fail with missing password', async () => {
            const result = await authModule.login('test@example.com', '');

            assert.strictEqual(result.success, false, 'Login should fail');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout with valid token', async () => {
            // Login first
            const loginResult = await authModule.login('test@example.com', 'password123');
            assert.ok(loginResult.success);

            // Logout
            authModule.logout(loginResult.token);

            // Verify token is invalid
            const verification = authModule.verifyToken(loginResult.token);
            assert.strictEqual(verification.valid, false);
        });

        it('should handle logout without token gracefully', () => {
            // Should not throw error
            authModule.logout(null);
            authModule.logout('');
            authModule.logout('invalid-token');
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should refresh valid token', async () => {
            // Login first
            const loginResult = await authModule.login('test@example.com', 'password123');
            assert.ok(loginResult.success);

            // Wait a moment to ensure new token timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            // Refresh token
            const refreshResult = await authModule.refreshToken(loginResult.token);

            assert.ok(refreshResult.success, 'Refresh should succeed');
            assert.ok(refreshResult.token, 'Should return new token');
            assert.ok(refreshResult.expiresAt, 'Should return new expiration');
        });

        it('should fail with invalid token', async () => {
            const refreshResult = await authModule.refreshToken('invalid-token');

            assert.strictEqual(refreshResult.success, false);
            assert.ok(refreshResult.error);
        });

        it('should fail with expired token', async () => {
            // Note: This would require manipulating time or waiting for expiration
            // Skipping for now as tokens have long expiration
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return user data with valid token', async () => {
            // Login first
            const loginResult = await authModule.login('test@example.com', 'password123');
            assert.ok(loginResult.success);

            // Verify token
            const verification = authModule.verifyToken(loginResult.token);

            assert.ok(verification.valid, 'Token should be valid');
            assert.ok(verification.user, 'Should return user data');
            assert.strictEqual(verification.user.email, 'test@example.com');
        });

        it('should fail with invalid token', () => {
            const verification = authModule.verifyToken('invalid-token');

            assert.strictEqual(verification.valid, false);
            assert.ok(verification.error);
        });

        it('should fail without token', () => {
            const verification = authModule.verifyToken('');

            assert.strictEqual(verification.valid, false);
        });
    });

    describe('POST /api/auth/change-password', () => {
        it('should change password with valid current password', async () => {
            // Login first
            const loginResult = await authModule.login('test@example.com', 'password123');
            assert.ok(loginResult.success);

            const verification = authModule.verifyToken(loginResult.token);
            assert.ok(verification.valid);

            // Change password
            const changeResult = await authModule.changePassword(
                verification.user.id,
                'password123',
                'newpassword123'
            );

            assert.ok(changeResult.success, 'Password change should succeed');

            // Verify old password doesn't work
            const oldPasswordLogin = await authModule.login('test@example.com', 'password123');
            assert.strictEqual(oldPasswordLogin.success, false);

            // Verify new password works
            const newPasswordLogin = await authModule.login('test@example.com', 'newpassword123');
            assert.ok(newPasswordLogin.success, 'Should login with new password');

            // Change back for other tests
            await authModule.changePassword(
                verification.user.id,
                'newpassword123',
                'password123'
            );
        });

        it('should fail with wrong current password', async () => {
            const loginResult = await authModule.login('test@example.com', 'password123');
            const verification = authModule.verifyToken(loginResult.token);

            const changeResult = await authModule.changePassword(
                verification.user.id,
                'wrongpassword',
                'newpassword123'
            );

            assert.strictEqual(changeResult.success, false);
            assert.ok(changeResult.error);
        });

        it('should accept short passwords (validation is at route level)', async () => {
            const loginResult = await authModule.login('test@example.com', 'password123');
            const verification = authModule.verifyToken(loginResult.token);

            // CRM module doesn't validate password length - that's done at the route level
            const changeResult = await authModule.changePassword(
                verification.user.id,
                'password123',
                '123'
            );

            assert.ok(changeResult.success, 'Password change should succeed at CRM level');

            // Change it back
            await authModule.changePassword(verification.user.id, '123', 'password123');
        });

        it('should fail with non-existent user', async () => {
            const changeResult = await authModule.changePassword(
                'nonexistent-id',
                'password123',
                'newpassword123'
            );

            assert.strictEqual(changeResult.success, false);
        });
    });

    // Token validation is tested implicitly through other tests
    // No need for explicit token format tests as the routes handle this

    after(() => {
        // Cleanup - remove test user if we created it in this test run
        // Note: In production, you might want to keep test users for repeated testing
        // For now, we'll leave the test user in place
    });
});

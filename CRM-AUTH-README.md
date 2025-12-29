# CRM Authentication & User Management

Complete authentication and user management system for the Vendedor Digital Inteligente CRM.

## Features

- **User Management**: Create, update, and manage user accounts
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Three user roles with granular permissions
- **Session Management**: Track and manage user sessions
- **Password Security**: Bcrypt password hashing with salt

## Architecture

### Database Schema

The system adds the following tables to the existing SQLite database:

- `users` - User accounts with roles and profiles
- `sessions` - JWT session tracking
- `permissions` - Role-based access control rules
- `notes` - Contact and deal notes with user attribution

### User Roles

Three built-in roles with different permission levels:

1. **Admin** - Full system access
   - Manage all contacts, deals, tasks
   - Create/edit/delete users
   - Access all settings and reports
   - Assign resources to any user

2. **Manager** - Team management
   - View all contacts, deals, tasks
   - Create and edit resources
   - Assign resources to team members
   - View reports
   - Cannot manage users or system settings

3. **Agent** - Individual contributor
   - View and edit assigned contacts/deals
   - Manage own tasks
   - Cannot assign resources to others
   - No access to settings or user management

## Installation

### 1. Install Dependencies

The required packages are already installed:

```bash
npm install bcryptjs jsonwebtoken uuid
```

### 2. Configure Environment

Add to your `.env` file (already in `.env.example`):

```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production
JWT_EXPIRES_IN=7d
```

**IMPORTANT**: Change the `JWT_SECRET` in production!

### 3. Database Migration

The CRM schema is automatically loaded when the database initializes. If you have an existing database, it will be upgraded with the new tables.

## Usage

### Initialize CRM

```javascript
import crm from './src/crm/index.js';

// Initialize (creates default admin if needed)
await crm.initialize();
```

### User Management

#### Create User

```javascript
const user = await crm.users.create({
    email: 'user@example.com',
    password: 'secure-password',
    name: 'John Doe',
    role: 'agent', // 'admin', 'manager', or 'agent'
    avatar_url: 'https://example.com/avatar.jpg' // optional
});
```

#### Get User

```javascript
// By ID
const user = crm.users.getById('user-id');

// By email
const user = crm.users.getByEmail('user@example.com');

// List all users
const users = crm.users.list();

// List with filters
const agents = crm.users.list({ role: 'agent', isActive: true });
const searchResults = crm.users.list({ search: 'john' });
```

#### Update User

```javascript
const updated = await crm.users.update('user-id', {
    name: 'Jane Doe',
    role: 'manager',
    avatar_url: 'https://example.com/new-avatar.jpg'
});

// Change password
const updated = await crm.users.update('user-id', {
    password: 'new-secure-password'
});
```

#### Deactivate/Activate User

```javascript
// Soft delete (recommended)
crm.users.deactivate('user-id');
crm.users.activate('user-id');

// Hard delete (permanent - use with caution)
crm.users.hardDelete('user-id');
```

### Authentication

#### Login

```javascript
const result = await crm.auth.login('user@example.com', 'password');

if (result.success) {
    console.log('Token:', result.token);
    console.log('User:', result.user);
    console.log('Expires:', result.expiresAt);
} else {
    console.error('Error:', result.error);
}
```

#### Verify Token

```javascript
const verification = crm.auth.verifyToken(token);

if (verification.valid) {
    console.log('User:', verification.user);
    console.log('Decoded:', verification.decoded);
} else {
    console.error('Error:', verification.error);
}
```

#### Logout

```javascript
// Logout current session
crm.auth.logout(token);

// Logout all sessions for user
crm.auth.logoutAll(userId);
```

#### Refresh Token

```javascript
const result = await crm.auth.refreshToken(oldToken);

if (result.success) {
    console.log('New token:', result.token);
    console.log('Expires:', result.expiresAt);
}
```

#### Change Password

```javascript
// User changes own password
const result = await crm.auth.changePassword(
    userId,
    'current-password',
    'new-password'
);

// Admin resets user password
const result = await crm.auth.resetPassword(userId, 'new-password');
```

### Permissions

#### Check Permissions

```javascript
// Check if role has permission
const canEdit = crm.permissions.hasPermission('agent', 'contacts', 'write');

// Check if user can perform action
const canDelete = crm.permissions.canUser(user, 'deals', 'delete');
```

#### Get Permissions

```javascript
// Get all permissions for role
const perms = crm.permissions.getPermissionsForRole('manager');

// Get permissions matrix (grouped by resource)
const matrix = crm.permissions.getPermissionsMatrix('agent');
// Returns: { contacts: ['read', 'write'], deals: ['read', 'write'], ... }

// Get all roles with permissions
const allPerms = crm.permissions.getAllRolesPermissions();
```

#### Manage Permissions

```javascript
// Grant permission
crm.permissions.grantPermission('manager', 'users', 'delete');

// Revoke permission
crm.permissions.revokePermission('manager', 'users', 'delete');

// Set all permissions for role (replaces existing)
crm.permissions.setPermissions('custom_role', [
    { resource: 'contacts', action: 'read' },
    { resource: 'contacts', action: 'write' },
    { resource: 'deals', action: 'read' }
]);
```

#### Express Middleware

```javascript
import express from 'express';
import crm from './src/crm/index.js';

const app = express();

// Authentication middleware
app.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const verification = crm.auth.verifyToken(token);
    if (!verification.valid) {
        return res.status(401).json({ error: verification.error });
    }

    req.user = verification.user;
    next();
});

// Permission middleware
app.delete('/api/users/:id',
    crm.permissions.requirePermission('users', 'delete'),
    (req, res) => {
        // Only users with 'users.delete' permission can access
        crm.users.delete(req.params.id);
        res.json({ success: true });
    }
);
```

## Permission Matrix

### Admin Role

| Resource  | Read | Write | Delete | Assign |
|-----------|------|-------|--------|--------|
| Contacts  | ✅   | ✅    | ✅     | ✅     |
| Deals     | ✅   | ✅    | ✅     | ✅     |
| Tasks     | ✅   | ✅    | ✅     | ✅     |
| Reports   | ✅   | -     | -      | -      |
| Settings  | ✅   | ✅    | -      | -      |
| Users     | ✅   | ✅    | ✅     | -      |

### Manager Role

| Resource  | Read | Write | Delete | Assign |
|-----------|------|-------|--------|--------|
| Contacts  | ✅   | ✅    | -      | ✅     |
| Deals     | ✅   | ✅    | -      | ✅     |
| Tasks     | ✅   | ✅    | -      | ✅     |
| Reports   | ✅   | -     | -      | -      |
| Settings  | ✅   | -     | -      | -      |
| Users     | ✅   | -     | -      | -      |

### Agent Role

| Resource  | Read | Write | Delete | Assign |
|-----------|------|-------|--------|--------|
| Contacts  | ✅*  | ✅*   | -      | -      |
| Deals     | ✅*  | ✅*   | -      | -      |
| Tasks     | ✅*  | ✅*   | -      | -      |
| Reports   | -    | -     | -      | -      |
| Settings  | -    | -     | -      | -      |
| Users     | -    | -     | -      | -      |

\* Agents can only read/write resources assigned to them

## Default Admin Account

On first initialization, a default admin account is created:

- **Email**: `admin@saraiva.ai`
- **Password**: `admin123`

**IMPORTANT**: Change this password immediately after first login!

```javascript
const result = await crm.auth.login('admin@saraiva.ai', 'admin123');
await crm.auth.changePassword(result.user.id, 'admin123', 'new-secure-password');
```

## Testing

Run the authentication test suite:

```bash
node test-crm-auth.js
```

This tests:
- User creation
- Login with correct/incorrect credentials
- Token verification
- Permission checks
- User listing and statistics
- Logout and session invalidation

## Security Best Practices

1. **Change Default Credentials**: Never use default admin password in production
2. **Secure JWT Secret**: Use a strong, random JWT_SECRET (min 32 characters)
3. **HTTPS Only**: Always use HTTPS in production to prevent token interception
4. **Token Expiration**: Use reasonable expiration times (default: 7 days)
5. **Password Policy**: Enforce strong passwords in your application layer
6. **Rate Limiting**: Implement rate limiting on login endpoints
7. **Audit Logging**: Log authentication events for security monitoring

## API Integration

### Express.js Example

```javascript
import express from 'express';
import crm from './src/crm/index.js';

const app = express();
app.use(express.json());

// Initialize CRM
await crm.initialize();

// Public routes
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await crm.auth.login(email, password);
    res.json(result);
});

// Protected routes (with auth middleware)
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const verification = crm.auth.verifyToken(token);

    if (!verification.valid) {
        return res.status(401).json({ error: verification.error });
    }

    req.user = verification.user;
    next();
};

app.get('/api/me', authMiddleware, (req, res) => {
    res.json(req.user);
});

app.get('/api/users',
    authMiddleware,
    crm.permissions.requirePermission('users', 'read'),
    (req, res) => {
        const users = crm.users.list();
        res.json(users);
    }
);

app.listen(3000, () => console.log('API running on port 3000'));
```

## File Structure

```
src/crm/
├── users.js           # User management
├── auth.js            # Authentication & JWT
├── permissions.js     # RBAC permissions
├── index.js           # Main CRM export
├── contacts.js        # Contact management
├── deals.js           # Deal management
├── tasks.js           # Task management
├── notes.js           # Notes management
├── activities.js      # Activity logging
├── pipeline.js        # Sales pipeline
├── metrics.js         # Analytics
└── tags.js            # Tag management

src/database/
├── db.js              # Database service
├── schema.sql         # Core schema
└── crm-schema.sql     # CRM & auth schema
```

## Troubleshooting

### "No default admin created"

The admin is only created if no admin users exist. Check existing users:

```javascript
const stats = crm.users.getStats();
console.log(stats);
```

### "Token expired"

Tokens expire after the configured time (default: 7 days). Use refresh token:

```javascript
const result = await crm.auth.refreshToken(oldToken);
```

### "Permission denied"

Check user's role and permissions:

```javascript
const user = crm.users.getById(userId);
console.log('Role:', user.role);

const perms = crm.permissions.getPermissionsMatrix(user.role);
console.log('Permissions:', perms);
```

### Database locked errors

SQLite uses WAL mode for concurrent access. Ensure database file has write permissions:

```bash
chmod 644 data/vendedor.db
chmod 644 data/vendedor.db-shm
chmod 644 data/vendedor.db-wal
```

## License

MIT License - Part of Vendedor Digital Inteligente project

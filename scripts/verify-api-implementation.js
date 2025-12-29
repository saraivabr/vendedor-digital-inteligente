#!/usr/bin/env node

/**
 * Verify API Implementation
 * Validates that all server and middleware files are properly created
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const REQUIRED_FILES = {
    'Server': 'src/api/server.js',
    'Auth Middleware': 'src/api/middleware/auth.js',
    'Error Middleware': 'src/api/middleware/errors.js',
    'Validation Middleware': 'src/api/middleware/validation.js',
    'Response Utils': 'src/api/utils/response.js'
};

const REQUIRED_EXPORTS = {
    'src/api/server.js': ['app', 'startServer'],
    'src/api/middleware/auth.js': ['authMiddleware', 'optionalAuth', 'requireRole', 'requireAdmin', 'requireManager'],
    'src/api/middleware/errors.js': ['notFoundHandler', 'errorHandler', 'asyncHandler'],
    'src/api/middleware/validation.js': ['validateRequired', 'validateEmail', 'validatePhone', 'validateEnum', 'validatePagination', 'sanitize'],
    'src/api/utils/response.js': ['success', 'created', 'paginated', 'error', 'notFound', 'forbidden', 'validationError']
};

console.log('🔍 Verifying API Implementation...\n');

let allValid = true;

// Check file existence
console.log('📁 Checking required files:');
for (const [name, path] of Object.entries(REQUIRED_FILES)) {
    const fullPath = join(projectRoot, path);
    const exists = existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${name}: ${path}`);
    if (!exists) allValid = false;
}

console.log('\n📦 Checking exports:');
for (const [file, exports] of Object.entries(REQUIRED_EXPORTS)) {
    const fullPath = join(projectRoot, file);
    if (!existsSync(fullPath)) {
        console.log(`  ❌ ${file}: File not found`);
        allValid = false;
        continue;
    }

    const content = readFileSync(fullPath, 'utf-8');
    const missingExports = [];

    for (const exportName of exports) {
        // Check for various export patterns
        const patterns = [
            `export function ${exportName}`,
            `export const ${exportName}`,
            `export { ${exportName}`,
            `export async function ${exportName}`,
            new RegExp(`export\\s*\\{[^}]*${exportName}[^}]*\\}`)  // export { foo, bar }
        ];

        const found = patterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(content);
            }
            return content.includes(pattern);
        });

        if (!found) {
            missingExports.push(exportName);
        }
    }

    if (missingExports.length === 0) {
        console.log(`  ✅ ${file}: All exports present`);
    } else {
        console.log(`  ⚠️  ${file}: Missing exports: ${missingExports.join(', ')}`);
        allValid = false;
    }
}

console.log('\n🔧 Checking dependencies:');

// Check package.json for required dependencies
const packageJsonPath = join(projectRoot, 'package.json');
if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = ['express', 'cors'];
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);

    if (missingDeps.length === 0) {
        console.log('  ✅ All required dependencies present');
    } else {
        console.log(`  ⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
        console.log('  💡 Run: npm install express cors');
        allValid = false;
    }
} else {
    console.log('  ❌ package.json not found');
    allValid = false;
}

console.log('\n📋 Implementation Notes:');
console.log('  ℹ️  Route handlers need to be implemented separately');
console.log('  ℹ️  CRM core modules (auth.js, index.js) must exist before server can start');
console.log('  ℹ️  Dashboard static files should be in src/dashboard/');

console.log('\n' + '='.repeat(60));
if (allValid) {
    console.log('✅ API Implementation VALID');
    console.log('   All middleware and server files are properly created.');
    process.exit(0);
} else {
    console.log('❌ API Implementation INCOMPLETE');
    console.log('   Review the errors above and fix missing components.');
    process.exit(1);
}

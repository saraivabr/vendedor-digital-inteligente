#!/bin/bash

echo "========================================="
echo "CRM Implementation Verification"
echo "========================================="
echo ""

echo "1. Checking CRM module files..."
echo ""

if [ -f "src/crm/pipeline.js" ]; then
    echo "   ✅ src/crm/pipeline.js"
else
    echo "   ❌ src/crm/pipeline.js (missing)"
fi

if [ -f "src/crm/metrics.js" ]; then
    echo "   ✅ src/crm/metrics.js"
else
    echo "   ❌ src/crm/metrics.js (missing)"
fi

if [ -f "src/crm/tags.js" ]; then
    echo "   ✅ src/crm/tags.js"
else
    echo "   ❌ src/crm/tags.js (missing)"
fi

echo ""
echo "2. Checking database schema..."
if [ -f "src/database/crm-schema.sql" ]; then
    echo "   ✅ src/database/crm-schema.sql"
else
    echo "   ❌ src/database/crm-schema.sql (missing)"
fi

echo ""
echo "3. Checking documentation..."
if [ -f "src/crm/README.md" ]; then
    echo "   ✅ src/crm/README.md"
else
    echo "   ❌ src/crm/README.md (missing)"
fi

echo ""
echo "4. Checking test files..."
if [ -f "test-crm.js" ]; then
    echo "   ✅ test-crm.js"
else
    echo "   ❌ test-crm.js (missing)"
fi

if [ -f "test-crm-comprehensive.js" ]; then
    echo "   ✅ test-crm-comprehensive.js"
else
    echo "   ❌ test-crm-comprehensive.js (missing)"
fi

echo ""
echo "5. Running tests..."
echo ""
node test-crm.js

echo ""
echo "========================================="
echo "Verification Complete!"
echo "========================================="

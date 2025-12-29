# API Quick Reference

Base URL: http://localhost:3000/api

## Authentication
- POST /auth/register - Register new user
- POST /auth/login - Login
- POST /auth/logout - Logout
- GET /auth/me - Get current user
- PUT /auth/change-password - Change password

## Activities (Timeline)
- GET /activities - List recent activities
- GET /activities/stats - Activity statistics
- POST /activities - Log new activity
- PUT /activities/:id/complete - Mark complete

## Tasks & Reminders
- GET /tasks - List all tasks
- GET /tasks/overdue - Overdue tasks
- GET /tasks/today - Due today
- GET /tasks/upcoming?days=7 - Upcoming tasks
- POST /tasks - Create task
- PUT /tasks/:id/complete - Complete task

## Notes
- GET /notes/search?q=keyword - Search notes
- POST /notes - Create note
- PUT /notes/:id/pin - Pin/unpin note
- DELETE /notes/:id - Delete note

## Contacts
- GET /contacts - List contacts
- GET /contacts/stats - Contact statistics
- GET /contacts/:id - Get contact details
- GET /contacts/:id/timeline - Contact timeline
- GET /contacts/:id/deals - Contact deals
- POST /contacts - Create contact
- PUT /contacts/:id - Update contact

## Deals (Opportunities)
- GET /deals - List deals
- GET /deals/stats - Pipeline statistics
- GET /deals/by-stage - Deals by stage
- POST /deals - Create deal
- PUT /deals/:id/move - Move to stage
- PUT /deals/:id/win - Mark as won
- PUT /deals/:id/lose - Mark as lost

## Pipeline
- GET /pipeline - Get stages
- GET /pipeline/summary - Pipeline summary
- POST /pipeline/stages - Create stage (manager+)
- PUT /pipeline/reorder - Reorder stages (manager+)

## Metrics & Analytics
- GET /metrics/dashboard - Dashboard KPIs
- GET /metrics/funnel - Conversion funnel
- GET /metrics/revenue - Revenue forecast
- GET /metrics/activity?days=30 - Activity metrics
- GET /metrics/performance?days=30 - User performance
- GET /metrics/export/contacts - Export contacts CSV
- GET /metrics/export/deals - Export deals CSV

## Tags
- GET /tags - List all tags
- GET /tags/stats - Tag usage statistics
- GET /tags/suggest?content=text - AI tag suggestions
- POST /tags - Create tag
- PUT /tags/:id - Update tag

## Users (Admin)
- GET /users - List users (manager+)
- GET /users/stats - User statistics (admin)
- POST /users - Create user (admin)
- PUT /users/:id - Update user
- PUT /users/:id/deactivate - Deactivate (admin)
- PUT /users/:id/activate - Activate (admin)
- POST /users/:id/reset-password - Reset password (admin)

## Query Parameters

### Pagination
- page=1 - Page number (default: 1)
- limit=50 - Items per page (default: 50)

### Filters
- status=active - Filter by status
- assignedTo=user_id - Filter by assignee
- contactId=contact_id - Filter by contact
- dealId=deal_id - Filter by deal
- pipeline=default - Filter by pipeline
- priority=high - Filter by priority

### Date Ranges
- dueBefore=2025-12-31 - Before date
- dueAfter=2025-01-01 - After date
- closeBefore=2025-12-31 - Close before
- closeAfter=2025-01-01 - Close after

### Analytics
- days=30 - Time period in days
- period=7 - Period for statistics

## Response Format

### Success (200 OK)
```json
{
  "status": "success",
  "data": { ... }
}
```

### Created (201)
```json
{
  "status": "success",
  "data": { "id": "...", ... }
}
```

### Paginated
```json
{
  "status": "success",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Error (4xx/5xx)
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Authentication

All endpoints except /auth/* require authentication.

Include JWT token in header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Role-Based Access

- Public: /auth/register, /auth/login
- User: Most endpoints
- Manager: /pipeline/stages, /users (read)
- Admin: /users (write), /users/stats

## Common HTTP Status Codes

- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Validation error
- 401 Unauthorized - Not authenticated
- 403 Forbidden - No permission
- 404 Not Found - Resource not found
- 409 Conflict - Duplicate resource
- 500 Internal Server Error - Server error

## Example Requests

### Create Contact
```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "phone": "5511999999999",
    "email": "joao@example.com"
  }'
```

### Create Deal
```bash
curl -X POST http://localhost:3000/api/deals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nova Venda",
    "contact_id": "contact_id",
    "value": 5000,
    "stage": "qualification"
  }'
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ligar para cliente",
    "type": "call",
    "due_date": "2025-12-30",
    "contact_id": "contact_id"
  }'
```

### Get Dashboard Metrics
```bash
curl http://localhost:3000/api/metrics/dashboard \
  -H "Authorization: Bearer TOKEN"
```

## CSV Export

Export endpoints return CSV files:

```bash
curl http://localhost:3000/api/metrics/export/contacts \
  -H "Authorization: Bearer TOKEN" \
  -o contacts.csv
```

Available export types:
- contacts
- deals
- activities
- daily_metrics

## Tips

1. Use pagination for large datasets
2. Filter by date ranges to improve performance
3. Check /stats endpoints for summaries
4. Use /search endpoints for fuzzy matching
5. Export data regularly for backups
6. Monitor /metrics/dashboard for KPIs
7. Use tags for flexible categorization
8. Log activities automatically for audit trail

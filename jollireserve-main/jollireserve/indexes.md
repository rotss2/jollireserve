# Firestore Indexes Quick Reference

## Direct Link to Create Indexes
https://console.firebase.google.com/project/jollireserve-defense/firestore/indexes

## All Required Indexes (6 total):

### 1. queue_entries - user history
- Collection: `queue_entries`
- Fields: `user_id` (Ascending), `joined_at` (Descending)

### 2. reservations - user history
- Collection: `reservations`
- Fields: `user_id` (Ascending), `created_at` (Descending)

### 3. activity_logs - user history
- Collection: `activity_logs`
- Fields: `user_id` (Ascending), `created_at` (Descending)

### 4. queue_entries - admin queue
- Collection: `queue_entries`
- Fields: `status` (Ascending), `created_at` (Ascending)

### 5. tables - available tables
- Collection: `tables`
- Fields: `is_active` (Ascending), `capacity` (Ascending)

### 6. menu_items - public menu
- Collection: `menu_items`
- Fields: `is_available` (Ascending), `category` (Ascending), `name` (Ascending)

---

## Quick CLI Method (if gcloud installed):

```bash
# Deploy all indexes at once using firestore indexes file
gcloud firestore indexes create firestore.indexes.json
```

Or use Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

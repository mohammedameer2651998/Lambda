# MongoDB Read-Only Mode

⚠️ **CRITICAL: NO DATABASE WRITES ALLOWED** ⚠️

## Strict Rules
- **NEVER** use `insertOne`, `insertMany`, `save()`
- **NEVER** use `updateOne`, `updateMany`, `findOneAndUpdate`
- **NEVER** use `deleteOne`, `deleteMany`, `findOneAndDelete`
- **NEVER** use `drop()`, `dropCollection()`, `dropDatabase()`
- **NEVER** use `bulkWrite` or any write operations

## Allowed Operations ONLY
- `find()`, `findOne()`
- `countDocuments()`, `estimatedDocumentCount()`
- `aggregate()` (read-only pipelines)
- `distinct()`

## Before Any MongoDB Code
1. Double-check the operation is READ-ONLY
2. Confirm no side effects
3. If user requests a write, STOP and confirm with user first

## Response Format
When showing MongoDB code, always add a comment:
```javascript
// ✅ READ-ONLY OPERATION
```

# Project Backlog 📋

Items to implement after Day 10 tutorial completion.

---

## Day 11: Collections & Relationships

### Backend ✅ Complete
| Task | Description | Status |
|------|-------------|--------|
| Category Model | Created Category schema with name, color, icon | ✅ |
| User Model | Created User schema (placeholder for Okta) | ✅ |
| Items References | Added category & createdBy refs to Items | ✅ |
| Category Routes | CRUD + seed endpoint for categories | ✅ |
| User Routes | CRUD + seed endpoint for users | ✅ |
| Populate Queries | Updated item routes with .populate() | ✅ |

### Frontend ⏳ Pending
| Task | Description | Status |
|------|-------------|--------|
| Category Dropdown | Add category selector to item create/edit form | ⏳ |
| Category Display | Show category name/color in items list | ⏳ |
| Category Filter | Filter items by category | ⏳ |
| Category Management | UI to create/edit/delete categories | ⏳ |
| User Display | Show "created by" user on items | ⏳ |
| User Selector | Temporary user picker (until Okta auth) | ⏳ |

### Example Structure:
```javascript
// Item references Category and User
{
  name: "My Item",
  category: ObjectId("..."),  // ref: Category
  createdBy: ObjectId("..."), // ref: User
}
```

---

## Day 12: Authentication & Okta

| Task | Description | Status |
|------|-------------|--------|
| Okta Setup | Create Okta developer account, configure app | ⏳ |
| OIDC Integration | Implement OpenID Connect flow | ⏳ |
| JWT Validation | Validate Okta tokens in Express middleware | ⏳ |
| Protected Routes | Secure API endpoints with auth middleware | ⏳ |
| User Sessions | Track logged-in users | ⏳ |
| Frontend Auth | Add login/logout to React app | ⏳ |

### Okta Flow:
```
React App → Okta Login → JWT Token → API validates token → Protected resource
```

---

## Day 13: Deploy Frontend (S3 + CloudFront)

| Task | Description | Status |
|------|-------------|--------|
| Build React App | `npm run build` creates static files | ⏳ |
| S3 Static Hosting | Upload build to S3 bucket | ⏳ |
| CloudFront CDN | Global distribution + HTTPS | ⏳ |
| Custom Domain | Configure Route53 + SSL certificate | ⏳ |
| Same Origin Setup | Frontend + API on same domain (no CORS) | ⏳ |

---

## 🔒 Security Roadmap

### Day 8 Security (API Gateway) ✅ PLANNED
| Protection | What It Does | Stops |
|------------|-------------|-------|
| Rate Limiting | 100 requests/second max | DoW attacks, abuse |
| API Keys | Require key header to access | Anonymous access |
| Usage Plans | Monthly quotas per key | Cost overruns |

### Day 12 Security (Authentication) ✅ PLANNED  
| Protection | What It Does | Stops |
|------------|-------------|-------|
| Okta OIDC | Users must log in | Anonymous access |
| JWT Validation | Verify tokens on every request | Token forgery |
| Protected Routes | Middleware checks auth | Unauthorized access |

### Day 14+: Advanced Security (NEW)
| Task | Description | Priority |
|------|-------------|----------|
| Authorization | Users can only CRUD their OWN data | 🔴 High |
| Input Validation | Validate/sanitize all inputs (Joi/Zod) | 🔴 High |
| WAF | AWS Web Application Firewall rules | 🟡 Medium |
| File Upload Limits | Max file size, allowed types only | 🟡 Medium |
| HTTPS Only | Force HTTPS, reject HTTP | 🟡 Medium |
| Security Headers | Helmet.js (CSP, XSS protection) | 🟡 Medium |
| Secrets Rotation | Auto-rotate DB passwords | 🟢 Low |
| VPC | Private subnets for Lambda | 🟢 Low |

---

## 🔔 CloudWatch Alarms (Additional)

| Alarm | Threshold | Priority | Status |
|-------|-----------|----------|--------|
| Lambda Errors | > 5 in 5 min | 🔴 Critical | ✅ Created |
| Lambda Duration | Avg > 5 sec | 🟡 Warning | ⏳ Backlog |
| Lambda Throttles | > 0 | 🟡 Warning | ⏳ Backlog |
| Lambda Not Running | 0 invocations in 1 hour | 🔴 Critical | ⏳ Backlog |
| AWS Cost Alert | > $10/day | 🟠 High | ⏳ Backlog |
| Health Check Failure | Logged "unhealthy" | 🔴 Critical | ⏳ Backlog |

---

## Future Ideas (Unscheduled)

| Idea | Priority | Notes |
|------|----------|-------|
| User Roles & Permissions | Medium | Admin, Editor, Viewer roles |
| Email Notifications (SES) | Low | Send emails on events |
| Caching (Redis) | Medium | Cache frequent queries |
| Full-Text Search | Medium | Atlas Search or Elasticsearch |
| WebSockets | Low | Real-time updates |
| Testing (Jest) | High | Unit & integration tests |
| Docker | Medium | Containerization |
| GitHub Actions CI/CD | High | Covered in Day 10 |
| Wrapper | high| cover in day12| 
| adding terraform and multiple envrionments |
|ssl certificates | jwt tokens|
|email alerts for over above of 10$ 20$ aws utlization|
|cron job with eventbridge scheduled|

---

## Completed ✅

| Day | Topic | Date |
|-----|-------|------|
| 1-2 | Project setup, Express API | ✅ |
| 3 | React frontend | ✅ |
| 4 | MongoDB Atlas | ✅ |
| 5 | AWS Secrets Manager | ✅ |
| 6 | S3 file uploads | ✅ |
| 7 | Lambda deployment | ✅ |
| 8 | API Gateway (Rate Limiting, API Keys) | ✅ |
| 9 | EventBridge (Scheduled Tasks) | ✅ |
| 10 | CloudWatch, IAM, CI/CD | ✅ |
| 11 | MongoDB Collections & Relationships (Backend) | ✅ |
| 11 | Frontend UI for Categories/Users | ⏳ Pending |

---

## Notes

- Using AWS Free Tier
- MongoDB Atlas Free Tier
- Okta Developer Account (free)

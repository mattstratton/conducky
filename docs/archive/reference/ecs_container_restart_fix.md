# 🚨 ECS Container Restart Issue - Fix Required

## Problem Summary

**Containers are continuously restarting due to load balancer health check failures**, not application crashes. Both frontend and backend applications start successfully but fail health checks, causing ECS to kill and restart tasks in an endless cycle.

## Root Cause Analysis

### 🔍 Investigation Results (via Steampipe/Tailpipe analysis)

**Current Status:**
- ✅ Applications start successfully (frontend in ~4s, backend in ~10s)
- ✅ Database connections work (Prisma migrations complete)
- ✅ No application crashes or errors in logs
- ❌ Load balancer health checks failing with "Request timed out"
- ❌ Tasks being killed due to unhealthy status

**Deployment Statistics:**
- Backend: 5+ failed tasks per deployment cycle
- Frontend: 5+ failed tasks per deployment cycle
- Health check failures every 30 seconds
- Continuous task replacement pattern

### 🎯 Primary Issues Identified

#### 1. **Network Binding Problem (CRITICAL)**
- **Frontend**: Binding to specific container IP (`169.254.172.2:3000`) instead of `0.0.0.0:3000`
- **Backend**: Likely binding to localhost or specific IP instead of `0.0.0.0:4000`
- **Impact**: Load balancer health checks from external IPs get rejected

#### 2. **Health Check Configuration Issues**
- **Health Check Path**: `/` (root path)
- **Timeout**: 5 seconds (might be too short)
- **Target Response**: HTTP 200 expected
- **Interval**: Every 30 seconds
- **Both services currently showing**: `Target.Timeout - Request timed out`

#### 3. **Missing Dedicated Health Endpoints**
- Applications don't appear to have dedicated health check endpoints
- No health check logging visible in CloudWatch logs

## 🛠️ Required Fixes

### Priority 1: Fix Network Binding (CRITICAL)

#### Frontend (Next.js) Changes

**Option 1: Simple Fix (Recommended)**
```bash
# Always bind to 0.0.0.0 (works everywhere)
next dev -H 0.0.0.0 -p 3000
```

**Option 2: Environment-Aware (If you prefer)**
```javascript
// In next.config.js or package.json script
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// package.json
"scripts": {
  "dev": "next dev -H ${HOSTNAME:-0.0.0.0} -p 3000",
  "start": "next start -H 0.0.0.0 -p 3000"
}
```

**Option 3: Docker-Aware**
```dockerfile
# In Dockerfile
ENV HOSTNAME=0.0.0.0
# This will work in both Docker Compose and AWS
```

#### Backend (Node.js) Changes

**Option 1: Simple Fix (Recommended)**
```javascript
// Always bind to 0.0.0.0 (works everywhere)
const host = '0.0.0.0';
const port = process.env.PORT || 4000;

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});
```

**Option 2: Environment-Aware**
```javascript
// Environment-based binding
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = process.env.PORT || 4000;

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});
```

**Option 3: Container-Detection**
```javascript
// Auto-detect if running in container
const isContainer = process.env.DOCKER_CONTAINER || 
                   process.env.ECS_CONTAINER_METADATA_URI || 
                   fs.existsSync('/.dockerenv');

const host = isContainer ? '0.0.0.0' : 'localhost';
const port = process.env.PORT || 4000;

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port} (container: ${isContainer})`);
});
```

### Priority 2: Add Health Check Endpoints

#### Backend Health Endpoint
```javascript
// Add to your Express app
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

// Optional: Add readiness check
app.get('/ready', (req, res) => {
  // Check database connectivity
  // Check external dependencies
  res.status(200).json({ status: 'ready' });
});
```

#### Frontend Health Endpoint
```javascript
// Add to Next.js API routes (pages/api/health.js or app/api/health/route.js)
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'frontend'
  });
}

// For App Router (app/api/health/route.js):
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'frontend'
  });
}
```

### Priority 3: Update Load Balancer Configuration

#### Target Group Health Check Settings
```terraform
# Update health check configuration
health_check {
  enabled             = true
  healthy_threshold   = 3
  interval            = 30
  matcher            = "200"
  path               = "/health"  # Change from "/" to "/health"
  port               = "traffic-port"
  protocol           = "HTTP"
  timeout            = 10         # Increase from 5 to 10 seconds
  unhealthy_threshold = 3
}
```

### Priority 4: Improve Container Startup

#### Add Health Check to Task Definition
```json
{
  "healthCheck": {
    "command": [
      "CMD-SHELL",
      "curl -f http://localhost:3000/health || exit 1"
    ],
    "interval": 30,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 60
  }
}
```

#### Optimize Container Startup
```dockerfile
# Add health check to Dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Ensure curl is available
RUN apt-get update && apt-get install -y curl
```

## 🔧 Implementation Checklist

### Phase 1: Network Binding Fix
- [ ] Update frontend to bind to `0.0.0.0:3000`
- [ ] Update backend to bind to `0.0.0.0:4000`
- [ ] Test locally with `docker run -p 3000:3000 <frontend-image>`
- [ ] Verify external connections work

### Phase 2: Health Endpoints
- [ ] Add `/health` endpoint to backend
- [ ] Add `/health` endpoint to frontend
- [ ] Test health endpoints return HTTP 200
- [ ] Add logging for health check requests

### Phase 3: Infrastructure Updates
- [ ] Update target group health check paths to `/health`
- [ ] Increase health check timeout to 10 seconds
- [ ] Update task definitions with container health checks
- [ ] Deploy infrastructure changes

### Phase 4: Validation
- [ ] Deploy updated containers
- [ ] Monitor ECS service events for health check success
- [ ] Verify no more task restarts
- [ ] Test application functionality end-to-end

## 📊 Current Environment Details

**ECS Cluster**: `conducky-cluster`
**Services**: 
- `backend-service-f0e0d4f` (Task Definition: `backend-taskdef:12`)
- `frontend-service-c0be465` (Task Definition: `frontend-taskdef:8`)

**Target Groups**:
- Backend: `backend-tg-3d64d6c` (Port 4000)
- Frontend: `frontend-tg-e99d78d` (Port 3000)

**CloudWatch Log Group**: `conducky-ecs-logs-851c312`

## 🔍 Monitoring After Fix

Post-deployment, monitor these metrics:
- ECS service events (should show healthy status)
- Target group health (should show "healthy" status)
- CloudWatch logs for health check requests
- Task restart frequency (should be zero)

## 💡 Prevention

To avoid similar issues in the future:
1. Always bind applications to `0.0.0.0` in containerized environments
2. Implement dedicated health check endpoints early
3. Test health checks in local Docker environment before deployment
4. Use appropriate health check timeouts for application startup time
5. Monitor ECS service events during deployments

---

**Severity**: High (Production services unstable)
**Priority**: P1 (Fix immediately)
**Estimated Effort**: 2-4 hours
**Risk Level**: Low (Changes are well-defined and tested patterns)
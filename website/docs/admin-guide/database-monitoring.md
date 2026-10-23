---
sidebar_position: 5
---

# Database Monitoring

This guide covers database performance monitoring tools available to System Admins for ensuring optimal system performance.

## Overview

System Admins have access to comprehensive database performance monitoring tools to ensure optimal system performance and identify potential issues before they impact users. The monitoring system provides real-time insights into query performance, N+1 patterns, and optimization opportunities.

## Accessing Performance Metrics

### Via Admin API

Use the dedicated performance endpoints:

- **GET `/api/admin/database/performance`** - Get current performance metrics
- **POST `/api/admin/database/performance/reset`** - Reset metrics to start fresh monitoring

Both endpoints require System Admin authentication and return JSON responses.

### Example Usage

**Check current performance:**
```bash
curl -H "Cookie: your-session-cookie" \
     http://localhost:4000/api/admin/database/performance
```

**Reset metrics after optimization:**
```bash
curl -X POST \
     -H "Cookie: your-session-cookie" \
     http://localhost:4000/api/admin/database/performance/reset
```

## Understanding Performance Metrics

### Summary Metrics

- **Total Queries**: All database queries executed since last reset
- **Slow Queries**: Queries taking 100-500ms (yellow flag)
- **Very Slow Queries**: Queries taking \>500ms (red flag)
- **Average Execution Time**: Overall query performance indicator
- **N+1 Patterns**: Detected inefficient query patterns

### Performance Details

The system tracks:

1. **Slowest Query Patterns**: Top 10 queries by execution time
2. **Most Frequent Queries**: Top 10 queries by execution count
3. **N+1 Detection**: Requests with suspiciously high query counts

### Query Pattern Analysis

Each tracked query includes:

- **Normalized Pattern**: SQL with parameters replaced by placeholders
- **Execution Count**: How many times the query was run
- **Average Duration**: Mean execution time in milliseconds
- **Total Duration**: Cumulative execution time
- **Last Executed**: Timestamp of most recent execution

## Performance Optimization Workflow

### 1. Establish Baseline

Before making changes:

```bash
# Reset metrics to start fresh
curl -X POST -H "Cookie: your-session" \
     http://localhost:4000/api/admin/database/performance/reset

# Let system run under normal load for a period
# Then check performance
curl -H "Cookie: your-session" \
     http://localhost:4000/api/admin/database/performance
```

### 2. Identify Issues

Look for:

- **Slow Queries**: High average execution times
- **N+1 Patterns**: High query counts per request
- **Frequent Queries**: Opportunities for caching
- **Missing Indexes**: Queries on non-indexed columns

### 3. Apply Optimizations

Common optimizations:

- **Add Database Indexes**: For frequently filtered columns
- **Fix N+1 Queries**: Use `include` or `select` in Prisma queries
- **Optimize Query Logic**: Reduce unnecessary data fetching
- **Implement Caching**: For frequently accessed data

### 4. Measure Impact

After changes:

```bash
# Reset metrics to measure impact
curl -X POST -H "Cookie: your-session" \
     http://localhost:4000/api/admin/database/performance/reset

# Monitor improved performance
curl -H "Cookie: your-session" \
     http://localhost:4000/api/admin/database/performance
```

## Monitoring Best Practices

### Regular Monitoring Schedule

- **Daily**: Check for new slow queries during peak usage
- **Weekly**: Review N+1 patterns and frequent queries
- **Monthly**: Reset metrics and establish new baselines
- **After Deployments**: Monitor impact of code changes

### Performance Thresholds

**Acceptable Performance:**
- Average execution time: \<50ms
- Slow queries: \<5% of total
- Very slow queries: \<1% of total
- N+1 patterns: 0 detected

**Warning Thresholds:**
- Average execution time: 50-100ms
- Slow queries: 5-10% of total
- Very slow queries: 1-3% of total
- N+1 patterns: 1-2 detected

**Critical Thresholds:**
- Average execution time: \>100ms
- Slow queries: \>10% of total
- Very slow queries: \>3% of total
- N+1 patterns: \>2 detected

### Automated Recommendations

The system provides automated optimization suggestions:

- **Index Recommendations**: For frequently filtered columns
- **N+1 Detection**: With specific query patterns to fix
- **Caching Opportunities**: For frequently executed queries
- **Query Optimization**: For slow-performing patterns

## Database Index Management

### Current Indexes

The system includes optimized indexes for:

- **Event-scoped queries**: `incidents.eventId`, `userRoles.scopeId`
- **User-scoped queries**: `incidents.reporterId`, `incidents.assignedResponderId`
- **Status filtering**: `incidents.state`, `incidents.severity`
- **Time-based queries**: `incidents.createdAt`, `incidents.updatedAt`
- **Composite indexes**: Multi-column queries for complex filtering

### Adding New Indexes

When the performance monitor suggests new indexes:

1. **Identify the query pattern** from performance metrics
2. **Analyze the WHERE clauses** to determine index columns
3. **Add index to Prisma schema**:
   ```prisma
   model Incident {
     // ...existing fields...
     
     @@index([eventId, state])
     @@index([reporterId, createdAt])
   }
   ```
4. **Create migration**:
   ```bash
   docker-compose exec backend npx prisma migrate dev --name add-performance-indexes
   docker-compose exec backend npx prisma generate
   ```
5. **Monitor impact** using performance metrics

### Index Maintenance

**Regular Tasks**:
- **Analyze index usage**: Identify unused indexes
- **Monitor index size**: Track storage impact
- **Update statistics**: Refresh database statistics
- **Reorganize indexes**: Optimize index fragmentation

## Troubleshooting Performance Issues

### Common Issues and Solutions

**High N+1 Query Count:**
- **Symptom**: Many similar queries executed in sequence
- **Cause**: Missing `include` in Prisma queries
- **Solution**: Add proper `include` statements to fetch related data

**Slow Event-Scoped Queries:**
- **Symptom**: Event dashboard loading slowly
- **Cause**: Missing indexes on event-related tables
- **Solution**: Add composite indexes for event + filter combinations

**Memory Usage Spikes:**
- **Symptom**: High memory consumption during queries
- **Cause**: Large result sets without pagination
- **Solution**: Implement proper pagination and query limits

**Connection Pool Exhaustion:**
- **Symptom**: "Too many connections" errors
- **Cause**: Long-running queries or connection leaks
- **Solution**: Optimize slow queries and check connection management

### Performance Investigation Steps

1. **Check Performance Metrics**:
   ```bash
   curl -H "Cookie: your-session" \
        http://localhost:4000/api/admin/database/performance
   ```

2. **Identify Slow Queries**:
   - Look for queries with high average execution time
   - Focus on frequently executed slow queries first

3. **Analyze Query Patterns**:
   - Check for N+1 patterns in request traces
   - Look for missing indexes in slow queries
   - Identify opportunities for query optimization

4. **Test Optimizations**:
   - Create test environment with similar data volume
   - Apply proposed optimizations
   - Measure performance improvements

## Database Health Monitoring

### Connection Monitoring

**Connection Pool Status**:
- **Active Connections**: Currently executing queries
- **Idle Connections**: Available for new queries
- **Pool Utilization**: Percentage of pool in use

**Connection Metrics**:
- **Average Connection Time**: Time to establish connections
- **Connection Errors**: Failed connection attempts
- **Connection Timeouts**: Queries exceeding time limits

### Storage Monitoring

**Database Size**:
- **Total Database Size**: Overall storage usage
- **Table Sizes**: Storage per table
- **Index Sizes**: Storage used by indexes
- **Growth Rate**: Storage increase over time

**Maintenance Alerts**:
- **Storage Threshold**: Alert when storage exceeds limits
- **Growth Projection**: Predict storage needs
- **Cleanup Opportunities**: Identify data for archival

## Performance Reporting

### Regular Reports

**Daily Performance Summary**:
- Query count and average execution time
- Top 5 slowest queries
- N+1 pattern detection results
- Connection pool utilization

**Weekly Performance Review**:
- Performance trends over time
- Index usage analysis
- Storage growth patterns
- Optimization recommendations

**Monthly Performance Analysis**:
- Baseline performance comparison
- Capacity planning recommendations
- Performance optimization roadmap
- Database maintenance schedule

### Custom Queries

For advanced analysis, System Admins can run custom performance queries:

```sql
-- Find tables with missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE n_distinct > 100 AND correlation < 0.1;

-- Analyze query performance by table
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;
```

## Integration with Monitoring Tools

### External Monitoring

**Recommended Tools**:
- **Grafana**: Visual dashboards for performance metrics
- **Prometheus**: Time-series database for metric collection
- **DataDog**: Comprehensive application and database monitoring
- **New Relic**: Application performance monitoring

**Integration Points**:
- **Performance API**: Export metrics to external systems
- **Database Logs**: Parse PostgreSQL logs for analysis
- **Custom Metrics**: Add application-specific performance indicators

### Alerting

**Performance Alerts**:
- **Slow Query Threshold**: Alert when queries exceed time limits
- **N+1 Detection**: Notify when inefficient patterns are detected
- **Connection Pool**: Alert on high utilization or errors
- **Storage Limits**: Warn when approaching storage capacity

## Next Steps

For comprehensive system administration:

- **Security Monitoring**: See [Security Overview](./security-overview.md)
- **System Configuration**: Review [System Settings](./system-settings.md)
- **Event Management**: Check [Event Management](./event-management.md)
- **Overall System Health**: Monitor using [System Configuration](./system-configuration.md)

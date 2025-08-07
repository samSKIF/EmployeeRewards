# Dual-Write Migration Guide

## 🚀 Phase 1: Initial Testing (ACTIVE)

### Overview
You are currently in **Phase 1** of the dual-write migration to Employee Core service. This phase is configured to:
- Write 10% of traffic to Employee Core (async mode)
- Monitor success rates and collect metrics
- Validate system stability

### Environment Configuration

To configure the dual-write adapter, set these environment variables:

```bash
# Phase 1 Configuration
ENABLE_DUAL_WRITE=true
DUAL_WRITE_PERCENTAGE=10
DUAL_WRITE_MODE=async
READ_FROM_NEW_SERVICE=false

# Employee Core Service
EMPLOYEE_CORE_URL=http://localhost:3001
ENABLE_EMPLOYEE_CORE_DUAL_WRITE=true
EMPLOYEE_CORE_TIMEOUT=5000
EMPLOYEE_CORE_RETRY_ATTEMPTS=2

# Migration Monitoring
MIGRATION_SUCCESS_THRESHOLD=95
MIGRATION_ALERT_THRESHOLD=90
MIGRATION_PHASE=1
```

### Monitoring Dashboard

Access the migration monitoring dashboard at:
- **URL**: `/admin/dual-write-monitor`
- **Features**:
  - Real-time metrics and success rates
  - Phase progression tracking
  - Manual override controls
  - Service health status

### Phase Progression Criteria

Before progressing to Phase 2, ensure:
- ✅ Success rate > 95%
- ✅ At least 100 operations completed
- ✅ 24 hours of stable operation
- ✅ Employee Core service healthy

### API Endpoints

The following management endpoints are available:

```
GET  /api/dual-write/status              - Current status and metrics
GET  /api/dual-write/phases              - All migration phases
GET  /api/dual-write/phases/check-progression - Check if ready to progress
POST /api/dual-write/phases/progress     - Progress to next phase
POST /api/dual-write/phases/rollback     - Rollback to previous phase
POST /api/dual-write/config              - Update configuration
POST /api/dual-write/toggle              - Enable/disable dual-write
```

## 📊 Metrics and Monitoring

### Key Metrics
- **Total Operations**: Number of write operations attempted
- **Success Rate**: Percentage of successful dual-writes
- **Failed Operations**: Count of failed writes to Employee Core
- **Time in Phase**: Hours since phase started

### Alerting Thresholds
- **Warning**: Success rate < 95%
- **Critical**: Success rate < 90%
- **Action Required**: Failed operations > 10 in 5 minutes

### Event Bus Integration
The system publishes these events:
- `dual_write.metrics` - Periodic metrics updates
- `dual_write.config_updated` - Configuration changes
- `migration.phase_changed` - Phase progression
- `migration.ready_for_progression` - Criteria met
- `migration.phase_rollback` - Rollback occurred

## 🔄 Migration Phases

### Phase 1: Initial Testing (10% async) - **CURRENT**
- Validate dual-write functionality
- Monitor for errors
- Establish baseline metrics

### Phase 2: Gradual Increase (30% async)
- Increase traffic gradually
- Monitor performance impact
- 48-hour stability requirement

### Phase 3: Half Traffic (50% async)
- Half of writes go to both services
- Extended monitoring period
- Performance validation

### Phase 4: Majority Traffic (80% async)
- Most writes dual-written
- Prepare for full migration
- Final validation

### Phase 5: Full Traffic (100% async)
- All writes go to both services
- 72-hour stability requirement
- Prepare for sync mode

### Phase 6: Synchronous Mode (100% sync)
- Ensure data consistency
- Both writes must succeed
- 24-hour validation

### Phase 7: Read Migration (100% sync + read)
- Start reading from Employee Core
- Legacy becomes backup
- 48-hour validation

### Phase 8: Migration Complete
- Disable dual-write
- Employee Core is primary
- 1-week observation period

## 🛠️ Troubleshooting

### Common Issues

1. **Employee Core Service Unhealthy**
   - Check service is running on port 3001
   - Verify health endpoint: `http://localhost:3001/health`
   - Check network connectivity

2. **Low Success Rate**
   - Review Employee Core logs
   - Check for schema mismatches
   - Verify authentication headers

3. **Cannot Progress Phase**
   - Check all criteria are met
   - Review metrics in dashboard
   - Use force progression if necessary (admin only)

### Rollback Procedure

If issues occur:
1. Click "Rollback" in the dashboard
2. Or use API: `POST /api/dual-write/phases/rollback`
3. Investigate and fix issues
4. Resume progression when ready

## 📈 Success Metrics

Track these KPIs:
- Overall migration progress: **12.5%** (Phase 1 of 8)
- Target completion: 4-6 weeks
- Success rate target: >95%
- Zero data loss requirement

## 🔒 Safety Features

- Automatic rollback on critical failures
- Async mode prevents performance impact
- Health checks every 30 seconds
- Metrics reporting every 5 minutes
- Admin-only phase controls

## 📝 Next Steps

1. Monitor Phase 1 metrics for 24 hours
2. Review success rate and operation count
3. When criteria met, progress to Phase 2
4. Continue gradual migration per plan

## 🆘 Support

For issues or questions:
- Check dashboard for real-time status
- Review Employee Core logs
- Monitor event bus for alerts
- Contact system administrator if needed

---

*Last Updated: August 7, 2025*
*Current Phase: 1 - Initial Testing*
*Migration Started: August 7, 2025*
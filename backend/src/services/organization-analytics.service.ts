import { PrismaClient, Incident, IncidentState, IncidentSeverity } from '@prisma/client';

export type TimeRangeParam = '30d' | '90d' | '1y' | 'all';

export interface OrganizationAnalyticsFilters {
  organizationId: string;
  timeRange?: TimeRangeParam;
  eventId?: string;
  status?: IncidentState;
  severity?: IncidentSeverity;
}

export interface OrganizationAnalyticsResponse {
  metrics: {
    totalReports: number;
    pendingReports: number;
    avgResolutionTime: number; // hours
    escalatedReports: number;
  };
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  bySeverity: Array<{ severity: string; count: number; percentage: number }>;
  byEvent: Array<{ eventName: string; eventSlug: string; count: number }>;
  monthlyTrends: Array<{ month: string; count: number; resolved: number }>;
  recentReports: Array<{
    id: string;
    title: string;
    status: string;
    severity: string | null;
    eventName: string;
    submittedAt: string;
    assignedTo?: string;
  }>;
}

export interface OrganizationEventsSummaryResponse {
  totalEvents: number;
  activeEvents: number;
  events: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    reportCount: number;
    teamSize: number;
  }>;
}

export class OrganizationAnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? new PrismaClient();
  }

  async getOrganizationAnalytics(filters: OrganizationAnalyticsFilters): Promise<OrganizationAnalyticsResponse> {
    const { organizationId, timeRange = '30d', eventId, status, severity } = filters;
    const { startDate, endDate } = this.getDateRange(timeRange);

    const incidentWhere: any = {
      createdAt: startDate ? { gte: startDate, lte: endDate } : undefined,
      state: status ? status : undefined,
      severity: severity ? severity : undefined,
      event: { organizationId }
    };
    if (eventId) incidentWhere.eventId = eventId;

    // Total
    const totalReports = await this.prisma.incident.count({ where: incidentWhere });

    // Pending = not resolved or closed
    const pendingStates: IncidentState[] = ['submitted', 'acknowledged', 'investigating'];
    const pendingReports = await this.prisma.incident.count({
      where: { ...incidentWhere, state: { in: pendingStates } }
    });

    // Escalated: approximate using critical severity
    const escalatedReports = await this.prisma.incident.count({
      where: { ...incidentWhere, severity: 'critical' }
    });

    // Average resolution time (hours) for resolved/closed
    const resolvedStates: IncidentState[] = ['resolved', 'closed'];
    const resolvedIncidents = await this.prisma.incident.findMany({
      where: { ...incidentWhere, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true }
    });
    const durationsMs = resolvedIncidents
      .map((r) => {
        const created = r.createdAt ? new Date(r.createdAt as any) : null;
        const resolved = (r as any).resolvedAt ? new Date((r as any).resolvedAt as any) : null;
        if (!created || isNaN(created.getTime()) || !resolved || isNaN(resolved.getTime())) return null;
        return resolved.getTime() - created.getTime();
      })
      .filter((d): d is number => typeof d === 'number');
    const avgResolutionTime = durationsMs.length === 0
      ? 0
      : durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 1000 / 60 / 60;

    // By status
    const byStatusCounts = await this.prisma.incident.groupBy({
      by: ['state'],
      where: incidentWhere,
      _count: { state: true }
    });
    const byStatus = byStatusCounts.map((row) => ({
      status: row.state,
      count: row._count.state,
      percentage: totalReports > 0 ? Math.round((row._count.state / totalReports) * 1000) / 10 : 0
    }));

    // By severity
    const bySeverityCounts = await this.prisma.incident.groupBy({
      by: ['severity'],
      where: incidentWhere,
      _count: { severity: true }
    });
    const bySeverity = bySeverityCounts
      .filter((row) => row.severity !== null)
      .map((row) => ({
        severity: row.severity as string,
        count: row._count.severity,
        percentage: totalReports > 0 ? Math.round((row._count.severity / totalReports) * 1000) / 10 : 0
      }));

    // By event
    const byEventCounts = await this.prisma.incident.groupBy({
      by: ['eventId'],
      where: incidentWhere,
      _count: { eventId: true }
    });
    const eventIds = byEventCounts.map((row) => row.eventId);
    const events = eventIds.length > 0
      ? await this.prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true, slug: true } })
      : [];
    const byEvent = byEventCounts.map((row) => {
      const event = events.find((e) => e.id === row.eventId);
      return { eventName: event?.name || 'Event', eventSlug: event?.slug || '', count: row._count.eventId };
    });

    // Monthly trends (client-side bucketing)
    const incidentsForTrends = await this.prisma.incident.findMany({
      where: incidentWhere,
      select: { createdAt: true, resolvedAt: true }
    });
    const trendsMap: Record<string, { count: number; resolved: number }> = {};
    incidentsForTrends.forEach((i) => {
      if (!i.createdAt) return;
      const createdAtDate = new Date(i.createdAt as any);
      if (isNaN(createdAtDate.getTime())) return;
      const monthKey = `${createdAtDate.getUTCFullYear()}-${String(createdAtDate.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!trendsMap[monthKey]) trendsMap[monthKey] = { count: 0, resolved: 0 };
      trendsMap[monthKey].count += 1;
      if (i.resolvedAt) trendsMap[monthKey].resolved += 1;
    });
    const monthlyTrends = Object.entries(trendsMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, count: v.count, resolved: v.resolved }));

    // Recent reports (last 10)
    const recent = await this.prisma.incident.findMany({
      where: incidentWhere,
      include: { event: { select: { name: true } }, assignedResponder: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    const recentReports = recent.map((r) => {
      const createdDate = r.createdAt ? new Date(r.createdAt as any) : null;
      const submittedAt = createdDate && !isNaN(createdDate.getTime()) ? createdDate.toISOString() : '';
      return {
        id: r.id,
        title: r.title,
        status: r.state,
        severity: r.severity,
        eventName: r.event?.name || 'Event',
        submittedAt,
        assignedTo: r.assignedResponder?.name || undefined
      };
    });

    return {
      metrics: {
        totalReports,
        pendingReports,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        escalatedReports
      },
      byStatus,
      bySeverity,
      byEvent,
      monthlyTrends,
      recentReports
    };
  }

  async getOrganizationEventsSummary(organizationId: string): Promise<OrganizationEventsSummaryResponse> {
    const events = await this.prisma.event.findMany({
      where: { organizationId },
      select: { id: true, name: true, slug: true, isActive: true }
    });

    const eventIds = events.map((e) => e.id);
    const countsByEvent = eventIds.length > 0
      ? await this.prisma.incident.groupBy({ by: ['eventId'], where: { eventId: { in: eventIds } }, _count: { eventId: true } })
      : [];
    // In test mock, userRole may not implement count; approximate with findMany length
    const teamSizes = await Promise.all(events.map(async (e) => {
      const roles = await (this.prisma as any).userRole.findMany({ where: { scopeType: 'event', scopeId: e.id } });
      const count = Array.isArray(roles) ? roles.length : 0;
      return { eventId: e.id, teamSize: count };
    }));

    const summaryEvents = events.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      isActive: e.isActive,
      reportCount: countsByEvent.find((c) => c.eventId === e.id)?._count.eventId || 0,
      teamSize: teamSizes.find((t) => t.eventId === e.id)?.teamSize || 0
    }));

    return {
      totalEvents: summaryEvents.length,
      activeEvents: summaryEvents.filter((e) => e.isActive).length,
      events: summaryEvents
    };
  }

  async exportOrganizationIncidentsCsv(filters: OrganizationAnalyticsFilters, baseUrl: string): Promise<{ filename: string; contentType: string; body: string }> {
    const { organizationId, timeRange = '30d', eventId, status, severity } = filters;
    const { startDate, endDate } = this.getDateRange(timeRange);
    const where: any = { event: { organizationId } };
    if (startDate) where.createdAt = { gte: startDate, lte: endDate };
    if (eventId) where.eventId = eventId;
    if (status) where.state = status;
    if (severity) where.severity = severity;

    const incidents = await this.prisma.incident.findMany({
      where,
      include: { event: { select: { slug: true, name: true } }, reporter: { select: { name: true } }, assignedResponder: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    const header = 'ID,Title,Status,Severity,Event,Reporter,Assigned,Created,Description,URL\n';
    const rows = incidents.map((i) => {
      const url = `${baseUrl}/events/${i.event?.slug || ''}/incidents/${i.id}`;
      const createdDate = i.createdAt ? new Date(i.createdAt as any) : null;
      const createdStr = createdDate && !isNaN(createdDate.getTime()) ? createdDate.toISOString().split('T')[0] : '';
      const fields = [
        i.id,
        `"${(i.title || '').replace(/"/g, '""')}"`,
        i.state,
        i.severity || '',
        i.event?.name || '',
        i.reporter?.name || '',
        i.assignedResponder?.name || '',
        createdStr,
        `"${(i.description || '').replace(/"/g, '""')}"`,
        url
      ];
      return fields.join(',');
    }).join('\n');

    const csv = header + rows;
    const filename = `org_reports_${new Date().toISOString().split('T')[0]}.csv`;
    return { filename, contentType: 'text/csv; charset=utf-8', body: csv };
  }

  async exportOrganizationIncidentsPdfText(filters: OrganizationAnalyticsFilters, baseUrl: string): Promise<{ filename: string; contentType: string; body: string }> {
    const { organizationId, timeRange = '30d', eventId, status, severity } = filters;
    const { startDate, endDate } = this.getDateRange(timeRange);
    const where: any = { event: { organizationId } };
    if (startDate) where.createdAt = { gte: startDate, lte: endDate };
    if (eventId) where.eventId = eventId;
    if (status) where.state = status;
    if (severity) where.severity = severity;

    const incidents = await this.prisma.incident.findMany({
      where,
      include: { event: { select: { slug: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    let content = `Organization Incidents Export\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    incidents.forEach((i) => {
      const createdDate = i.createdAt ? new Date(i.createdAt as any) : null;
      const createdStr = createdDate && !isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString() : '';
      content += `ID: ${i.id}\n`;
      content += `Title: ${i.title}\n`;
      content += `Status: ${i.state}\n`;
      content += `Severity: ${i.severity || 'N/A'}\n`;
      content += `Event: ${i.event?.name || ''}\n`;
      content += `Created: ${createdStr}\n`;
      content += `URL: ${baseUrl}/events/${i.event?.slug || ''}/incidents/${i.id}\n`;
      content += `\n---\n\n`;
    });

    const filename = `org_reports_${new Date().toISOString().split('T')[0]}.txt`;
    return { filename, contentType: 'text/plain; charset=utf-8', body: content };
  }

  private getDateRange(timeRange: TimeRangeParam): { startDate: Date | null; endDate: Date } {
    const endDate = new Date();
    if (timeRange === 'all') return { startDate: null, endDate };
    const startDate = new Date(endDate);
    if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
    else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);
    else if (timeRange === '1y') startDate.setFullYear(endDate.getFullYear() - 1);
    else startDate.setDate(endDate.getDate() - 30);
    return { startDate, endDate };
  }
}



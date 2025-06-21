import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Download,
  BarChart3,
  PieChart
} from 'lucide-react';
import { UserContext } from '../../../_app';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportMetrics {
  totalReports: number;
  reportsByStatus: Record<string, number>;
  reportsBySeverity: Record<string, number>;
  reportsByEvent: Array<{
    eventName: string;
    eventSlug: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    resolved: number;
  }>;
  averageResolutionTime: number;
  pendingReports: number;
  escalatedReports: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function OrganizationReports() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const { orgSlug } = router.query;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (orgSlug && user) {
      fetchOrganizationData();
      fetchReportMetrics();
    }
  }, [orgSlug, user, timeRange]);

  const fetchOrganizationData = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/slug/${orgSlug}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      setOrganization({
        id: data.organization.id,
        name: data.organization.name,
        slug: data.organization.slug,
        role: data.userRole || 'org_viewer',
      });
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization');
    }
  };

  const fetchReportMetrics = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API call when backend endpoint is ready
      // For now, use mock data that demonstrates the functionality
      const mockMetrics: ReportMetrics = {
        totalReports: 147,
        reportsByStatus: {
          'submitted': 23,
          'in_review': 18,
          'investigating': 12,
          'resolved': 78,
          'closed': 16,
        },
        reportsBySeverity: {
          'low': 45,
          'medium': 67,
          'high': 28,
          'urgent': 7,
        },
        reportsByEvent: [
          { eventName: 'DevConf Berlin 2025', eventSlug: 'devconf-berlin-2025', count: 45, trend: 'up' },
          { eventName: 'PyCon Portland 2025', eventSlug: 'pycon-portland-2025', count: 32, trend: 'stable' },
          { eventName: 'JSConf Austin 2025', eventSlug: 'jsconf-austin-2025', count: 28, trend: 'down' },
          { eventName: 'ReactConf NYC 2024', eventSlug: 'reactconf-nyc-2024', count: 42, trend: 'stable' },
        ],
        monthlyTrends: [
          { month: 'Oct 2024', count: 23, resolved: 18 },
          { month: 'Nov 2024', count: 31, resolved: 25 },
          { month: 'Dec 2024', count: 28, resolved: 22 },
          { month: 'Jan 2025', count: 35, resolved: 28 },
          { month: 'Feb 2025', count: 30, resolved: 27 },
        ],
        averageResolutionTime: 4.2,
        pendingReports: 53,
        escalatedReports: 7,
      };

      setMetrics(mockMetrics);
    } catch (err) {
      console.error('Error fetching report metrics:', err);
      setError('Failed to load report metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      // TODO: Implement actual export functionality
      console.log(`Exporting reports as ${format} for organization ${orgSlug}`);
      // This would call an API endpoint to generate and download the export
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'investigating': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500 dark:text-red-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'stable': return <span className="w-4 h-4 text-gray-500 dark:text-gray-400">—</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Organization Reports</h1>
            <p className="text-muted-foreground">Loading report analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Organization Reports</h1>
          </div>
          <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!organization || !metrics) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Organization not found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{organization.name} - Reports Overview - Conducky</title>
      </Head>

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports Overview</h1>
              <p className="text-muted-foreground">
                Analytics and insights for {organization.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalReports}</div>
                <p className="text-xs text-muted-foreground">
                  Across all events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.pendingReports}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageResolutionTime} days</div>
                <p className="text-xs text-muted-foreground">
                  Organization average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalated Reports</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.escalatedReports}</div>
                <p className="text-xs text-muted-foreground">
                  Requiring attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reports by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Reports by Status
                </CardTitle>
                <CardDescription>Distribution of report statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.reportsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(status)}>
                          {status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">{count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reports by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Reports by Severity
                </CardTitle>
                <CardDescription>Severity distribution across reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.reportsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(severity)}>
                          {severity}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">{count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reports by Event */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Reports by Event
              </CardTitle>
              <CardDescription>Report distribution across organization events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.reportsByEvent.map((event) => (
                  <div key={event.eventSlug} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-medium">{event.eventName}</h4>
                        <p className="text-sm text-muted-foreground">{event.eventSlug}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="font-medium">{event.count} reports</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {getTrendIcon(event.trend)}
                          <span className="ml-1">
                            {event.trend === 'up' ? 'Increasing' : 
                             event.trend === 'down' ? 'Decreasing' : 'Stable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Monthly Trends
              </CardTitle>
              <CardDescription>Report submission and resolution trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.monthlyTrends.map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{month.month}</div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-blue-600 dark:text-blue-400">{month.count}</div>
                        <div className="text-muted-foreground">Submitted</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600 dark:text-green-400">{month.resolved}</div>
                        <div className="text-muted-foreground">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-orange-600 dark:text-orange-400">{month.count - month.resolved}</div>
                        <div className="text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance and Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance and Export</CardTitle>
              <CardDescription>
                Export data for compliance reporting and external analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All Reports (CSV)
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  Summary Report (PDF)
                </Button>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Compliance Report (Coming Soon)
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                All exports include anonymized data and comply with privacy regulations.
                Detailed reports are available to organization administrators only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 
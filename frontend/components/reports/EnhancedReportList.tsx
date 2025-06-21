import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Pin, 
  PinOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SortAsc,
  SortDesc,
  Eye,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  state: string;
  severity?: string;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
  assignedResponder?: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    comments: number;
  };
  userRoles: string[];
}

interface ReportStats {
  submitted: number;
  acknowledged: number;
  investigating: number;
  resolved: number;
  closed: number;
  total: number;
}

interface EnhancedReportListProps {
  eventSlug?: string; // If provided, shows event-specific reports
  userId?: string; // If provided, filters to user's reports
  showBulkActions?: boolean;
  showPinning?: boolean;
  showExport?: boolean;
  className?: string;
}

export function EnhancedReportList({
  eventSlug,
  userId,
  showBulkActions = true,
  showPinning = true,
  showExport = true,
  className
}: EnhancedReportListProps) {
  
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [pinnedReports, setPinnedReports] = useState<Set<string>>(new Set());
  const [canViewAssignments, setCanViewAssignments] = useState(false);
  
  // Filter and search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const pageSize = 20; // Fixed page size for now

  // Build API URL based on context
  const apiUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    if (eventSlug) {
      return `${baseUrl}/api/events/slug/${eventSlug}/reports`;
    } else {
      return `${baseUrl}/api/users/me/reports`;
    }
  }, [eventSlug]);

  // Build query parameters
  const buildQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', pageSize.toString());
    params.set('includeStats', 'true');
    
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (severityFilter && severityFilter !== 'all') params.set('severity', severityFilter);
    if (assignedFilter && assignedFilter !== 'all') params.set('assigned', assignedFilter);
    if (userId) params.set('userId', userId);
    if (sortField) {
      params.set('sort', sortField);
      params.set('order', sortOrder);
    }
    
    return params.toString();
  }, [currentPage, pageSize, search, statusFilter, severityFilter, assignedFilter, userId, sortField, sortOrder]);

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${apiUrl}?${buildQueryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReports(data.reports || []);
      setStats(data.stats || null);
      setTotalPages(data.totalPages || 1);
      setTotalReports(data.total || 0);
      setCanViewAssignments(data.canViewAssignments || false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Load pinned reports from localStorage
  useEffect(() => {
    const key = eventSlug ? `pinned_reports_${eventSlug}` : 'pinned_reports_global';
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setPinnedReports(new Set(JSON.parse(stored)));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [eventSlug]);

  // Save pinned reports to localStorage
  useEffect(() => {
    const key = eventSlug ? `pinned_reports_${eventSlug}` : 'pinned_reports_global';
    localStorage.setItem(key, JSON.stringify(Array.from(pinnedReports)));
  }, [pinnedReports, eventSlug]);

  // Fetch reports when dependencies change
  useEffect(() => {
    fetchReports();
  }, [buildQueryParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, severityFilter, assignedFilter, sortField, sortOrder]);

  // Clear assignment filter if user doesn't have permission to view assignments
  useEffect(() => {
    if (!canViewAssignments && assignedFilter !== 'all') {
      setAssignedFilter('all');
    }
  }, [canViewAssignments, assignedFilter]);

  // Handle pinning
  const togglePin = (reportId: string) => {
    setPinnedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  // Handle selection
  const toggleSelection = (reportId: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedReports(new Set());
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const selectedIds = Array.from(selectedReports);
      const exportUrl = `${apiUrl}/export?format=${format}${selectedIds.length ? `&ids=${selectedIds.join(',')}` : ''}`;
      
      const response = await fetch(exportUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Separate pinned and regular reports
  const { pinnedReportsList, regularReportsList } = useMemo(() => {
    const pinned = reports.filter(report => pinnedReports.has(report.id));
    const regular = reports.filter(report => !pinnedReports.has(report.id));
    return { pinnedReportsList: pinned, regularReportsList: regular };
  }, [reports, pinnedReports]);

  // Get state badge color
  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'investigating': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get severity badge color
  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.submitted}</p>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.acknowledged}</p>
                <p className="text-xs text-muted-foreground">Acknowledged</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.investigating}</p>
                <p className="text-xs text-muted-foreground">Investigating</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.closed}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {canViewAssignments && (
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSeverityFilter('all');
                setAssignedFilter('all');
                setSortField('createdAt');
                setSortOrder('desc');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>

            <Button variant="outline" onClick={fetchReports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Bulk Actions */}
          {showBulkActions && selectedReports.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedReports.size} report{selectedReports.size === 1 ? '' : 's'} selected
              </span>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear Selection
              </Button>
              <Button size="sm" variant="outline">
                Bulk Assign
              </Button>
              <Button size="sm" variant="outline">
                Change Status
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Reports Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Pinned Reports Section */}
            {showPinning && pinnedReportsList.length > 0 && (
              <div className="border-b">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center">
                    <Pin className="h-4 w-4 mr-2" />
                    Pinned Reports ({pinnedReportsList.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {showBulkActions && <TableHead className="w-12"></TableHead>}
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                          <div className="flex items-center">
                            Title
                            {sortField === 'title' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                          <div className="flex items-center">
                            Status
                            {sortField === 'state' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Severity</TableHead>
                        {canViewAssignments && <TableHead>Assigned</TableHead>}
                        <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                          <div className="flex items-center">
                            Created
                            {sortField === 'createdAt' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pinnedReportsList.map((report) => (
                        <TableRow key={report.id} className="bg-yellow-50/50 dark:bg-yellow-900/10">
                          {showBulkActions && (
                            <TableCell>
                              <Checkbox
                                checked={selectedReports.has(report.id)}
                                onCheckedChange={() => toggleSelection(report.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Pin className="h-4 w-4 text-yellow-600" />
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/events/${eventSlug || report.event.slug}/reports/${report.id}`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                            >
                              {report.title}
                            </Link>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {report.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStateBadgeColor(report.state)}>
                              {report.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.severity && (
                              <Badge className={getSeverityBadgeColor(report.severity)}>
                                {report.severity}
                              </Badge>
                            )}
                          </TableCell>
                          {canViewAssignments && (
                            <TableCell>
                              {report.assignedResponder ? (
                                <span className="text-sm">{report.assignedResponder.name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unassigned</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => togglePin(report.id)}>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  Unpin Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Regular Reports Section */}
            <div className="overflow-x-auto">
              <Table>
                {(pinnedReportsList.length === 0 || !showPinning) && (
                  <TableHeader>
                    <TableRow>
                      {showBulkActions && <TableHead className="w-12"></TableHead>}
                      {showPinning && <TableHead className="w-12"></TableHead>}
                      <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                        <div className="flex items-center">
                          Title
                          {sortField === 'title' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                        <div className="flex items-center">
                          Status
                          {sortField === 'state' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Severity</TableHead>
                      {canViewAssignments && <TableHead>Assigned</TableHead>}
                      <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center">
                          Created
                          {sortField === 'createdAt' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {regularReportsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={
                        (showBulkActions ? 1 : 0) + 
                        (showPinning ? 1 : 0) + 
                        5 + // Title, Type, Status, Severity, Created
                        (canViewAssignments ? 1 : 0) + 
                        1 // Actions column
                      } className="text-center py-8">
                        <div className="text-muted-foreground">
                          {search || statusFilter || severityFilter || assignedFilter ? 
                            'No reports match your search criteria.' : 
                            'No reports found.'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    regularReportsList.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/50">
                        {showBulkActions && (
                          <TableCell>
                            <Checkbox
                              checked={selectedReports.has(report.id)}
                              onCheckedChange={() => toggleSelection(report.id)}
                            />
                          </TableCell>
                        )}
                        {showPinning && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePin(report.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Pin className="h-4 w-4 text-muted-foreground hover:text-yellow-600" />
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <Link 
                            href={`/events/${eventSlug || report.event.slug}/reports/${report.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                          >
                            {report.title}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {report.description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStateBadgeColor(report.state)}>
                            {report.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.severity && (
                            <Badge className={getSeverityBadgeColor(report.severity)}>
                              {report.severity}
                            </Badge>
                          )}
                        </TableCell>
                        {canViewAssignments && (
                          <TableCell>
                            {report.assignedResponder ? (
                              <span className="text-sm">{report.assignedResponder.name}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => togglePin(report.id)}>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalReports)} of {totalReports} reports
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
} 
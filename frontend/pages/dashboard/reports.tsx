import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, Eye, FileText, Users, Calendar, AlertCircle, UserPlus, CheckCircle, Clock, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Report {
  id: string;
  title: string;
  description: string;
  state: string;
  severity?: string;
  type: string;
  incidentAt?: string;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    slug: string;
  };
  reporter: {
    id: string;
    name: string;
    email: string;
  } | null;
  assignedResponder: {
    id: string;
    name: string;
    email: string;
  } | null;
  evidenceFiles: Array<{
    id: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;
  _count: {
    comments: number;
  };
  userRoles: string[];
}

interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  roles: string[];
}

const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  acknowledged: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  investigating: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function CrossEventReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [actionLoading, setActionLoading] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Fetch user's events for filter dropdown
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users/me/events`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  // Fetch reports with current filters
  const fetchReports = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortOrder,
      });

      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (eventFilter) params.append('event', eventFilter);
      if (assignedFilter) params.append('assigned', assignedFilter);

      const response = await fetch(`${apiUrl}/api/users/me/reports?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data: ReportsResponse = await response.json();
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { 
      credentials: 'include' 
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [currentPage, search, statusFilter, eventFilter, assignedFilter, sortField, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [search, statusFilter, eventFilter, assignedFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Quick action handlers
  const handleAssignToMe = async (report: Report) => {
    if (!user) return;
    
    setActionLoading(report.id);
    setActionError('');
    
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + 
        `/events/slug/${report.event.slug}/reports/${report.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ assignedResponderId: user.id }),
        }
      );
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'Failed to assign report');
        return;
      }
      
      // Refresh reports to show updated assignment
      await fetchReports();
    } catch {
      setActionError('Network error');
    } finally {
      setActionLoading('');
    }
  };

  const handleStatusChange = async (report: Report, newStatus: string) => {
    setActionLoading(report.id);
    setActionError('');
    
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + 
        `/events/slug/${report.event.slug}/reports/${report.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ state: newStatus }),
        }
      );
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'Failed to update status');
        return;
      }
      
      // Refresh reports to show updated status
      await fetchReports();
    } catch {
      setActionError('Network error');
    } finally {
      setActionLoading('');
    }
  };

  // Check if user can perform actions on a report
  const canAssign = (report: Report) => {
    return report.userRoles.some(role => ['responder', 'admin'].includes(role.toLowerCase()));
  };

  const canChangeStatus = (report: Report) => {
    return report.userRoles.some(role => ['responder', 'admin'].includes(role.toLowerCase()));
  };

  // Get available status transitions
  const getStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      'submitted': ['acknowledged', 'investigating'],
      'acknowledged': ['investigating', 'resolved'],
      'investigating': ['resolved', 'closed'],
      'resolved': ['closed'],
      'closed': []
    };
    return transitions[currentStatus] || [];
  };

  // Mobile card view component
  const ReportCard = ({ report }: { report: Report }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {report.event.name}
              </Badge>
              <Badge className={`text-xs ${STATUS_COLORS[report.state as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                {report.state}
              </Badge>
              {report.severity && (
                <Badge className={`text-xs ${SEVERITY_COLORS[report.severity as keyof typeof SEVERITY_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                  {report.severity}
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-sm mb-1 line-clamp-2">{report.title}</h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{report.description}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {report.reporter?.name || 'Anonymous'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(report.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {report.evidenceFiles.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {report.evidenceFiles.length} file{report.evidenceFiles.length !== 1 ? 's' : ''}
              </span>
            )}
            {report._count.comments > 0 && (
              <span>{report._count.comments} comment{report._count.comments !== 1 ? 's' : ''}</span>
            )}
            {report.assignedResponder && (
              <span>Assigned to {report.assignedResponder.name}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Link href={`/events/${report.event.slug}/reports/${report.id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            </Link>
            
            {/* Quick Actions Dropdown */}
            {(canAssign(report) || canChangeStatus(report)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 w-7 p-0"
                    disabled={actionLoading === report.id}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canAssign(report) && !report.assignedResponder && (
                    <DropdownMenuItem onClick={() => handleAssignToMe(report)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign to Me
                    </DropdownMenuItem>
                  )}
                  {canChangeStatus(report) && getStatusTransitions(report.state).map(status => (
                    <DropdownMenuItem key={status} onClick={() => handleStatusChange(report, status)}>
                      {status === 'acknowledged' && <CheckCircle className="w-4 h-4 mr-2" />}
                      {status === 'investigating' && <Clock className="w-4 h-4 mr-2" />}
                      {status === 'resolved' && <CheckCircle className="w-4 h-4 mr-2" />}
                      {status === 'closed' && <CheckCircle className="w-4 h-4 mr-2" />}
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
        <div className="w-full max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">All Reports</h1>
            <p className="text-muted-foreground">Reports across all your events</p>
          </div>
          
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">All Reports</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `${total} report${total !== 1 ? 's' : ''} across ${events.length} event${events.length !== 1 ? 's' : ''}` : 'No reports found'}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Event Filter */}
              <Select value={eventFilter || "all"} onValueChange={(value) => setEventFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.slug}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignment Filter */}
              <Select value={assignedFilter || "all"} onValueChange={(value) => setAssignedFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {(error || actionError) && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error || actionError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                    Title {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                    Status {sortField === 'state' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                    Created {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No reports found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm line-clamp-1">{report.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{report.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {report.evidenceFiles.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {report.evidenceFiles.length}
                              </span>
                            )}
                            {report._count.comments > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {report._count.comments} comment{report._count.comments !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {report.event.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs w-fit ${STATUS_COLORS[report.state as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                            {report.state}
                          </Badge>
                          {report.severity && (
                            <Badge className={`text-xs w-fit ${SEVERITY_COLORS[report.severity as keyof typeof SEVERITY_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                              {report.severity}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.reporter?.name || 'Anonymous'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.assignedResponder?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(report.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/events/${report.event.slug}/reports/${report.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          
                          {/* Quick Actions Dropdown */}
                          {(canAssign(report) || canChangeStatus(report)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-8 h-8 p-0"
                                  disabled={actionLoading === report.id}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canAssign(report) && !report.assignedResponder && (
                                  <DropdownMenuItem onClick={() => handleAssignToMe(report)}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Assign to Me
                                  </DropdownMenuItem>
                                )}
                                {canChangeStatus(report) && getStatusTransitions(report.state).map(status => (
                                  <DropdownMenuItem key={status} onClick={() => handleStatusChange(report, status)}>
                                    {status === 'acknowledged' && <CheckCircle className="w-4 h-4 mr-2" />}
                                    {status === 'investigating' && <Clock className="w-4 h-4 mr-2" />}
                                    {status === 'resolved' && <CheckCircle className="w-4 h-4 mr-2" />}
                                    {status === 'closed' && <CheckCircle className="w-4 h-4 mr-2" />}
                                    Mark as {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  No reports found. Try adjusting your filters.
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} reports
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
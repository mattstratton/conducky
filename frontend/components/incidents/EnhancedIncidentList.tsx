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
  XCircle,
  Tag as TagIcon,
  X
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  tags?: Tag[];
  state: string;
  severity?: string;
  createdAt: string;
  updatedAt: string;
  incidentAt?: string;
  location?: string;
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
  evidenceFiles?: Array<{
    id: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;
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

interface EnhancedIncidentListProps {
  eventSlug?: string; // If provided, shows event-specific reports
  userId?: string; // If provided, filters to user's reports
  showBulkActions?: boolean;
  showPinning?: boolean;
  showExport?: boolean;
  className?: string;
  userRoles?: string[]; // Add userRoles prop for role-based visibility
}

export function EnhancedIncidentList({
  eventSlug,
  userId,
  showBulkActions = true,
  showPinning = true,
  showExport = true,
  className,
  userRoles = []
}: EnhancedIncidentListProps) {
  
  // State management
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [pinnedIncidents, setPinnedIncidents] = useState<Set<string>>(new Set());
  const [canViewAssignments, setCanViewAssignments] = useState(false);
  
  // Filter and search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const pageSize = 20; // Fixed page size for now

  // Determine user permissions
  const isReporter = userRoles.includes('reporter') && !userRoles.some(r => ['responder', 'event_admin', 'system_admin'].includes(r));
  
  // Determine if this is the global dashboard (no specific event)
  const isGlobalDashboard = !eventSlug;
  
  // Column visibility logic
  const showTagsColumn = !isGlobalDashboard && !isReporter; // Only show on event pages for responders+
  const showSeverityColumn = !isGlobalDashboard && !isReporter; // Only show on event pages for responders+

  // Build API URL based on context
  const apiUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    if (eventSlug) {
      return `${baseUrl}/api/events/slug/${eventSlug}/incidents`;
    } else {
      return `${baseUrl}/api/users/me/incidents`;
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
    if (tagFilter && tagFilter.length > 0) params.set('tags', tagFilter.join(','));
    if (userId) params.set('userId', userId);
    if (sortField) {
      params.set('sort', sortField);
      params.set('order', sortOrder);
    }
    
    return params.toString();
  }, [currentPage, pageSize, search, statusFilter, severityFilter, assignedFilter, tagFilter, userId, sortField, sortOrder]);

  // Fetch available tags for filtering (only for event-specific lists and responders+)
  const fetchAvailableTags = async () => {
    if (!eventSlug || isReporter) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/tags/event/slug/${eventSlug}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      // Silently fail for tags, don't block incident loading
      console.warn('Failed to fetch available tags:', err);
    }
  };

  // Fetch reports
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${apiUrl}?${buildQueryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.statusText}`);
      }
      
      const data = await response.json();
      setIncidents(data.incidents || []);
      setStats(data.stats || null);
      setTotalPages(data.totalPages || 1);
      setTotalIncidents(data.total || 0);
      setCanViewAssignments(data.canViewAssignments || false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Hydrate pinned from server for authenticated users; fallback to localStorage if unauthenticated
  useEffect(() => {
    const hydrate = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const url = new URL(baseUrl + '/api/users/me/pins');
        if (eventSlug) url.searchParams.set('eventId', String(eventSlug));
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.incidentIds)) {
            setPinnedIncidents(new Set<string>(data.incidentIds));
            return;
          }
        }
        // Fallback to localStorage if not authed or error
        const key = eventSlug ? `pinned_reports_${eventSlug}` : 'pinned_reports_global';
        const stored = localStorage.getItem(key);
        if (stored) setPinnedIncidents(new Set(JSON.parse(stored)));
      } catch {
        const key = eventSlug ? `pinned_reports_${eventSlug}` : 'pinned_reports_global';
        const stored = localStorage.getItem(key);
        if (stored) setPinnedIncidents(new Set(JSON.parse(stored)));
      }
    };
    hydrate();
  }, [eventSlug]);

  // Persist to localStorage for quick UX and offline support
  useEffect(() => {
    const key = eventSlug ? `pinned_reports_${eventSlug}` : 'pinned_reports_global';
    localStorage.setItem(key, JSON.stringify(Array.from(pinnedIncidents)));
  }, [pinnedIncidents, eventSlug]);

  // Fetch available tags when component mounts
  useEffect(() => {
    fetchAvailableTags();
  }, [eventSlug]);

  // Fetch reports when dependencies change
  useEffect(() => {
    fetchIncidents();
  }, [buildQueryParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, severityFilter, assignedFilter, tagFilter, sortField, sortOrder]);

  // Clear assignment filter if user doesn't have permission to view assignments
  useEffect(() => {
    if (!canViewAssignments && assignedFilter !== 'all') {
      setAssignedFilter('all');
    }
  }, [canViewAssignments, assignedFilter]);

  // Handle pinning
  const togglePin = async (incidentId: string) => {
    // optimistic update
    setPinnedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(incidentId)) next.delete(incidentId); else next.add(incidentId);
      return next;
    });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const isPinned = pinnedIncidents.has(incidentId);
      if (isPinned) {
        // currently pinned → request unpin
        const res = await fetch(baseUrl + `/api/users/me/pins/${incidentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Unpin failed');
      } else {
        // currently unpinned → request pin
        type IncidentItem = { id: string; eventId?: string; event?: { id?: string } };
        const matched = incidents.find((i) => i.id === incidentId) as IncidentItem | undefined;
        const eventId = matched?.eventId || matched?.event?.id || '';
        const res = await fetch(baseUrl + '/api/users/me/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ incidentId, eventId })
        });
        if (!res.ok) throw new Error('Pin failed');
      }
    } catch {
      // rollback on error
      setPinnedIncidents(prev => {
        const next = new Set(prev);
        if (next.has(incidentId)) next.delete(incidentId); else next.add(incidentId);
        return next;
      });
    }
  };

  // Handle selection
  const toggleSelection = (incidentId: string) => {
    setSelectedIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(incidentId)) {
        newSet.delete(incidentId);
      } else {
        newSet.add(incidentId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedIncidents(new Set());
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
      const selectedIds = Array.from(selectedIncidents);
      const reportsToExport = selectedIds.length > 0 
        ? incidents.filter(incident => selectedIds.includes(incident.id))
        : incidents;
      
      if (format === 'csv') {
        // Use backend CSV export
        const exportUrl = `${apiUrl}/export?format=csv${selectedIds.length ? `&ids=${selectedIds.join(',')}` : ''}`;
        
        const response = await fetch(exportUrl, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('CSV export failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
      } else if (format === 'pdf') {
        // Generate PDF client-side using jsPDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 6;
        let yPosition = margin;
        
        // Add title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const title = eventSlug ? `Event Incidents - ${eventSlug}` : 'Incidents Export';
        doc.text(title, margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Add generation date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Add summary
        doc.text(`Total Incidents: ${reportsToExport.length}`, margin, yPosition);
        yPosition += lineHeight * 1.5;
        
        // Add line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += lineHeight;
        
        // Add each report
        reportsToExport.forEach((report, index) => {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }
          
          // Report header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${report.title}`, margin, yPosition);
          yPosition += lineHeight;
          
          // Report details
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          
          doc.text(`ID: ${report.id}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          
          // Tags
          if (report.tags && report.tags.length > 0) {
            doc.text(`Tags: ${report.tags.map(tag => tag.name).join(', ')}`, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          }
          
          doc.text(`Status: ${report.state}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          
          if (report.severity) {
            doc.text(`Severity: ${report.severity}`, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          }
          
          if (report.reporter?.name) {
            doc.text(`Reporter: ${report.reporter.name}`, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          }
          
          if (report.assignedResponder?.name) {
            doc.text(`Assigned: ${report.assignedResponder.name}`, margin + 5, yPosition);
            yPosition += lineHeight * 0.8;
          }
          
          doc.text(`Created: ${new Date(report.createdAt).toLocaleString()}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          
          // Add report URL
          const reportUrl = `${window.location.origin}/events/${eventSlug || report.event.slug}/incidents/${report.id}`;
          doc.text(`URL: ${reportUrl}`, margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          
          // Description (with text wrapping)
          doc.text('Description:', margin + 5, yPosition);
          yPosition += lineHeight * 0.8;
          
          const splitDescription = doc.splitTextToSize(report.description, pageWidth - margin * 2 - 10);
          doc.text(splitDescription, margin + 10, yPosition);
          yPosition += lineHeight * 0.8 * splitDescription.length;
          
          // Add spacing between reports
          yPosition += lineHeight;
          
          // Add separator line
          if (index < reportsToExport.length - 1) {
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += lineHeight * 0.5;
          }
        });
        
        // Save the PDF
        const filename = `reports_${eventSlug || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Separate pinned and regular reports
  const { pinnedIncidentsList, regularIncidentsList } = useMemo(() => {
    const pinned = incidents.filter(incident => pinnedIncidents.has(incident.id));
    const regular = incidents.filter(incident => !pinnedIncidents.has(incident.id));
    return { pinnedIncidentsList: pinned, regularIncidentsList: regular };
  }, [incidents, pinnedIncidents]);

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
              placeholder="Search incidents by title or description..."
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
                  <SelectItem value="all">All Incidents</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Tag Filter */}
            {showTagsColumn && availableTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[120px]">
                    <TagIcon className="h-4 w-4 mr-2" />
                    Tags
                    {tagFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                        {tagFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px]">
                  {availableTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={(e) => {
                        e.preventDefault();
                        const isSelected = tagFilter.includes(tag.id);
                        if (isSelected) {
                          setTagFilter(tagFilter.filter(id => id !== tag.id));
                        } else {
                          setTagFilter([...tagFilter, tag.id]);
                        }
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                      {tagFilter.includes(tag.id) && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Active tag filters display */}
            {showTagsColumn && tagFilter.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tagFilter.map((tagId) => {
                  const tag = availableTags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="flex items-center gap-1"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => setTagFilter(tagFilter.filter(id => id !== tagId))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSeverityFilter('all');
                setAssignedFilter('all');
                setTagFilter([]);
                setSortField('createdAt');
                setSortOrder('desc');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>

            <Button variant="outline" onClick={fetchIncidents}>
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
          {showBulkActions && selectedIncidents.size > 0 && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedIncidents.size} report{selectedIncidents.size === 1 ? '' : 's'} selected
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

      {/* Incidents Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading incidents...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Pinned Incidents Section */}
            {showPinning && pinnedIncidentsList.length > 0 && (
              <div className="border-b">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center">
                    <Pin className="h-4 w-4 mr-2" />
                    Pinned Incidents ({pinnedIncidentsList.length})
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
                        {showTagsColumn && <TableHead>Tags</TableHead>}
                        <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                          <div className="flex items-center">
                            Status
                            {sortField === 'state' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        {showSeverityColumn && <TableHead>Severity</TableHead>}
                        <TableHead>Reporter</TableHead>
                        {canViewAssignments && <TableHead>Assigned</TableHead>}
                        <TableHead>Incident Date</TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                          <div className="flex items-center">
                            Created
                            {sortField === 'createdAt' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('updatedAt')}>
                          <div className="flex items-center">
                            Updated
                            {sortField === 'updatedAt' && (
                              sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pinnedIncidentsList.map((report) => (
                        <TableRow key={report.id} className="bg-yellow-50/50 dark:bg-yellow-900/10">
                          {showBulkActions && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIncidents.has(report.id)}
                                onCheckedChange={() => toggleSelection(report.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePin(report.id)}
                              className="h-8 w-8 p-0"
                              aria-label="Unpin incident"
                              title="Unpin"
                              type="button"
                            >
                              <PinOff className="h-4 w-4 text-yellow-600 hover:text-muted-foreground" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/events/${eventSlug || report.event.slug}/incidents/${report.id}`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                            >
                              {report.title}
                            </Link>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {report.description}
                            </p>
                          </TableCell>
                          {showTagsColumn && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {report.tags?.map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-xs"
                                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                  >
                                    {tag.name}
                                  </Badge>
                                )) || (
                                  <span className="text-xs text-muted-foreground">No tags</span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge className={getStateBadgeColor(report.state)}>
                              {report.state}
                            </Badge>
                          </TableCell>
                          {showSeverityColumn && (
                            <TableCell>
                              {report.severity && (
                                <Badge className={getSeverityBadgeColor(report.severity)}>
                                  {report.severity}
                                </Badge>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {report.reporter?.name}
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
                              {report.incidentAt ? new Date(report.incidentAt).toLocaleDateString() : 'Not specified'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(report.updatedAt).toLocaleDateString()}
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
                                  Unpin Incident
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

            {/* Regular Incidents Section */}
            <div className="overflow-x-auto">
              <Table>
                {(pinnedIncidentsList.length === 0 || !showPinning) && (
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
                      {showTagsColumn && <TableHead>Tags</TableHead>}
                      <TableHead className="cursor-pointer" onClick={() => handleSort('state')}>
                        <div className="flex items-center">
                          Status
                          {sortField === 'state' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      {showSeverityColumn && <TableHead>Severity</TableHead>}
                      <TableHead>Reporter</TableHead>
                      {canViewAssignments && <TableHead>Assigned</TableHead>}
                      <TableHead>Incident Date</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center">
                          Created
                          {sortField === 'createdAt' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('updatedAt')}>
                        <div className="flex items-center">
                          Updated
                          {sortField === 'updatedAt' && (
                            sortOrder === 'asc' ? <SortAsc className="h-4 w-4 ml-1" /> : <SortDesc className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {regularIncidentsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={
                        (showBulkActions ? 1 : 0) + 
                        (showPinning ? 1 : 0) + 
                        6 + // Title, Status, Reporter, Incident Date, Created, Updated
                        (showTagsColumn ? 1 : 0) + // Tags (only for responders+)
                        (showSeverityColumn ? 1 : 0) + // Severity (only for responders+)
                        (canViewAssignments ? 1 : 0) + 
                        1 // Actions column
                      } className="text-center py-8">
                        <div className="text-muted-foreground">
                          {search || statusFilter || severityFilter || assignedFilter ? 
                            'No incidents match your search criteria.' : 
                            'No incidents found.'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    regularIncidentsList.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/50">
                        {showBulkActions && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIncidents.has(report.id)}
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
                              aria-label={pinnedIncidents.has(report.id) ? 'Unpin incident' : 'Pin incident'}
                              title={pinnedIncidents.has(report.id) ? 'Unpin' : 'Pin'}
                            >
                              {pinnedIncidents.has(report.id) ? (
                                <PinOff className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <Pin className="h-4 w-4 text-muted-foreground hover:text-yellow-600" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <Link 
                            href={`/events/${eventSlug || report.event.slug}/incidents/${report.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
                          >
                            {report.title}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {report.description}
                          </p>
                        </TableCell>
                        {showTagsColumn && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {report.tags?.map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="secondary"
                                  className="text-xs"
                                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                >
                                  {tag.name}
                                </Badge>
                              )) || (
                                <span className="text-xs text-muted-foreground">No tags</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={getStateBadgeColor(report.state)}>
                            {report.state}
                          </Badge>
                        </TableCell>
                        {showSeverityColumn && (
                          <TableCell>
                            {report.severity && (
                              <Badge className={getSeverityBadgeColor(report.severity)}>
                                {report.severity}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {report.reporter?.name}
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
                            {report.incidentAt ? new Date(report.incidentAt).toLocaleDateString() : 'Not specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.updatedAt).toLocaleDateString()}
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
                                {pinnedIncidents.has(report.id) ? (
                                  <>
                                    <PinOff className="h-4 w-4 mr-2" />
                                    Unpin Report
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Pin Incident
                                  </>
                                )}
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalIncidents)} of {totalIncidents} incidents
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
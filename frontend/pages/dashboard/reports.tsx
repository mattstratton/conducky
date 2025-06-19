import React from 'react';
import { EnhancedReportList } from '@/components/reports/EnhancedReportList';

export default function CrossEventReports() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 mt-8">
      <h1 className="text-3xl font-bold mb-8">All Reports</h1>
      <EnhancedReportList
        showBulkActions={true}
        showPinning={true}
        showExport={true}
        className="w-full"
      />
    </div>
  );
} 
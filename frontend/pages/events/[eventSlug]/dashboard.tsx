import React from 'react';
import { Card } from '@/components/ui/card';

export default function EventDashboard() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Event Dashboard</h1>
        <p className="text-muted-foreground">Event-specific dashboard is coming soon.</p>
        <p className="text-sm text-muted-foreground mt-2">This will show event overview, recent reports, team activity, and role-based quick actions.</p>
      </Card>
    </div>
  );
} 
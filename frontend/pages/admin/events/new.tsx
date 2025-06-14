import React from 'react';
import { Card } from '@/components/ui/card';

export default function CreateNewEvent() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Create New Event</h1>
        <p className="text-muted-foreground">Event creation form is coming soon.</p>
        <p className="text-sm text-muted-foreground mt-2">This will contain the form to create new events with all required metadata.</p>
      </Card>
    </div>
  );
} 
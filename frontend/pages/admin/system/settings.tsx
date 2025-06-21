import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Settings, Globe } from 'lucide-react';

interface SystemSettings {
  showPublicEventList?: string;
  // Future settings can be added here
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/admin/system/settings',
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || {});
      } else {
        setError('Failed to load system settings');
      }
    } catch (error) {
      setError('Network error loading settings');
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/admin/system/settings',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [key]: value }),
        }
      );

      if (response.ok) {
        setSettings(prev => prev ? { ...prev, [key]: value } : { [key]: value } as SystemSettings);
        setSuccess('Settings updated successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update settings');
      }
    } catch {
      setError('Network error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePublicEventListingToggle = (checked: boolean) => {
    updateSetting('showPublicEventList', checked ? 'true' : 'false');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
        <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading system settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>System Settings - Conducky Admin</title>
      </Head>

      <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences for your Conducky installation.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Public Event Listing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Event Listing
              </CardTitle>
              <CardDescription>
                Control whether unauthenticated users can see all events on the home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="public-event-listing" className="text-sm font-medium">
                    Show Public Event List
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, unauthenticated users will see all events on the home page. 
                    When disabled, only authenticated users can see events.
                  </p>
                </div>
                <Switch
                  id="public-event-listing"
                  checked={settings?.showPublicEventList === 'true'}
                  onCheckedChange={handlePublicEventListingToggle}
                  disabled={saving}
                />
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                <p><strong>Current Status:</strong> {settings?.showPublicEventList === 'true' ? 'Enabled' : 'Disabled'}</p>
                <p className="mt-1">
                  {settings?.showPublicEventList === 'true' 
                    ? 'Visitors to your site will see all events on the home page and can view event details.'
                    : 'Visitors must log in to see and access events. Events are invitation-only.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Future Settings Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>
                More configuration options will be available in future releases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Email configuration and notification settings</p>
                <p>• System backup and maintenance options</p>
                <p>• User registration and authentication settings</p>
                <p>• Advanced security and audit configurations</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Changes are saved automatically when you toggle settings.
                </p>
                <Button 
                  variant="outline" 
                  onClick={fetchSettings}
                  disabled={saving}
                >
                  Refresh Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 
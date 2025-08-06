import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, Bell, Shield, Key } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    security: {
      twoFactor: false,
      sessionTimeout: "30",
    },
    preferences: {
      theme: "light",
      language: "en",
      timezone: "America/New_York",
    },
  });

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully.",
    });
  };

  const handleNotificationChange = (type: string, value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [type]: value,
      },
    });
  };

  const handleSecurityChange = (type: string, value: boolean | string) => {
    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [type]: value,
      },
    });
  };

  const handlePreferenceChange = (type: string, value: string) => {
    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [type]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Notifications Settings */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.notifications.email}
              onCheckedChange={(checked) => handleNotificationChange("email", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-gray-500">Receive browser push notifications</p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.notifications.push}
              onCheckedChange={(checked) => handleNotificationChange("push", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-gray-500">Receive text message notifications</p>
            </div>
            <Switch
              id="sms-notifications"
              checked={settings.notifications.sms}
              onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <Switch
              id="two-factor"
              checked={settings.security.twoFactor}
              onCheckedChange={(checked) => handleSecurityChange("twoFactor", checked)}
            />
          </div>
          <div>
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleSecurityChange("sessionTimeout", e.target.value)}
              className="mt-1 max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Configuration (Admin Only) */}
      {user?.role === "admin" && (
        <Card className="healthcare-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input
                id="organization-name"
                placeholder="Demo Medical Practice"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admin-email">Administrator Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              className="mt-1"
            />
          </div>
          <Button variant="outline">Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
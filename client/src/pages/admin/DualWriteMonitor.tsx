import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertCircle, CheckCircle, Database, Settings, TrendingUp } from 'lucide-react';

interface DualWriteStatus {
  config: {
    enableDualWrite: boolean;
    readFromNewService: boolean;
    writePercentage: number;
    syncMode: 'async' | 'sync';
  };
  metrics: {
    totalWrites: number;
    successfulDualWrites: number;
    failedDualWrites: number;
    newServiceReads: number;
    legacyReads: number;
  };
  serviceStatus: {
    enabled: boolean;
    healthy: boolean;
    url: string;
  };
}

interface MigrationProgress {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: string;
  currentWritePercentage: number;
  dualWriteEnabled: boolean;
  readFromNewService: boolean;
  serviceHealthy: boolean;
}

export default function DualWriteMonitor() {
  const [status, setStatus] = useState<DualWriteStatus | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const [statusRes, progressRes] = await Promise.all([
        fetch('/api/dual-write/status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/dual-write/migration-progress', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (statusRes.ok && progressRes.ok) {
        const statusData = await statusRes.json();
        const progressData = await progressRes.json();
        setStatus(statusData.status);
        setProgress(progressData.progress);
      }
    } catch (error) {
      console.error('Error fetching dual-write status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch migration status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleDualWrite = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchStatus();
        toast({
          title: 'Success',
          description: `Dual-write ${status?.config.enableDualWrite ? 'disabled' : 'enabled'}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle dual-write',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateWritePercentage = async (value: number[]) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ writePercentage: value[0] })
      });

      if (response.ok) {
        await fetchStatus();
        toast({
          title: 'Success',
          description: `Write percentage updated to ${value[0]}%`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update write percentage',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateSyncMode = async (syncMode: 'async' | 'sync') => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncMode })
      });

      if (response.ok) {
        await fetchStatus();
        toast({
          title: 'Success',
          description: `Sync mode updated to ${syncMode}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sync mode',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading migration status...</div>;
  }

  const successRate = progress ? parseFloat(progress.successRate) : 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dual-Write Migration Monitor</h1>
        <p className="text-gray-600 mt-2">
          Monitor and control the gradual migration to Employee Core microservice
        </p>
      </div>

      {/* Service Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Employee Core Service:</span>
                <Badge variant={status?.serviceStatus.healthy ? 'success' : 'destructive'}>
                  {status?.serviceStatus.healthy ? 'Healthy' : 'Unhealthy'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                URL: {status?.serviceStatus.url}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchStatus()}
              disabled={updating}
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Migration Progress
          </CardTitle>
          <CardDescription>
            Track the success rate and progress of the dual-write migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm font-bold">{progress?.successRate || '0%'}</span>
            </div>
            <Progress value={successRate} className="h-3" />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {progress?.successfulOperations || 0}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {progress?.failedOperations || 0}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {progress?.totalOperations || 0}
              </div>
              <div className="text-sm text-gray-600">Total Operations</div>
            </div>
          </div>

          {successRate < 90 && progress?.totalOperations > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Success rate is below 90%. Investigate failures before increasing write percentage.
              </AlertDescription>
            </Alert>
          )}

          {successRate >= 99 && status?.config.writePercentage === 100 && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                All writes are successfully going to Employee Core. Consider enabling read from new service.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Migration Controls
          </CardTitle>
          <CardDescription>
            Control the dual-write pattern configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Dual-Write */}
          <div className="flex items-center justify-between">
            <Label htmlFor="dual-write-toggle" className="flex flex-col">
              <span>Enable Dual-Write</span>
              <span className="text-sm text-gray-600 font-normal">
                Start writing to both systems
              </span>
            </Label>
            <Switch
              id="dual-write-toggle"
              checked={status?.config.enableDualWrite || false}
              onCheckedChange={toggleDualWrite}
              disabled={updating}
            />
          </div>

          {/* Write Percentage Slider */}
          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Write Percentage</span>
              <span className="font-bold">{status?.config.writePercentage || 0}%</span>
            </Label>
            <Slider
              value={[status?.config.writePercentage || 0]}
              onValueCommit={updateWritePercentage}
              max={100}
              step={10}
              disabled={updating || !status?.config.enableDualWrite}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Percentage of write operations sent to Employee Core service
            </p>
          </div>

          {/* Sync Mode */}
          <div className="space-y-2">
            <Label>Sync Mode</Label>
            <div className="flex gap-4">
              <Button
                variant={status?.config.syncMode === 'async' ? 'default' : 'outline'}
                onClick={() => updateSyncMode('async')}
                disabled={updating || !status?.config.enableDualWrite}
                size="sm"
              >
                Async
              </Button>
              <Button
                variant={status?.config.syncMode === 'sync' ? 'default' : 'outline'}
                onClick={() => updateSyncMode('sync')}
                disabled={updating || !status?.config.enableDualWrite}
                size="sm"
              >
                Sync
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              {status?.config.syncMode === 'async' 
                ? 'Writes to new service happen in background (faster)'
                : 'Writes to new service happen synchronously (safer)'}
            </p>
          </div>

          {/* Read from New Service */}
          <div className="flex items-center justify-between">
            <Label htmlFor="read-toggle" className="flex flex-col">
              <span>Read from New Service</span>
              <span className="text-sm text-gray-600 font-normal">
                Start reading data from Employee Core (Phase 4)
              </span>
            </Label>
            <Switch
              id="read-toggle"
              checked={status?.config.readFromNewService || false}
              disabled={true} // Will be enabled in Phase 4
            />
          </div>
        </CardContent>
      </Card>

      {/* Migration Phases Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className={`p-3 rounded ${status?.config.enableDualWrite ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="font-semibold">Phase 1: Enable Dual-Write (10%)</div>
              <div className="text-sm text-gray-600">Start with 10% async writes to test the system</div>
            </div>
            <div className={`p-3 rounded ${status?.config.writePercentage >= 50 ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="font-semibold">Phase 2: Increase Write Percentage</div>
              <div className="text-sm text-gray-600">Gradually increase to 100% while monitoring success rate</div>
            </div>
            <div className={`p-3 rounded ${status?.config.syncMode === 'sync' ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="font-semibold">Phase 3: Synchronous Writes</div>
              <div className="text-sm text-gray-600">Switch to sync mode for data consistency</div>
            </div>
            <div className={`p-3 rounded ${status?.config.readFromNewService ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="font-semibold">Phase 4: Read from New Service</div>
              <div className="text-sm text-gray-600">Start reading from Employee Core</div>
            </div>
            <div className="p-3 rounded bg-gray-50">
              <div className="font-semibold">Phase 5: Complete Migration</div>
              <div className="text-sm text-gray-600">Remove dual-write code, Employee Core becomes primary</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
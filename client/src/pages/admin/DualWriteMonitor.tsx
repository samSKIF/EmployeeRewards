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
import { 
  Activity, AlertCircle, CheckCircle, Database, Settings, TrendingUp, 
  ChevronRight, RotateCcw, Clock, Target, RefreshCw 
} from 'lucide-react';

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

interface MigrationPhase {
  id: number;
  name: string;
  description: string;
  config: {
    enableDualWrite: boolean;
    writePercentage: number;
    syncMode: 'async' | 'sync';
    readFromNewService: boolean;
  };
  successCriteria: {
    minSuccessRate: number;
    minOperations: number;
    stabilityHours: number;
  };
  status: 'pending' | 'active' | 'completed' | 'failed';
  metrics?: {
    successRate: number;
    totalOperations: number;
    failedOperations: number;
  };
}

interface PhaseStatus {
  phases: MigrationPhase[];
  currentPhase: MigrationPhase;
  overallProgress: number;
  timeInCurrentPhase: number;
  estimatedCompletion?: string;
}

export default function DualWriteMonitor() {
  const [status, setStatus] = useState<DualWriteStatus | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus | null>(null);
  const [progressionCheck, setProgressionCheck] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [statusRes, progressRes, phasesRes, checkRes] = await Promise.all([
        fetch('/api/dual-write/status', { headers }),
        fetch('/api/dual-write/migration-progress', { headers }),
        fetch('/api/dual-write/phases', { headers }),
        fetch('/api/dual-write/phases/check-progression', { headers })
      ]);

      if (statusRes.ok && progressRes.ok && phasesRes.ok && checkRes.ok) {
        const statusData = await statusRes.json();
        const progressData = await progressRes.json();
        const phasesData = await phasesRes.json();
        const checkData = await checkRes.json();
        setStatus(statusData.status);
        setProgress(progressData.progress);
        setPhaseStatus(phasesData);
        setProgressionCheck(checkData);
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

  const progressPhase = async (force: boolean = false) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/phases/progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await fetchStatus();
        toast({
          title: 'Phase Progressed',
          description: data.message
        });
      } else {
        toast({
          title: 'Cannot Progress',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to progress phase',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const rollbackPhase = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/phases/rollback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await fetchStatus();
        toast({
          title: 'Phase Rolled Back',
          description: data.message
        });
      } else {
        toast({
          title: 'Cannot Rollback',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to rollback phase',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

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
          description: 'Dual-write configuration updated'
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

  const updateSyncMode = async (mode: 'async' | 'sync') => {
    setUpdating(true);
    try {
      const response = await fetch('/api/dual-write/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncMode: mode })
      });

      if (response.ok) {
        await fetchStatus();
        toast({
          title: 'Success',
          description: `Sync mode updated to ${mode}`
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
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const successRate = progress ? parseFloat(progress.successRate) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dual-Write Migration Monitor</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and control the gradual migration to Employee Core service
          </p>
        </div>
        <Button onClick={fetchStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Migration Phases Timeline */}
      {phaseStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Migration Phases
            </CardTitle>
            <CardDescription>
              Overall Progress: {phaseStatus.overallProgress.toFixed(1)}%
              {phaseStatus.estimatedCompletion && (
                <span className="ml-2">
                  • Estimated completion: {new Date(phaseStatus.estimatedCompletion).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={phaseStatus.overallProgress} className="mb-4" />
            
            <div className="space-y-3">
              {phaseStatus.phases.map((phase) => (
                <div
                  key={phase.id}
                  className={`p-3 rounded-lg border ${
                    phase.status === 'active' ? 'border-primary bg-primary/5' :
                    phase.status === 'completed' ? 'border-green-500 bg-green-50' :
                    phase.status === 'failed' ? 'border-red-500 bg-red-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {phase.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {phase.status === 'active' && <Activity className="h-5 w-5 text-primary animate-pulse" />}
                      {phase.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {phase.status === 'pending' && <Clock className="h-5 w-5 text-gray-400" />}
                      
                      <div>
                        <div className="font-medium">
                          Phase {phase.id}: {phase.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {phase.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={
                        phase.status === 'active' ? 'default' :
                        phase.status === 'completed' ? 'secondary' :
                        'outline'
                      }>
                        {phase.config.writePercentage}% • {phase.config.syncMode}
                      </Badge>
                      {phase.metrics && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Success: {phase.metrics.successRate.toFixed(1)}% ({phase.metrics.totalOperations} ops)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {phase.status === 'active' && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm space-y-1">
                        <div>✓ Min Success Rate: {phase.successCriteria.minSuccessRate}%</div>
                        <div>✓ Min Operations: {phase.successCriteria.minOperations}</div>
                        <div>✓ Stability Period: {phase.successCriteria.stabilityHours} hours</div>
                        <div className="font-medium mt-2">
                          Time in phase: {phaseStatus.timeInCurrentPhase.toFixed(1)} hours
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Phase Control Buttons */}
            {progressionCheck && phaseStatus.currentPhase.status === 'active' && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">Phase Progression</div>
                    <div className="text-sm text-muted-foreground">
                      {progressionCheck.canProgress ? (
                        <span className="text-green-600">✓ Ready to progress</span>
                      ) : (
                        <span>{progressionCheck.reason}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => rollbackPhase()}
                      variant="outline"
                      size="sm"
                      disabled={updating || phaseStatus.currentPhase.id === 1}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Rollback
                    </Button>
                    <Button
                      onClick={() => progressPhase(false)}
                      size="sm"
                      disabled={updating || !progressionCheck.canProgress}
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Progress to Next
                    </Button>
                    {!progressionCheck.canProgress && (
                      <Button
                        onClick={() => progressPhase(true)}
                        variant="destructive"
                        size="sm"
                        disabled={updating}
                      >
                        Force Progress
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Status
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
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Metrics
          </CardTitle>
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
        </CardContent>
      </Card>

      {/* Manual Configuration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manual Controls
          </CardTitle>
          <CardDescription>
            Override phase configuration manually if needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
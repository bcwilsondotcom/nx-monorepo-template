/**
 * Build Status Component
 * T074 - Display build status with progress and details
 */

import { BuildStatus as BuildStatusType } from '@nx-monorepo-template/shared-types';

interface BuildStatusProps {
  build: BuildStatusType;
}

export function BuildStatus({ build }: BuildStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'queued':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'running':
        return '🔄';
      case 'queued':
        return '⏳';
      default:
        return '❓';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(build.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2">{getStatusIcon(build.status)}</span>
            <h3 className="text-lg font-semibold">Build #{build.buildId}</h3>
            <span className={`ml-3 px-2 py-1 text-xs font-medium rounded ${getStatusColor(build.status)}`}>
              {build.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Projects:</span> {build.projects.join(', ')}
            </p>
            <p>
              <span className="font-medium">Configuration:</span> {build.configuration}
            </p>
            <p>
              <span className="font-medium">Started:</span> {formatTime(build.createdAt)}
            </p>
            {build.completedAt && (
              <p>
                <span className="font-medium">Completed:</span> {formatTime(build.completedAt)}
              </p>
            )}
            {build.duration && (
              <p>
                <span className="font-medium">Duration:</span> {formatDuration(build.duration)}
              </p>
            )}
          </div>

          {build.status === 'running' && build.progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{build.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${build.progress}%` }}
                />
              </div>
            </div>
          )}

          {build.error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
              <p className="font-medium text-red-800">Error: {build.error.code}</p>
              <p className="text-red-700">{build.error.message}</p>
            </div>
          )}

          {build.artifacts && build.artifacts.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">Artifacts:</p>
              <div className="space-y-1">
                {build.artifacts.map((artifact, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {artifact.project}: {artifact.path} ({Math.round(artifact.size / 1024)}KB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col space-y-2">
          <button className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
            View Logs
          </button>
          {build.status === 'running' && (
            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
              Cancel
            </button>
          )}
          {build.status === 'failed' && (
            <button className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
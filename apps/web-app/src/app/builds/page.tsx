/**
 * Build Dashboard Page
 * T071 - Display build status and history
 */

'use client';

import { useEffect, useState } from 'react';
import { BuildStatus } from '../../components/BuildStatus';
import { apiService } from '../../services/api.service';
import { BuildStatus as BuildStatusType } from '@nx-monorepo-template/shared-types';

export default function BuildsPage() {
  const [builds, setBuilds] = useState<BuildStatusType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuilds();
    const interval = setInterval(loadBuilds, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadBuilds = async () => {
    try {
      // In a real app, this would fetch from an endpoint
      // For now, we'll simulate with mock data
      const mockBuilds: BuildStatusType[] = [
        {
          buildId: 'build-123',
          status: 'success',
          projects: ['api-example', 'web-app'],
          configuration: 'production',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 180000,
        },
        {
          buildId: 'build-124',
          status: 'running',
          projects: ['shared-utils'],
          configuration: 'development',
          createdAt: new Date().toISOString(),
          progress: 65,
        },
        {
          buildId: 'build-125',
          status: 'failed',
          projects: ['cli-tool'],
          configuration: 'production',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: {
            code: 'BUILD_FAILED',
            message: 'TypeScript compilation failed',
          },
        },
      ];
      setBuilds(mockBuilds);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load builds:', error);
      setLoading(false);
    }
  };

  const triggerBuild = async () => {
    try {
      await apiService.triggerBuild({
        projects: [],
        configuration: 'production',
        parallel: true,
      });
      alert('Build triggered successfully!');
      loadBuilds();
    } catch (error) {
      console.error('Failed to trigger build:', error);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Builds</h1>
          <p className="mt-2 text-gray-600">
            Monitor build status and history
          </p>
        </div>
        <button
          onClick={triggerBuild}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          Trigger Build
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {builds.map((build) => (
            <BuildStatus key={build.buildId} build={build} />
          ))}
        </div>
      )}

      {!loading && builds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No builds found</p>
        </div>
      )}
    </div>
  );
}
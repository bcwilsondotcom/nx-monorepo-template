/**
 * Project Detail Page
 * T069 - Display detailed information about a specific project
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiService } from '../../../services/api.service';
import { ProjectConfig } from '@nx-monorepo-template/shared-types';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectName = params.name as string;
  const [project, setProject] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectName) {
      loadProject();
    }
  }, [projectName]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProject(projectName);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {project.projectType} • {project.type}
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Root Path</dt>
              <dd className="mt-1 text-sm text-gray-900">{project.root}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Source Root</dt>
              <dd className="mt-1 text-sm text-gray-900">{project.sourceRoot}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tags</dt>
              <dd className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {project.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Targets</dt>
              <dd className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(project.targets || {}).map((target) => (
                    <span
                      key={target}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        {project.dependencies && project.dependencies.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dependencies</h3>
            <div className="space-y-2">
              {project.dependencies.map((dep) => (
                <div key={dep.name} className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">{dep.name}</span>
                  <span className="text-sm text-gray-500">{dep.version}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="flex space-x-3">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
              Build Project
            </button>
            <button className="bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50">
              Run Tests
            </button>
            <button className="bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50">
              View Dependencies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/**
 * Project Card Component
 * T073 - Display project information in a card format
 */

import { ProjectConfig } from '@nx-monorepo-template/shared-types';
import Link from 'next/link';

interface ProjectCardProps {
  project: ProjectConfig;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'application':
        return 'bg-blue-100 text-blue-800';
      case 'library':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'node':
      case 'nestjs':
        return '🚀';
      case 'react':
      case 'next':
        return '⚛️';
      case 'typescript':
        return '📘';
      case 'python':
        return '🐍';
      default:
        return '📦';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getProjectIcon(project.type)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              <Link href={`/projects/${project.name}`} className="hover:text-indigo-600">
                {project.name}
              </Link>
            </h3>
            <p className="text-sm text-gray-500">{project.root}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${getProjectTypeColor(
            project.projectType
          )}`}
        >
          {project.projectType}
        </span>
      </div>

      {project.tags && project.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {project.targets && (
            <>
              {project.targets.build && (
                <button className="text-xs text-indigo-600 hover:text-indigo-800">
                  Build
                </button>
              )}
              {project.targets.test && (
                <button className="text-xs text-indigo-600 hover:text-indigo-800">
                  Test
                </button>
              )}
              {project.targets.serve && (
                <button className="text-xs text-indigo-600 hover:text-indigo-800">
                  Serve
                </button>
              )}
            </>
          )}
        </div>
        <Link
          href={`/projects/${project.name}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
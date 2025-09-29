/**
 * Projects List Page
 * T068 - Display list of all projects
 */

'use client';

import { useEffect, useState } from 'react';
import { ProjectCard } from '../../components/ProjectCard';
import { apiService } from '../../services/api.service';
import { ProjectConfig } from '@nx-monorepo-template/shared-types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, [filter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProjects(filter);
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="mt-2 text-gray-600">
          Manage your monorepo projects and applications
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Search projects..."
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="flex space-x-2">
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option value="">All Types</option>
            <option value="application">Applications</option>
            <option value="library">Libraries</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found</p>
        </div>
      )}
    </div>
  );
}
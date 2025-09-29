/**
 * Specifications Management Page
 * T070 - Display and manage API specifications
 */

'use client';

import { useEffect, useState } from 'react';
import { apiService } from '../../services/api.service';
import { SpecificationFile } from '@nx-monorepo-template/shared-types';

export default function SpecificationsPage() {
  const [specifications, setSpecifications] = useState<SpecificationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadSpecifications();
  }, [selectedType]);

  const loadSpecifications = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSpecifications(selectedType);
      setSpecifications(data.specifications);
    } catch (error) {
      console.error('Failed to load specifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (specId: string) => {
    try {
      await apiService.generateCode({
        specificationId: specId,
        targetLanguage: 'typescript',
        outputType: 'client',
      });
      alert('Code generation started!');
    } catch (error) {
      console.error('Failed to generate code:', error);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Specifications</h1>
        <p className="mt-2 text-gray-600">
          Manage OpenAPI and AsyncAPI specifications
        </p>
      </div>

      <div className="mb-6">
        <select
          className="px-4 py-2 border border-gray-300 rounded-md"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="openapi">OpenAPI</option>
          <option value="asyncapi">AsyncAPI</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {specifications.map((spec) => (
              <li key={spec.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {spec.name}
                      </h3>
                      <span className="ml-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        {spec.type} v{spec.version}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{spec.description}</p>
                    <p className="mt-1 text-xs text-gray-400">{spec.filePath}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleGenerateCode(spec.id)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                    >
                      Generate Code
                    </button>
                    <button className="bg-white text-gray-700 px-3 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50">
                      View
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
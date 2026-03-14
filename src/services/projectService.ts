import { api } from './api';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../types/project';

export const projectService = {
  list: () => api.get<Project[]>('/api/projects'),
  getById: (id: string) => api.get<Project>(`/api/projects/${id}`),
  create: (data: CreateProjectRequest) => api.post<Project>('/api/projects', data),
  update: (id: string, data: UpdateProjectRequest) => api.put<Project>(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
};

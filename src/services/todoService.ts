import { api } from './api';
import type { Todo, CreateTodoRequest, PatchTodoRequest } from '../types/todo';

export const todoService = {
  list: (params?: { projectId?: string }) => {
    const qs = params?.projectId ? `?projectId=${encodeURIComponent(params.projectId)}` : '';
    return api.get<Todo[]>(`/api/todos${qs}`);
  },
  getById: (id: string) => api.get<Todo>(`/api/todos/${id}`),
  create: (data: CreateTodoRequest) => api.post<Todo>('/api/todos', data),
  update: (id: string, data: PatchTodoRequest) => api.patch<Todo>(`/api/todos/${id}`, data),
};

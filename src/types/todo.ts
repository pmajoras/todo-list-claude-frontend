export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Todo {
  id: string;
  description: string;
  userId: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  parentTodoId?: string;
  order?: number;
}

export interface CreateTodoRequest {
  description: string;
  projectId?: string;
  parentTodoId?: string;
  order?: number;
}

export interface UpdateTodoRequest {
  description?: string;
  status?: TodoStatus;
  projectId?: string;
  order?: number;
}

export interface PatchTodoRequest {
  description?: string;
  status?: TodoStatus;
  projectId?: string;
  order?: number;
}

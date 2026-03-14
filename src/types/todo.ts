export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  userId: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  parentTodoId?: string;
  order?: number;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  projectId?: string;
  parentTodoId?: string;
  order?: number;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  status?: TodoStatus;
  projectId?: string;
  order?: number;
}

export interface PatchTodoRequest {
  title?: string;
  description?: string;
  status?: TodoStatus;
  projectId?: string;
  order?: number;
}

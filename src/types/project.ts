export type ProjectStatus = 'ACTIVE' | 'INACTIVE';

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerUserId: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  endDate?: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  endDate?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  endDate?: string | null;
}

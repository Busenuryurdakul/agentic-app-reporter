export type UserInfo = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
};

export type LoginResponse = {
  token: string;
  user: UserInfo;
};

export type RegisterRequest = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
};

export type CreateOrganizationRequest = {
  name: string;
  slug: string;
};

export type Workspace = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateWorkspaceRequest = {
  name: string;
  slug: string;
  description?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  code?: number | string;
};

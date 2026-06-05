export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name?: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
}

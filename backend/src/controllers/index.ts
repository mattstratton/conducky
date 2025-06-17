// Controller exports
export { AuthController } from './auth.controller';
export { UserController } from './user.controller';

// Types and interfaces for controllers
export interface ControllerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User interface for Express session (shared across controllers)
export interface User {
  id: string;
  email: string;
  name: string;
} 
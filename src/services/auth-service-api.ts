// Authentication service using API Gateway/Lambda backend
import { apiClient } from './api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  settings: {
    notifications: {
      email: boolean;
      certificateExpiry: boolean;
      auditReminders: boolean;
    };
    language: string;
    timezone: string;
  };
  profile: {
    phone?: string;
    title?: string;
    department?: string;
    avatar?: string;
  };
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthServiceAPI {
  private currentUser: User | null = null;
  private authToken: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth-token');
      if (this.authToken) {
        apiClient.setAuthToken(this.authToken);
      }
    }
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.register(userData);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        if (token) {
          this.setAuthToken(token);
        }
        
        if (user) {
          this.currentUser = this.mapResponseToUser(user);
        }

        return {
          success: true,
          user: this.currentUser,
          token,
          message: response.data.message || 'Registration successful'
        };
      }

      return {
        success: false,
        message: response.error || 'Registration failed'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Login user
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.login(loginData);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        if (token) {
          this.setAuthToken(token);
        }
        
        if (user) {
          this.currentUser = this.mapResponseToUser(user);
        }

        return {
          success: true,
          user: this.currentUser,
          token,
          message: response.data.message || 'Login successful'
        };
      }

      return {
        success: false,
        message: response.error || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<User | null> {
    try {
      if (!this.authToken) {
        return null;
      }

      const response = await apiClient.getMe();
      
      if (response.success && response.data?.user) {
        this.currentUser = this.mapResponseToUser(response.data.user);
        return this.currentUser;
      }

      // Token might be invalid, clear it
      this.clearAuth();
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      this.clearAuth();
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Get current user from memory
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Set auth token and update API client
   */
  private setAuthToken(token: string): void {
    this.authToken = token;
    apiClient.setAuthToken(token);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth-token', token);
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuth(): void {
    this.authToken = null;
    this.currentUser = null;
    apiClient.setAuthToken(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
    }
  }

  /**
   * Map API response to User object
   */
  private mapResponseToUser(userData: any): User {
    return {
      ...userData,
      createdAt: new Date(userData.createdAt),
      updatedAt: new Date(userData.updatedAt),
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
    };
  }
}

export const authServiceAPI = new AuthServiceAPI();

// Export convenience function for getting authenticated user from request
export async function getAuthenticatedUser(): Promise<User | null> {
  return authServiceAPI.getMe();
}
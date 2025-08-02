// API Client service for communicating with Lambda/API Gateway backend

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Use API Gateway URL in production, local serverless offline in development
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: { email: string; password: string }) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getMe() {
    return this.makeRequest('/auth/me', {
      method: 'GET',
    });
  }

  async logout() {
    return this.makeRequest('/auth/logout', {
      method: 'POST',
    });
  }

  // Certificate endpoints
  async createCertificate(certificateData: any) {
    return this.makeRequest('/certificates', {
      method: 'POST',
      body: JSON.stringify(certificateData),
    });
  }

  async getCertificates(params?: { limit?: number; lastKey?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.lastKey) queryParams.append('lastKey', params.lastKey);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/certificates?${queryString}` : '/certificates';
    
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  async getCertificate(certificateNumber: string) {
    return this.makeRequest(`/certificates/${certificateNumber}`, {
      method: 'GET',
    });
  }

  async updateCertificate(certificateNumber: string, updateData: any) {
    return this.makeRequest(`/certificates/${certificateNumber}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCertificate(certificateNumber: string) {
    return this.makeRequest(`/certificates/${certificateNumber}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
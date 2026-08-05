import apiClient from "./axios";

export class Api{
  static async get<T>(url: string, params?: any): Promise<T> {
    const res = await apiClient.get(url, { params });
    return res.data;
  }

  static async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const res = await apiClient.post(url, data, config);
    return res.data;
  }

  static async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const res = await apiClient.put(url, data, config);
    return res.data;
  }

  static async delete<T>(url: string, data?: any): Promise<T> {
    const res = await apiClient.delete(url, { data });
    return res.data;
  }

  static async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const res = await apiClient.patch(url, data, config);
    return res.data;
  }
}

import type { FileItem, ApiResponse } from "../types";

const API_BASE = "/api";

export const api = {
  // Check bucket exists
  async checkBucket(): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/bucket/check`);
    return response.json();
  },

  // List files and folders
  async listFiles(
    prefix: string = ""
  ): Promise<{ items: FileItem[]; prefix: string }> {
    const response = await fetch(
      `${API_BASE}/files?prefix=${encodeURIComponent(prefix)}`
    );
    if (!response.ok) {
      throw new Error("Failed to list files");
    }
    return response.json();
  },

  // Get preview URL
  getPreviewUrl(path: string): string {
    return `${API_BASE}/files/preview?path=${encodeURIComponent(path)}`;
  },

  // Get download URL
  getDownloadUrl(path: string): string {
    return `${API_BASE}/files/download?path=${encodeURIComponent(path)}`;
  },

  // Upload file
  async uploadFile(
    file: File,
    prefix: string = ""
  ): Promise<ApiResponse<void>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prefix", prefix);

    const response = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    return response.json();
  },

  // Create folder
  async createFolder(
    folderName: string,
    prefix: string = ""
  ): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folderName, prefix }),
    });

    if (!response.ok) {
      throw new Error("Failed to create folder");
    }

    return response.json();
  },

  // Get presigned URL
  async getPresignedUrl(path: string): Promise<string> {
    const response = await fetch(
      `${API_BASE}/files/url?path=${encodeURIComponent(path)}`
    );
    if (!response.ok) {
      throw new Error("Failed to get presigned URL");
    }
    const data = await response.json();
    return data.url;
  },
};

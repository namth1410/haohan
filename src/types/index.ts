export interface FileItem {
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
  path: string;
}

export interface BreadcrumbItem {
  title: string;
  path: string;
}

export interface ApiResponse<T> {
  items?: T[];
  prefix?: string;
  success?: boolean;
  error?: string;
  url?: string;
  path?: string;
  bucket?: string;
}

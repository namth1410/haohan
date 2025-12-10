// Format file size to human readable format
export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return "-";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size % 1 === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

// Format date to readable format
export function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";

  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get file extension
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

// Check if file is previewable
export function isPreviewable(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  const previewableExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "pdf",
    "txt",
    "md",
    "json",
    "xml",
    "html",
    "css",
    "js",
    "ts",
    "tsx",
    "jsx",
    "mp4",
    "webm",
    "ogg",
    "mp3",
    "wav",
  ];
  return previewableExtensions.includes(ext);
}

// Get file type category
export function getFileCategory(fileName: string): string {
  const ext = getFileExtension(fileName);

  const categories: Record<string, string[]> = {
    image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"],
    video: ["mp4", "webm", "ogg", "avi", "mov", "mkv"],
    audio: ["mp3", "wav", "ogg", "flac", "aac"],
    document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
    code: ["js", "ts", "tsx", "jsx", "py", "java", "c", "cpp", "h", "go", "rs"],
    text: ["txt", "md", "json", "xml", "yaml", "yml", "csv"],
    archive: ["zip", "rar", "7z", "tar", "gz"],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return "other";
}

// Get icon color based on file type
export function getFileIconColor(fileName: string): string {
  const category = getFileCategory(fileName);

  const colors: Record<string, string> = {
    image: "#52c41a",
    video: "#eb2f96",
    audio: "#722ed1",
    document: "#fa541c",
    code: "#1890ff",
    text: "#595959",
    archive: "#faad14",
    other: "#8c8c8c",
  };

  return colors[category] || colors.other;
}

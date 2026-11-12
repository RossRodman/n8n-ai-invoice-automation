export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function uploadProblem(file: File): string | null {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) return "Not a PDF";
  if (file.size === 0) return "The file is empty";
  if (file.size > MAX_UPLOAD_BYTES) return "Larger than 10 MB";

  return null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

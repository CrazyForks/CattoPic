// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  else return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
};

// 获取格式标签
export const getFormatLabel = (format: string): string => {
  const formatMap: { [key: string]: string } = {
    png: "PNG",
    jpg: "JPG",
    jpeg: "JPEG",
    webp: "WebP",
    gif: "GIF",
    avif: "AVIF",
  };
  return formatMap[format.toLowerCase()] || format.toUpperCase();
};

// 获取方向标签
export const getOrientationLabel = (orientation: string): string => {
  const orientationMap: { [key: string]: string } = {
    landscape: "横向",
    portrait: "纵向",
    square: "方形",
  };
  return orientationMap[orientation.toLowerCase()] || orientation;
};

// 构建URL
export const buildUrl = (path: string, format: string): string => {
  const originalPath = path;

  let orientation = "";
  if (originalPath.includes("/landscape/")) {
    orientation = "landscape";
  } else if (originalPath.includes("/portrait/")) {
    orientation = "portrait";
  } else if (originalPath.includes("/square/")) {
    orientation = "square";
  }

  const fileNameParts = originalPath.split('/').pop()?.split('.') || [];
  const fileName = fileNameParts[0] || "";
  const originalExt = fileNameParts[1];
  const urlParts = originalPath.split('/');
  const domain = urlParts.slice(0, 3).join('/');

  let relativePath = '';
  if (format === "original") {
    relativePath = `original/${orientation}/${fileName}.${originalExt}`;
  } else if (format === "webp") {
    relativePath = `${orientation}/webp/${fileName}.webp`;
  } else if (format === "avif") {
    relativePath = `${orientation}/avif/${fileName}.avif`;
  }

  if (originalPath.startsWith('http')) {
    return `${domain}/${relativePath}`;
  }

  return `/images/${relativePath}`;
};

// 构建Markdown链接格式
export const buildMarkdownLink = (url: string, filename: string): string => {
  return `![${filename}](${url})`;
}; 

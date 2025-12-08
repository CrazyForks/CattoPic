/**
 * 跨浏览器复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 方法 1: 使用 Clipboard API (现代浏览器)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API 失败:', err);
      // 如果失败，尝试其他方法
    }
  }

  // 方法 2: 使用 document.execCommand (兼容旧浏览器)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // 确保不可见但处于文档中
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.left = '-999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      return true;
    } else {
      console.error('execCommand 复制失败');
    }
  } catch (err) {
    console.error('文档复制方法失败:', err);
  }

  return false;
} 

import { ImageFile } from "../types";
import { ImageData } from "../types/image"; 
import { getFormatLabel, getOrientationLabel, formatFileSize } from "../utils/imageUtils";

type ImageType = ImageFile | (ImageData & { status: 'success' });

interface ImageInfoProps {
  image: ImageType;
}

export const ImageInfo = ({ image }: ImageInfoProps) => {
  // 判断图片类型
  const isImageFile = 'url' in image && 'size' in image;
  
  // 获取展示信息
  const format = (image.format || '').toLowerCase();
  const orientation = image.orientation || '';
  const size = isImageFile ? (image as ImageFile).size : 0;
  const path = image.path || '';
  const width = 'width' in image ? image.width : undefined;
  const height = 'height' in image ? image.height : undefined;
  const expiryTime = 'expiryTime' in image ? image.expiryTime : undefined;

  const infoItems = [
    { label: '格式', value: format ? getFormatLabel(format) : null, color: 'blue' },
    { label: '方向', value: orientation ? getOrientationLabel(orientation) : null, color: 'purple' },
    { label: '大小', value: isImageFile ? formatFileSize(size) : null, color: 'green' },
    { label: '尺寸', value: width && height ? `${width} × ${height}` : null, color: 'amber' },
    { label: '过期时间', value: expiryTime ? new Date(expiryTime).toLocaleString() : null, color: 'red' }
  ].filter(item => item.value);

  return (
    <div className="space-y-4">
      {/* 信息标签 */}
      {infoItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                item.color === 'blue' ? 'bg-blue-500' :
                item.color === 'purple' ? 'bg-purple-500' :
                item.color === 'green' ? 'bg-green-500' :
                item.color === 'amber' ? 'bg-amber-500' :
                'bg-red-500'
              }`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 
import { useState, useRef } from 'react';
import { climberPhotosAPI } from '../services/api';
import { useToast } from './UI/Toast';
import ClimbingLoader from './UI/ClimbingLoader';

const PhotoUpload = ({ climberId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Невалиден формат на файл. Разрешени са само JPG, PNG и WebP.', 'error');
      return;
    }

    // Validate file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      showToast('Файлът е твърде голям. Максималният размер е 15MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const response = await climberPhotosAPI.upload(climberId, file);
      showToast('Снимката е качена успешно', 'success');
      if (onUploadSuccess) {
        onUploadSuccess(response.data.photos);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при качване на снимката';
      showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${dragActive
          ? 'border-[#ea7a24] bg-[#fff5ed]'
          : 'border-[#d1d5dc] hover:border-[#ea7a24]'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          disabled={uploading}
          className="hidden"
        />
        {uploading ? (
          <ClimbingLoader text="Качване на снимка..." className="!p-2" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-10 h-10 text-[#4a5565]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium text-neutral-950">
              Кликнете или плъзнете снимка тук за качване
            </p>
            <p className="text-xs text-[#4a5565]">
              JPG, PNG или WebP до 15MB
            </p>
          </div>
        )}
      </div></>
  );
};

export default PhotoUpload;


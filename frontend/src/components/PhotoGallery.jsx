import { useState } from 'react';
import { API_BASE_URL, climberPhotosAPI } from '../services/api';
import { useToast } from './UI/Toast';
import AuthImage from './AuthImage';
import PhotoUpload from './PhotoUpload';
import ConfirmDialog from './UI/ConfirmDialog';

const PhotoGallery = ({ climberId, photos = [], onUpdate, onImageClick }) => {
  const [deleting, setDeleting] = useState(null);
  const [settingMain, setSettingMain] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const { showToast } = useToast();

  const getPhotoUrl = (filename) => {
    return `${API_BASE_URL}/admin/photos/${climberId}/${filename}`;
  };

  const handleSetMain = async (filename) => {
    setSettingMain(filename);
    try {
      const response = await climberPhotosAPI.setMain(climberId, filename);
      showToast('Главната снимка е обновена', 'success');
      if (onUpdate) {
        onUpdate(response.data.photos);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при обновяване на главната снимка';
      showToast(errorMessage, 'error');
    } finally {
      setSettingMain(null);
    }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFilename, setDeleteFilename] = useState(null);

  const handleDelete = (filename) => {
    setDeleteFilename(filename);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteFilename) return;

    setDeleting(deleteFilename);
    try {
      const response = await climberPhotosAPI.delete(climberId, deleteFilename);
      showToast('Снимката е изтрита успешно', 'success');
      if (onUpdate) {
        onUpdate(response.data.photos);
      }
      setShowDeleteDialog(false);
      setDeleteFilename(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на снимката';
      showToast(errorMessage, 'error');
      setShowDeleteDialog(false);
      setDeleteFilename(null);
    } finally {
      setDeleting(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteFilename(null);
  };

  const handleUploadSuccess = (updatedPhotos) => {
    setShowUpload(false);
    if (onUpdate) {
      onUpdate(updatedPhotos);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with title and upload button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px]">
            Снимки ({photos.length})
          </h2>
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-[#ea7a24] h-9 px-3 sm:px-4 rounded-lg text-white text-xs sm:text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Добави снимка</span>
            </button>
          )}
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="mb-6">
            <PhotoUpload 
              climberId={climberId} 
              onUploadSuccess={handleUploadSuccess}
            />
            <button
              onClick={() => setShowUpload(false)}
              className="mt-4 text-sm text-[#4a5565] hover:text-neutral-950"
            >
              Отказ
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.filename}
                className="group relative bg-[#f3f3f5] rounded-[10px] overflow-hidden aspect-[4/3]"
              >
                <div
                  onClick={() => {
                    // Open lightbox on image click
                    onImageClick?.(index);
                  }}
                  className="cursor-pointer w-full h-full"
                >
                  <AuthImage
                    src={getPhotoUrl(photo.filename)}
                    alt={`Снимка ${photo.filename}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Main badge */}
                {photo.isMain && (
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#ea7a24] px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg z-10">
                    <p className="text-xs sm:text-sm font-medium text-white">Главна</p>
                  </div>
                )}

                {/* Action buttons at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity flex items-center justify-end gap-2 sm:gap-3 p-2 opacity-0 group-hover:opacity-100">
                  {!photo.isMain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetMain(photo.filename);
                      }}
                      disabled={settingMain === photo.filename}
                      className="bg-[#ea7a24] text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      {settingMain === photo.filename ? '...' : 'Главна'}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo.filename);
                    }}
                    disabled={deleting === photo.filename}
                    className="bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    {deleting === photo.filename ? '...' : 'Изтрий'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showUpload && (
            <div className="text-center py-12">
              <p className="text-sm text-[#4a5565]">Няма качени снимки</p>
            </div>
          )
        )}
      </div><ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Изтриване на снимка"
        message="Сигурни ли сте, че искате да изтриете тази снимка?"
        confirmText="Изтрий"
        cancelText="Отказ"
        variant="danger"
      />
    </>
  );
};

export default PhotoGallery;

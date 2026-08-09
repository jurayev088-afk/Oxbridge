import { useId } from 'react';
import { Camera, GraduationCap, User } from 'lucide-react';

interface PhotoUploadProps {
  photoUrl?: string;
  name: string;
  role: 'teacher' | 'student' | 'admin' | 'director';
  editing: boolean;
  onPhotoChange: (url: string) => void;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxSize = 400;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas yaratib bo\'lmadi'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Rasm yuklanmadi'));
    };

    img.src = objectUrl;
  });
}

export function PhotoUpload({ photoUrl, name, role, editing, onPhotoChange }: PhotoUploadProps) {
  const inputId = useId().replace(/:/g, '');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await compressImage(file);
      onPhotoChange(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onPhotoChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  const previewContent = (
    <>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="photo-img" />
      ) : (
        <div className="photo-placeholder">
          {role === 'teacher' ? <GraduationCap size={28} /> : <User size={28} />}
        </div>
      )}
      {editing && (
        <div className="photo-overlay visible">
          <Camera size={20} />
          <span>Rasm tanlash</span>
        </div>
      )}
    </>
  );

  return (
    <div className="photo-upload">
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="photo-input"
        onChange={handleFile}
      />

      {editing ? (
        <label htmlFor={inputId} className="photo-preview editable">
          {previewContent}
        </label>
      ) : (
        <div className="photo-preview">{previewContent}</div>
      )}

      {editing && (
        <label htmlFor={inputId} className="photo-btn">
          <Camera size={14} />
          Rasm qo'yish
        </label>
      )}
    </div>
  );
}

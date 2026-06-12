'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

export default function ImageUpload({
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/jpg,image/webp',
  maxSizeMB = 5,
  label = 'Arrastra una imagen o haz clic para seleccionar',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError('');

      const validTypes = accept.split(',').map((t) => t.trim());
      if (!validTypes.includes(file.type)) {
        setError('Tipo de archivo no permitido. Use PNG, JPG o WebP.');
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo supera el limite de ${maxSizeMB}MB.`);
        return;
      }

      setUploading(true);

      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 80);
          setUploading(pct < 100);
        }
      };
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setUploading(false);
        onChange(dataUrl);
      };
      reader.onerror = () => {
        setError('Error al leer el archivo.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [accept, maxSizeMB, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP - Max {maxSizeMB}MB</p>
        </div>
      )}

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

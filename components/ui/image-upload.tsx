"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadProductImage, deleteProductImage } from "@/lib/supabase/storage";
import { Button } from "./button";

interface ImageUploadProps {
  shopId: string;
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({
  shopId,
  value,
  onChange,
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate size (10MB pre-compression)
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Invalid file type. Please select an image file.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Upload via storage helper (performs WebP client-side compression internally)
      const imageUrl = await uploadProductImage(shopId, file);
      onChange(imageUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    setIsUploading(true);
    try {
      await deleteProductImage(value);
      onChange("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Delete error:", err);
      setError("Failed to delete image from storage.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Product Asset
        </label>
        {value && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
          >
            Remove Image
          </button>
        )}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !value && !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 transition-all min-h-[220px] ${
          value ? "border-slate-200 bg-slate-50/50" : "cursor-pointer hover:bg-slate-50/50"
        } ${isDragActive ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200"} ${
          error ? "border-rose-400 bg-rose-50/10" : ""
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-500 animate-pulse">
              Optimizing and uploading image...
            </span>
          </div>
        ) : value ? (
          <div className="relative group w-full h-full flex items-center justify-center max-h-[200px] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Product Asset Preview"
              className="object-contain max-h-[190px] rounded-lg shadow-sm"
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold bg-white text-slate-800 hover:bg-slate-100"
              >
                Change Image
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-full">
              <UploadCloud className="h-6 w-6 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Upload Master Image
              </p>
              <p className="text-xs text-slate-400">
                Drag and drop or click to browse
              </p>
            </div>
            <p className="text-[10px] text-slate-400/80 pt-1">
              Supports WEBP, PNG, JPG (Max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

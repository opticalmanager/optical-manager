import { createClient } from "./client";

/**
 * Compresses an image client-side using canvas, resizing it to a maximum width
 * and converting it to WebP format for optimal storage space savings.
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while constraining to maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas 2D context"));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas contents to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas conversion to WebP blob failed"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses the product image and uploads it to Supabase Storage.
 * Saves in path: product-images/${shopId}/${itemId}.webp
 * Returns the public URL of the uploaded image.
 */
export async function uploadProductImage(
  shopId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  
  // 1. Compress client-side to WebP (~98% space savings)
  const compressedBlob = await compressImage(file);
  
  // 2. Generate unique filename and path
  const filename = `${crypto.randomUUID()}.webp`;
  const filePath = `${shopId}/${filename}`;

  // 3. Upload blob to 'product-images' bucket
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(filePath, compressedBlob, {
      contentType: "image/webp",
      cacheControl: "31536000", // 1 year cache
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload product image to storage: ${error.message}`);
  }

  // 4. Retrieve and return public URL
  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Deletes a product image from Supabase Storage given its public URL.
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    const supabase = createClient();
    
    // Parse path from public URL: should match /object/public/product-images/(...)
    // E.g., https://(...).supabase.co/storage/v1/object/public/product-images/shopId/uuid.webp
    const bucketMarker = "/product-images/";
    const markerIndex = imageUrl.indexOf(bucketMarker);
    
    if (markerIndex === -1) {
      console.warn("Could not extract storage path from image URL:", imageUrl);
      return;
    }

    const filePath = imageUrl.substring(markerIndex + bucketMarker.length);
    
    const { error } = await supabase.storage
      .from("product-images")
      .remove([filePath]);

    if (error) {
      console.error(`Failed to delete storage file [${filePath}]:`, error.message);
    }
  } catch (err) {
    console.error("Error in deleteProductImage utility:", err);
  }
}

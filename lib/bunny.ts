/**
 * Bunny CDN Storage API Integration
 * https://docs.bunny.net/reference/storage-api
 */

interface BunnyUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface BunnyDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Upload a file to Bunny CDN Storage
 * @param file - The file to upload (as Buffer or base64 string)
 * @param fileName - The file name (will be placed in /products/{productName}/ folder)
 * @param productName - Product name for folder organization
 * @returns Upload result with CDN URL
 */
export async function uploadToBunny(
  file: Buffer | string,
  fileName: string,
  productName: string
): Promise<BunnyUploadResult> {
  try {
    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
    const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
    const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME; // e.g., "storage.bunnycdn.com"
    const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL; // e.g., "https://merchdrop.b-cdn.net"

    if (!BUNNY_STORAGE_ZONE || !BUNNY_ACCESS_KEY || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      return {
        success: false,
        error: 'Bunny CDN credentials not configured'
      };
    }

    // Sanitize product name for folder name
    const folderName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create path: /products/{productName}/{fileName}
    const path = `/products/${folderName}/${fileName}`;

    // Convert base64 to buffer if needed
    let fileBuffer: Buffer;
    if (typeof file === 'string') {
      // Assume base64
      const base64Data = file.replace(/^data:.*base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = file;
    }

    // Upload to Bunny Storage API
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${path}`;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'application/octet-stream'
      },
      body: new Uint8Array(fileBuffer)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny upload failed:', errorText);
      return {
        success: false,
        error: `Upload failed: ${response.statusText}`
      };
    }

    // Return the CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}${path}`;

    return {
      success: true,
      url: cdnUrl
    };

  } catch (error) {
    console.error('Error uploading to Bunny:', error);
    return {
      success: false,
      error: 'Failed to upload file'
    };
  }
}

/**
 * Delete a file from Bunny CDN Storage
 * @param filePath - Full path of the file (e.g., "/products/classic-logo-tee/photo.jpg")
 * @returns Delete result
 */
export async function deleteFromBunny(filePath: string): Promise<BunnyDeleteResult> {
  try {
    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
    const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
    const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;

    if (!BUNNY_STORAGE_ZONE || !BUNNY_ACCESS_KEY || !BUNNY_HOSTNAME) {
      return {
        success: false,
        error: 'Bunny CDN credentials not configured'
      };
    }

    const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${filePath}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny delete failed:', errorText);
      return {
        success: false,
        error: `Delete failed: ${response.statusText}`
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error deleting from Bunny:', error);
    return {
      success: false,
      error: 'Failed to delete file'
    };
  }
}

/**
 * Extract path from Bunny CDN URL
 * @param url - Full CDN URL (e.g., "https://merchdrop.b-cdn.net/products/foo/bar.jpg")
 * @returns Path (e.g., "/products/foo/bar.jpg")
 */
export function extractPathFromCdnUrl(url: string): string | null {
  try {
    const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;
    if (!BUNNY_CDN_URL) return null;

    if (url.startsWith(BUNNY_CDN_URL)) {
      return url.replace(BUNNY_CDN_URL, '');
    }

    return null;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
}

interface BunnyFile {
  Guid: string;
  ObjectName: string;
  Path: string;
  Length: number;
  LastChanged: string;
  IsDirectory: boolean;
  ServerId: number;
  StorageZoneName: string;
  UserId: string;
  DateCreated: string;
  StorageZoneId: number;
  Checksum: string;
  ReplicatedZones: string;
}

interface BunnyListResult {
  success: boolean;
  files?: Array<{
    name: string;
    url: string;
    type: 'image' | 'video';
    size: number;
    date: string;
  }>;
  error?: string;
}

/**
 * List all files from a Bunny CDN folder
 * @param folderPath - Path to folder (e.g., "/import-library/")
 * @returns List of files with CDN URLs
 */
export async function listBunnyFolder(folderPath: string): Promise<BunnyListResult> {
  try {
    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
    const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
    const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
    const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

    if (!BUNNY_STORAGE_ZONE || !BUNNY_ACCESS_KEY || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      return {
        success: false,
        error: 'Bunny CDN credentials not configured'
      };
    }

    // Ensure path starts with / and ends with /
    const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    const listUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${normalizedPath}`;

    const response = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny list failed:', errorText);
      return {
        success: false,
        error: `List failed: ${response.statusText}`
      };
    }

    const bunnyFiles: BunnyFile[] = await response.json();

    // Filter out directories and map to our format
    const files = bunnyFiles
      .filter(file => !file.IsDirectory)
      .map(file => {
        const fileName = file.ObjectName;
        const extension = fileName.split('.').pop()?.toLowerCase() || '';

        // Determine type based on extension
        const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        let type: 'image' | 'video' = 'image';
        if (videoExtensions.includes(extension)) {
          type = 'video';
        }

        // Construct URL: CDN_URL + folder path + filename
        // file.Path from Bunny API is the folder path
        const cdnUrl = `${BUNNY_CDN_URL}${folderPath}${fileName}`;

        return {
          name: fileName,
          url: cdnUrl,
          type,
          size: file.Length,
          date: file.DateCreated
        };
      })
      // Sort by date (newest first)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      files
    };

  } catch (error) {
    console.error('Error listing Bunny folder:', error);
    return {
      success: false,
      error: 'Failed to list files'
    };
  }
}

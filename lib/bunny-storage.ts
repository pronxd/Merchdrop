const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

/**
 * Moves an image from the temp folder to permanent storage
 * @param tempUrl The temp CDN URL of the image
 * @param bookingId The booking ID to use for the permanent path
 * @returns The permanent CDN URL or null if failed
 */
export async function moveImageFromTempToPermanent(tempUrl: string, bookingId: string): Promise<string | null> {
  try {
    if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      console.error('Bunny storage not configured');
      return null;
    }

    // Extract path from temp URL
    const tempPath = tempUrl.replace(`${BUNNY_CDN_URL}/`, '');

    // Ensure it's from temp folder
    if (!tempPath.startsWith('temp/')) {
      console.error('Can only move files from temp folder');
      return null;
    }

    // Download the file from temp location
    const downloadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${tempPath}`;

    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      },
    });

    if (!downloadResponse.ok) {
      console.error('Failed to download temp image:', await downloadResponse.text());
      return null;
    }

    const fileBuffer = await downloadResponse.arrayBuffer();

    // Create permanent path: orders/edible-images/{bookingId}/{filename}
    const filename = tempPath.split('/').pop();
    const permanentPath = `orders/edible-images/${bookingId}/${filename}`;

    // Upload to permanent location
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${permanentPath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      console.error('Failed to upload to permanent location:', await uploadResponse.text());
      return null;
    }

    // Delete from temp location
    const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${tempPath}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      },
    });

    // Don't fail if delete fails - the file is already in permanent location
    if (!deleteResponse.ok) {
      console.warn('Failed to delete temp file (non-critical):', tempPath);
    }

    // Return the permanent CDN URL
    return `${BUNNY_CDN_URL}/${permanentPath}`;

  } catch (error) {
    console.error('Error moving image:', error);
    return null;
  }
}

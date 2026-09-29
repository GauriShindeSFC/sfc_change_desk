/**
 * Azure Blob Storage Service Helper
 * Uploads files (buffers or base64) directly to Azure Blob using container SAS URL and Token.
 * Uses native fetch with Azure REST API (BlockBlob PUT) without requiring extra heavy dependencies.
 */

export const uploadToAzureBlob = async ({ fileBuffer, fileName, mimeType = 'application/pdf', folder = 'pre-spend/quotes' }) => {
  const rawSasUrl = process.env.AZURE_STORAGE_SAS_URL || '';
  const rawSasToken = process.env.AZURE_STORAGE_SAS_TOKEN || '';

  if (!rawSasUrl) {
    throw new Error('AZURE_STORAGE_SAS_URL is not configured in backend environment.');
  }

  // Clean and sanitize file name
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${(fileName || 'document.pdf').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const blobPath = `${folder ? folder.replace(/^\/+|\/+$/g, '') + '/' : ''}${safeFileName}`;

  // Separate host + container path from query string if already present in rawSasUrl
  let cleanBaseUrl = rawSasUrl.trim();
  let extractedToken = rawSasToken ? rawSasToken.trim() : '';

  if (cleanBaseUrl.includes('?')) {
    const urlParts = cleanBaseUrl.split('?');
    cleanBaseUrl = urlParts[0].replace(/\/+$/, '');
    if (!extractedToken && urlParts[1]) {
      extractedToken = urlParts[1];
    }
  } else {
    cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, '');
  }

  // Ensure SAS token is properly formatted with a single leading '?'
  const formattedToken = extractedToken
    ? (extractedToken.startsWith('?') ? extractedToken : `?${extractedToken}`)
    : '';

  // Construct target Blob upload & view URLs
  const uploadUrl = `${cleanBaseUrl}/${blobPath}${formattedToken}`;
  const viewUrl = `${cleanBaseUrl}/${blobPath}${formattedToken}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString()
    },
    body: fileBuffer
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Azure Blob upload failed with status ${response.status}: ${errorText || response.statusText}`);
  }

  return {
    success: true,
    fileName: fileName || safeFileName,
    blobPath,
    fileUrl: viewUrl
  };
};

/**
 * Parses base64 data URI and uploads to Azure Blob Storage
 */
export const uploadBase64ToAzureBlob = async (base64Data, originalFileName, folder = 'pre-spend/quotes') => {
  if (!base64Data || typeof base64Data !== 'string') return null;

  let mimeType = 'application/pdf';
  let buffer = null;

  if (base64Data.startsWith('data:')) {
    const parts = base64Data.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'application/pdf';
    buffer = Buffer.from(parts[1] || '', 'base64');
  } else {
    buffer = Buffer.from(base64Data, 'base64');
  }

  return await uploadToAzureBlob({
    fileBuffer: buffer,
    fileName: originalFileName,
    mimeType,
    folder
  });
};

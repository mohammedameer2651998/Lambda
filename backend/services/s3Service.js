const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getSecret } = require('../config/secrets');

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File content
 * @param {string} key - S3 object key (path/filename)
 * @param {string} mimeType - File MIME type
 */
const uploadFile = async (fileBuffer, key, mimeType) => {
  const bucketName = await getSecret('S3_BUCKET_NAME');
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  
  console.log(`✅ File uploaded to S3: ${key}`);
  
  return {
    key,
    bucket: bucketName,
    url: `https://${bucketName}.s3.amazonaws.com/${key}`,
  };
};

/**
 * Generate a presigned URL for secure temporary access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiry in seconds (default: 1 hour)
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const bucketName = await getSecret('S3_BUCKET_NAME');
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  
  return url;
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
const deleteFile = async (key) => {
  const bucketName = await getSecret('S3_BUCKET_NAME');
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
  
  console.log(`🗑️ File deleted from S3: ${key}`);
};

module.exports = { uploadFile, getPresignedUrl, deleteFile };
// ============================================
// SCHEDULED TASK HANDLERS
// ============================================
// This file contains all scheduled task handlers.
// Each function is triggered by a specific EventBridge rule.
// ============================================

const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');

// Initialize S3 client (reused across invocations)
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = 'microservice-files-dev2651998';

/**
 * HEALTH CHECK TASK
 * ─────────────────
 * Purpose: Verify the system is healthy (database connected, etc.)
 * Schedule: Every 5 minutes
 * 
 * WHY?
 * - Proactive monitoring: Catch issues before users report them
 * - CloudWatch will log success/failure, triggering alerts if needed
 * - Keeps Lambda "warm" (faster response times)
 */
async function healthCheck(event, context) {
  console.log('🏥 Running health check...');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Check 1: Database connection
  try {
    // mongoose.connection.readyState:
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection.readyState;
    
    if (dbState === 1) {
      results.checks.database = { status: 'healthy', state: 'connected' };
    } else {
      // Try to connect if not connected
      const { connectDB } = require('../config/database');
      await connectDB();
      results.checks.database = { status: 'healthy', state: 'reconnected' };
    }
  } catch (error) {
    results.checks.database = { status: 'unhealthy', error: error.message };
  }
  
  // Check 2: S3 accessibility
  try {
    // Just list objects to verify S3 access works
    await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1  // Only need 1 to verify access
    }));
    results.checks.s3 = { status: 'healthy' };
  } catch (error) {
    results.checks.s3 = { status: 'unhealthy', error: error.message };
  }
  
  // Determine overall health
  const allHealthy = Object.values(results.checks).every(c => c.status === 'healthy');
  results.overall = allHealthy ? 'healthy' : 'unhealthy';
  
  console.log('🏥 Health check results:', JSON.stringify(results, null, 2));
  
  // Return results (logged to CloudWatch)
  return {
    statusCode: allHealthy ? 200 : 500,
    body: JSON.stringify(results)
  };
}


/**
 * DAILY CLEANUP TASK
 * ──────────────────
 * Purpose: Delete orphaned files (files in S3 but not referenced in database)
 * Schedule: Daily at 2:00 AM UTC
 * 
 * WHY?
 * - Save storage costs: Remove files that are no longer needed
 * - Data hygiene: Keep S3 bucket clean
 * - Happens at 2am to avoid peak usage times
 * 
 * HOW IT WORKS:
 * 1. Get all file references from MongoDB (Items collection)
 * 2. List all files in S3
 * 3. Delete S3 files that aren't in MongoDB
 */
async function dailyCleanup(event, context) {
  console.log('🧹 Running daily cleanup...');
  
  const results = {
    timestamp: new Date().toISOString(),
    filesChecked: 0,
    filesDeleted: 0,
    deletedFiles: [],
    errors: []
  };
  
  try {
    // Step 1: Connect to database if needed
    const { connectDB } = require('../config/database');
    await connectDB();
    
    // Step 2: Get all file keys referenced in database
    const { Item } = require('../models/Items');
    const items = await Item.find({}, { files: 1 }); // Only fetch 'files' field
    
    // Build a Set of valid S3 keys (fast lookup)
    const validKeys = new Set();
    items.forEach(item => {
      if (item.files && Array.isArray(item.files)) {
        item.files.forEach(file => {
          if (file.s3Key) {
            validKeys.add(file.s3Key);
          }
        });
      }
    });
    
    console.log(`📁 Found ${validKeys.size} valid file references in database`);
    
    // Step 3: List all files in S3
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'uploads/'  // Only check uploads folder
    }));
    
    const s3Files = listResponse.Contents || [];
    results.filesChecked = s3Files.length;
    
    console.log(`📦 Found ${s3Files.length} files in S3`);
    
    // Step 4: Find and delete orphaned files
    for (const s3File of s3Files) {
      const key = s3File.Key;
      
      // Skip if file is referenced in database
      if (validKeys.has(key)) {
        continue;
      }
      
      // Skip files less than 24 hours old (might be in-progress uploads)
      const fileAge = Date.now() - new Date(s3File.LastModified).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (fileAge < oneDayMs) {
        console.log(`⏳ Skipping recent file: ${key}`);
        continue;
      }
      
      // Delete orphaned file
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        }));
        
        results.filesDeleted++;
        results.deletedFiles.push(key);
        console.log(`🗑️ Deleted orphaned file: ${key}`);
        
      } catch (deleteError) {
        results.errors.push({ key, error: deleteError.message });
        console.error(`❌ Failed to delete ${key}:`, deleteError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    results.errors.push({ general: error.message });
  }
  
  console.log('🧹 Cleanup results:', JSON.stringify(results, null, 2));
  
  return {
    statusCode: results.errors.length === 0 ? 200 : 500,
    body: JSON.stringify(results)
  };
}


/**
 * WEEKLY REPORT TASK
 * ──────────────────
 * Purpose: Generate usage statistics for monitoring
 * Schedule: Every Monday at 9:00 AM UTC
 * 
 * WHY?
 * - Track growth: See how many items/files are being created
 * - Capacity planning: Anticipate when you need to scale
 * - Debugging: Historical data helps troubleshoot issues
 * 
 * FUTURE ENHANCEMENT:
 * - Send report via email (AWS SES)
 * - Store in a metrics database
 * - Create CloudWatch dashboard
 */
async function weeklyReport(event, context) {
  console.log('📊 Generating weekly report...');
  
  const report = {
    generatedAt: new Date().toISOString(),
    period: 'last_7_days',
    metrics: {}
  };
  
  try {
    // Connect to database
    const { connectDB } = require('../config/database');
    await connectDB();
    
    const { Item } = require('../models/Items');
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Metric 1: Total items
    report.metrics.totalItems = await Item.countDocuments();
    
    // Metric 2: Items created in last 7 days
    report.metrics.itemsCreatedThisWeek = await Item.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Metric 3: Items updated in last 7 days
    report.metrics.itemsUpdatedThisWeek = await Item.countDocuments({
      updatedAt: { $gte: sevenDaysAgo }
    });
    
    // Metric 4: Total files across all items
    const itemsWithFiles = await Item.find({ 'files.0': { $exists: true } }, { files: 1 });
    let totalFiles = 0;
    let totalFileSize = 0;
    
    itemsWithFiles.forEach(item => {
      if (item.files) {
        totalFiles += item.files.length;
        item.files.forEach(file => {
          totalFileSize += file.size || 0;
        });
      }
    });
    
    report.metrics.totalFiles = totalFiles;
    report.metrics.totalFileSizeMB = Math.round(totalFileSize / (1024 * 1024) * 100) / 100;
    
    // Metric 5: S3 bucket size
    try {
      const listResponse = await s3Client.send(new ListObjectsV2Command({
        Bucket: BUCKET_NAME
      }));
      
      const s3Objects = listResponse.Contents || [];
      const s3TotalSize = s3Objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      
      report.metrics.s3ObjectCount = s3Objects.length;
      report.metrics.s3TotalSizeMB = Math.round(s3TotalSize / (1024 * 1024) * 100) / 100;
    } catch (s3Error) {
      report.metrics.s3Error = s3Error.message;
    }
    
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    report.error = error.message;
  }
  
  console.log('📊 Weekly report:', JSON.stringify(report, null, 2));
  
  return {
    statusCode: 200,
    body: JSON.stringify(report)
  };
}


// Export all handlers
module.exports = {
  healthCheck,
  dailyCleanup,
  weeklyReport
};

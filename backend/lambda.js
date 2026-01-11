// ============================================
// AWS LAMBDA HANDLER
// ============================================
// This is the entry point for AWS Lambda.
// It handles BOTH:
//   1. HTTP requests from API Gateway
//   2. Scheduled events from EventBridge
// ============================================

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

// Import scheduled task handlers
const scheduledTasks = require('./handlers/scheduledTasks');

// Create the serverless Express handler (reused across invocations)
let serverlessExpressInstance;

/**
 * Initialize the Express handler (called on cold start)
 */
function getExpressHandler() {
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = serverlessExpress({ app });
  }
  return serverlessExpressInstance;
}

/**
 * Main Lambda handler - routes to appropriate handler based on event type
 * 
 * WHY THIS PATTERN?
 * Lambda can be triggered by MANY sources (API Gateway, EventBridge, S3, etc.)
 * Each source sends a differently structured event.
 * We detect the source and route to the right handler.
 */
exports.handler = async (event, context) => {
  
  // ==========================================
  // DETECT: Is this a scheduled event?
  // ==========================================
  // EventBridge scheduled events have 'source': 'aws.events'
  // or 'detail-type': 'Scheduled Event'
  
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log('📅 Scheduled event detected:', JSON.stringify(event, null, 2));
    
    // Extract which rule triggered this (from the ARN)
    // Example ARN: "arn:aws:events:us-east-1:123456:rule/microservice-health-check"
    const ruleArn = event.resources?.[0] || '';
    const ruleName = ruleArn.split('/').pop(); // Gets "microservice-health-check"
    
    console.log('📋 Rule name:', ruleName);
    
    // Route to appropriate task based on rule name
    switch (ruleName) {
      case 'microservice-health-check':
        return await scheduledTasks.healthCheck(event, context);
      
      case 'microservice-daily-cleanup':
        return await scheduledTasks.dailyCleanup(event, context);
      
      case 'microservice-weekly-report':
        return await scheduledTasks.weeklyReport(event, context);
      
      default:
        console.log('⚠️ Unknown scheduled rule:', ruleName);
        return { 
          statusCode: 200, 
          body: JSON.stringify({ message: 'Unknown rule - no action taken', rule: ruleName })
        };
    }
  }
  
  // ==========================================
  // DEFAULT: Handle as API Gateway HTTP request
  // ==========================================
  // If it's not a scheduled event, it's an HTTP request from API Gateway
  
  const expressHandler = getExpressHandler();
  return expressHandler(event, context);
};

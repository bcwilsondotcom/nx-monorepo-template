/**
 * Event Handler - Main Entry Point
 * T060 - Lambda function entry point for event processing
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ProjectEventHandler } from './handlers/project-event.handler';
import { ConfigurationEventHandler } from './handlers/configuration-event.handler';
import { SystemEventHandler } from './handlers/system-event.handler';
import { EventRouter } from './utils/event-router';

const router = new EventRouter();
const projectHandler = new ProjectEventHandler();
const configHandler = new ConfigurationEventHandler();
const systemHandler = new SystemEventHandler();

// Register event handlers
router.register('project.*', projectHandler);
router.register('configuration.*', configHandler);
router.register('system.*', systemHandler);

/**
 * Main Lambda handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  try {
    // Parse event body
    const body = JSON.parse(event.body || '{}');
    const eventType = body.type || event.headers?.['x-event-type'] || 'unknown';
    const eventData = body.data || body;

    console.log(`Processing event type: ${eventType}`);

    // Route event to appropriate handler
    const result = await router.route(eventType, eventData, context);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': context.awsRequestId,
      },
      body: JSON.stringify({
        success: true,
        message: `Event ${eventType} processed successfully`,
        requestId: context.awsRequestId,
        result,
      }),
    };
  } catch (error) {
    console.error('Error processing event:', error);

    return {
      statusCode: error.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': context.awsRequestId,
      },
      body: JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        requestId: context.awsRequestId,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};

/**
 * Local development server
 */
if (require.main === module) {
  const express = require('express');
  const app = express();
  app.use(express.json());

  app.post('/event', async (req, res) => {
    const mockContext: Context = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'event-handler-dev',
      functionVersion: '1.0.0',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:event-handler-dev',
      memoryLimitInMB: '128',
      awsRequestId: `dev-${Date.now()}`,
      logGroupName: '/aws/lambda/event-handler-dev',
      logStreamName: `${new Date().toISOString().split('T')[0]}/[1]/${Date.now()}`,
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };

    const mockEvent: APIGatewayProxyEvent = {
      body: JSON.stringify(req.body),
      headers: req.headers as any,
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/event',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: null as any,
      resource: '/event',
    };

    const result = await handler(mockEvent, mockContext);
    res.status(result.statusCode).json(JSON.parse(result.body));
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🎯 Event Handler development server running on http://localhost:${port}`);
    console.log(`📮 POST events to: http://localhost:${port}/event`);
  });
}
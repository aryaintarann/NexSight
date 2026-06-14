import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'NexSight API',
    version: '1.0.0',
    description: 'All-in-one website intelligence platform — SEO · GEO · AI Visibility · Security',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/api/v1', description: 'This instance' }],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
        description: 'Supabase JWT (from login session)',
      },
      ApiKeyAuth: {
        type: 'apiKey', in: 'header', name: 'X-API-Key',
        description: 'NexSight API key — format: nxs_xxxxxxxx… (generate in Settings)',
      },
    },
    schemas: {
      Scan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          status: { type: 'string', enum: ['queued', 'running', 'done', 'failed'] },
          overall_score: { type: 'integer', minimum: 0, maximum: 100, nullable: true },
          scores: {
            type: 'object',
            properties: {
              seo: { type: 'integer', nullable: true },
              geo: { type: 'integer', nullable: true },
              ai: { type: 'integer', nullable: true },
              security: { type: 'integer', nullable: true },
            },
          },
          scan_duration_ms: { type: 'integer', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error'],
      },
    },
  },
  paths: {
    '/scan': {
      post: {
        summary: 'Trigger a new scan',
        operationId: 'postScan',
        tags: ['Scans'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri', example: 'https://example.com' },
                  modules: {
                    type: 'array',
                    items: { type: 'string', enum: ['seo', 'geo', 'ai', 'security'] },
                    default: ['seo', 'geo', 'ai', 'security'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Scan queued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scan_id: { type: 'string', format: 'uuid' },
                    status: { type: 'string', example: 'queued' },
                    url: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid URL', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/scan/{id}': {
      get: {
        summary: 'Get scan result',
        operationId: 'getScan',
        tags: ['Scans'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Scan result', content: { 'application/json': { schema: { $ref: '#/components/schemas/Scan' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Scan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/scans': {
      get: {
        summary: 'List scans (paginated)',
        operationId: 'listScans',
        tags: ['Scans'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Paginated scans',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scans: { type: 'array', items: { $ref: '#/components/schemas/Scan' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/report/{id}': {
      get: {
        summary: 'Download scan report (HTML or PDF)',
        operationId: 'getReport',
        tags: ['Reports'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['html', 'pdf'], default: 'html' } },
        ],
        responses: {
          '200': { description: 'Report file', content: { 'text/html': {}, 'application/pdf': {} } },
          '400': { description: 'Scan not completed yet', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Scan not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/keys': {
      get: {
        summary: 'List API keys',
        operationId: 'listKeys',
        tags: ['API Keys'],
        responses: {
          '200': {
            description: 'API keys (key values are never returned after creation)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    keys: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          key_prefix: { type: 'string', example: 'nxs_a1b2c3d' },
                          last_used: { type: 'string', format: 'date-time', nullable: true },
                          expires_at: { type: 'string', format: 'date-time', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Create API key',
        operationId: 'createKey',
        tags: ['API Keys'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'CI/CD Pipeline' },
                  expires_at: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Key created — `key` field only shown in this response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    key_prefix: { type: 'string' },
                    expires_at: { type: 'string', format: 'date-time', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                    key: { type: 'string', description: 'Full API key — only shown once, store securely' },
                    warning: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/keys/{id}': {
      delete: {
        summary: 'Revoke API key',
        operationId: 'deleteKey',
        tags: ['API Keys'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Revoked' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/webhooks': {
      get: {
        summary: 'List webhooks',
        operationId: 'listWebhooks',
        tags: ['Webhooks'],
        responses: {
          '200': {
            description: 'Webhooks list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    webhooks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          url: { type: 'string' },
                          events: { type: 'array', items: { type: 'string' } },
                          active: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Register webhook',
        operationId: 'createWebhook',
        tags: ['Webhooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri', example: 'https://your-app.com/webhooks/nexsight' },
                  events: {
                    type: 'array',
                    items: { type: 'string', enum: ['scan.done', 'scan.failed'] },
                    default: ['scan.done', 'scan.failed'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook registered — `secret` only shown in this response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    active: { type: 'boolean' },
                    created_at: { type: 'string', format: 'date-time' },
                    secret: { type: 'string', description: 'HMAC secret — only shown once, store securely' },
                    warning: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/webhooks/{id}': {
      delete: {
        summary: 'Delete webhook',
        operationId: 'deleteWebhook',
        tags: ['Webhooks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' }, '401': { description: 'Unauthorized' } },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}

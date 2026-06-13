export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Hosterix Hotel Management API',
    version: '1.0.0',
    description: 'API documentation for Hosterix - Hotel Management System',
    contact: {
      name: 'Hosterix Team',
      email: 'support@hosterix.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
      },
    },
    schemas: {
      Hotel: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          currency: { type: 'string' },
          taxRate: { type: 'number' },
          logo: { type: 'string' },
          taxId: { type: 'string' },
          timezone: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RoomType: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          code: { type: 'string' },
          basePrice: { type: 'number' },
          capacity: { type: 'integer' },
          amenities: { type: 'string' },
          hotelId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'string' },
          floor: { type: 'integer' },
          roomTypeId: { type: 'string' },
          hotelId: { type: 'string' },
          status: { type: 'string', enum: ['available', 'occupied', 'maintenance', 'out-of-order', 'cleaning'] },
          cleaningStatus: { type: 'string', enum: ['clean', 'dirty', 'inspecting'] },
          smoking: { type: 'boolean' },
          view: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Guest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          idNumber: { type: 'string' },
          nationality: { type: 'string' },
          vip: { type: 'boolean' },
          dateOfBirth: { type: 'string', format: 'date-time' },
          hotelId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          status: { type: 'string', enum: ['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'] },
          checkIn: { type: 'string', format: 'date-time' },
          checkOut: { type: 'string', format: 'date-time' },
          adults: { type: 'integer' },
          children: { type: 'integer' },
          roomRate: { type: 'number' },
          totalNights: { type: 'integer' },
          totalAmount: { type: 'number' },
          paidAmount: { type: 'number' },
          source: { type: 'string' },
          specialRequests: { type: 'string' },
          depositAmount: { type: 'number' },
          guestId: { type: 'string' },
          roomId: { type: 'string' },
          hotelId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'issued', 'paid', 'cancelled', 'refunded'] },
          date: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time' },
          subtotal: { type: 'number' },
          taxAmount: { type: 'number' },
          total: { type: 'number' },
          paidAmount: { type: 'number' },
          guestId: { type: 'string' },
          bookingId: { type: 'string' },
          hotelId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/hotels': {
      get: {
        tags: ['Hotels'],
        summary: 'List hotels',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of hotels',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Hotels'],
        summary: 'Create hotel',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Hotel' },
            },
          },
        },
        responses: {
          '201': { description: 'Hotel created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/hotels/{id}': {
      get: {
        tags: ['Hotels'],
        summary: 'Get hotel by ID',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Hotel details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } } },
          '404': { description: 'Hotel not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Hotels'],
        summary: 'Update hotel',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } },
        },
        responses: {
          '200': { description: 'Hotel updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } } },
        },
      },
      delete: {
        tags: ['Hotels'],
        summary: 'Delete hotel',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Hotel deleted' },
          '404': { description: 'Hotel not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/room-types': {
      get: {
        tags: ['Room Types'],
        summary: 'List room types',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of room types', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Room Types'],
        summary: 'Create room type',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RoomType' } } },
        },
        responses: {
          '201': { description: 'Room type created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RoomType' } } } },
        },
      },
    },
    '/rooms': {
      get: {
        tags: ['Rooms'],
        summary: 'List rooms',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of rooms', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Rooms'],
        summary: 'Create room',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
        },
        responses: {
          '201': { description: 'Room created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
        },
      },
    },
    '/guests': {
      get: {
        tags: ['Guests'],
        summary: 'List guests',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of guests', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Guests'],
        summary: 'Create guest',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Guest' } } },
        },
        responses: {
          '201': { description: 'Guest created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Guest' } } } },
        },
      },
    },
    '/guests/search': {
      get: {
        tags: ['Guests'],
        summary: 'Search guests by name/email/phone',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Guest' } } } } },
        },
      },
    },
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List bookings',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
          { name: 'checkIn', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'checkOut', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': { description: 'List of bookings', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create booking',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } },
        },
        responses: {
          '201': { description: 'Booking created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
        },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking by ID',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Booking details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
          '404': { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Bookings'],
        summary: 'Update booking',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } },
        },
        responses: {
          '200': { description: 'Booking updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
        },
      },
      delete: {
        tags: ['Bookings'],
        summary: 'Delete booking',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Booking deleted' },
          '404': { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List invoices',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'hotelId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of invoices', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create invoice',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } },
        },
        responses: {
          '201': { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
        },
      },
    },
    '/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice by ID',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Invoice details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
          '404': { description: 'Invoice not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/invoices/{id}/generate-pdf': {
      post: {
        tags: ['Invoices'],
        summary: 'Generate invoice PDF',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'PDF generated', content: { 'application/pdf': {} } },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Service healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, database: { type: 'string' } } } } } },
          '503': { description: 'Service unhealthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, database: { type: 'string' }, error: { type: 'string' } } } } } },
        },
      },
    },
    '/seed': {
      post: {
        tags: ['Seed'],
        summary: 'Seed database with demo data',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'Seed data created', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, hotelId: { type: 'string' } } } } } },
          '409': { description: 'Data already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  tags: [
    { name: 'Hotels', description: 'Hotel management' },
    { name: 'Room Types', description: 'Room type management' },
    { name: 'Rooms', description: 'Room management' },
    { name: 'Guests', description: 'Guest management' },
    { name: 'Bookings', description: 'Booking management' },
    { name: 'Invoices', description: 'Invoice management' },
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Seed', description: 'Database seeding' },
  ],
};
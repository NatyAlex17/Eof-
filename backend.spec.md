# Backend Specification — EOF/Mana ERP Platform

**Project**: EOF Mana ERP Modernization  
**Framework**: NestJS v11 (Node.js/TypeScript)  
**Database**: PostgreSQL (hosted on Supabase)  
**Test Framework**: Jest  
**Package Manager**: pnpm v9  
**Type System**: TypeScript v5.7  
**Last Updated**: 2026-07-15

---

## 1. Project Overview

The **Mana Backend API** serves as the server-side business logic layer for the ERP platform. Currently in **early-stage development** with basic module structure. The backend will eventually handle:

- Authentication & authorization (JWT-based with Supabase)
- Business logic layer between frontend and database
- External service integrations (QuickBooks Online, HubSpot, SendGrid, Twilio)
- Async jobs (invoice syncing, reconciliation, reports)
- Audit logging & compliance
- API rate limiting & request validation
- WebSocket support for real-time updates

### Current State

- **Minimal setup**: Basic NestJS app with app.controller, app.service
- **Database access**: Will use Prisma ORM (not yet integrated)
- **No modules yet**: Ready for feature development

---

## 2. Architecture Overview

### 2.1 Technology Stack

```
Client (Frontend)
    ↓ HTTP/WebSocket
NestJS Server
    ├── Auth Module (Supabase JWT verification)
    ├── Orders Module (business logic, validation)
    ├── Inventory Module (allocation, fulfillment)
    ├── Finance Module (invoicing, QBO sync)
    ├── Vendor Module (vendor management, settlements)
    ├── Integration Module (external APIs)
    └── Reporting Module (dashboards, exports)
    ↓ Prisma ORM
PostgreSQL (Supabase)
```

### 2.2 Communication Pattern

**Current (Direct Frontend → Supabase)**

```
Next.js Client
    → @supabase/supabase-js (RLS enforced)
    → PostgreSQL
```

**Future (Frontend → NestJS → Supabase)**

```
Next.js Client
    → NestJS API (port 4000)
    → Prisma ORM
    → PostgreSQL
```

### 2.3 Design Principles

- **Single Responsibility**: Each module handles one domain (Orders, Inventory, Finance, etc.)
- **Dependency Injection**: NestJS DI container for loose coupling
- **Request/Response DTOs**: Validate & transform data at API boundaries
- **Error Handling**: Centralized exception filters for consistency
- **Logging**: Structured logging (winston or built-in) for debugging & audit trails
- **Testing**: Unit tests for services, e2e tests for API flows

---

## 3. Directory Structure

### 3.1 Current Structure

```
apps/api/
├── src/
│   ├── main.ts                 # Bootstrap NestJS app
│   ├── app.module.ts           # Root module (imports feature modules)
│   ├── app.controller.ts       # Health check & root routes
│   ├── app.service.ts
│   │
│   ├── auth/                   # Authentication & authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts     # JWT verification, RLS enforcement
│   │   ├── auth.guard.ts       # JWT auth guard
│   │   └── auth.decorator.ts   # @CurrentUser(), @HasRole() decorators
│   │
│   ├── orders/                 # Order management (INCOMING)
│   │   ├── orders.module.ts
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts   # Business logic
│   │   ├── dto/
│   │   │   ├── create-order.dto.ts
│   │   │   ├── update-order.dto.ts
│   │   │   └── order.dto.ts    # Response DTO
│   │   ├── entities/
│   │   │   └── order.entity.ts # Prisma schema entity
│   │   └── orders.spec.ts      # Unit tests
│   │
│   ├── inventory/              # Lot, box, allocation logic
│   │   ├── inventory.module.ts
│   │   ├── inventory.controller.ts
│   │   ├── inventory.service.ts
│   │   ├── allocation.service.ts
│   │   ├── dto/
│   │   └── inventory.spec.ts
│   │
│   ├── finance/                # Invoicing, credits, settlements
│   │   ├── finance.module.ts
│   │   ├── invoices.service.ts
│   │   ├── credits.service.ts
│   │   ├── settlements.service.ts
│   │   └── finance.spec.ts
│   │
│   ├── integrations/           # External API integrations
│   │   ├── integrations.module.ts
│   │   ├── quickbooks/
│   │   │   ├── qbo.service.ts
│   │   │   └── qbo.types.ts
│   │   ├── hubspot/
│   │   ├── sendgrid/
│   │   ├── twilio/
│   │   └── integrations.spec.ts
│   │
│   ├── reporting/              # Dashboards, exports, analytics
│   │   ├── reporting.module.ts
│   │   ├── reporting.service.ts
│   │   └── reporting.spec.ts
│   │
│   ├── common/                 # Shared utilities
│   │   ├── filters/            # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/       # Logging, request/response
│   │   │   └── logging.interceptor.ts
│   │   ├── guards/             # Auth, role-based guards
│   │   ├── pipes/              # Validation pipes
│   │   ├── decorators/         # Custom decorators
│   │   └── utils/              # Helper functions
│   │
│   └── database/               # Prisma setup
│       ├── prisma.module.ts
│       ├── prisma.service.ts   # Singleton for DB access
│       └── schema.prisma       # (in prisma/ folder)
│
├── test/
│   ├── app.e2e-spec.ts         # End-to-end tests
│   ├── jest-e2e.json           # Jest config for e2e
│   └── fixtures/               # Test data
│
├── prisma/
│   ├── schema.prisma           # Prisma schema (mirrors PostgreSQL)
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Seed data script
│
├── .env.example
├── .env                        # (local only, not committed)
├── package.json
├── tsconfig.json               # TS config (extends ../tsconfig.base.json)
├── jest.config.js              # Test config
├── Dockerfile                  # For containerized deployment
└── README.md
```

### 3.2 Future Structure (Planned)

As the backend grows, add:

- `src/queue/` — Bull for async job processing
- `src/websocket/` — WebSocket gateway for real-time sync
- `src/audit/` — Audit logging service
- `src/cache/` — Redis caching layer (optional)

---

## 4. Core Concepts

### 4.1 NestJS Module Pattern

Each feature is a **module** that encapsulates:

- **Controller** — HTTP endpoints
- **Service** — Business logic
- **DTOs** — Data validation
- **Entities** — Domain models

```typescript
// orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // Make available to other modules
})
export class OrdersModule {}
```

### 4.2 Request Flow

```
HTTP Request
    ↓
Controller (route handler)
    ↓
Guards (auth, roles)
    ↓
Pipes (validation, transformation)
    ↓
Service (business logic)
    ↓
Prisma (database access)
    ↓
PostgreSQL
    ↓
Response (DTO) → Serializer → JSON
```

### 4.3 Error Handling

Use **HttpException** for API errors:

```typescript
throw new HttpException(
  { message: 'Order not found', code: 'ORDER_NOT_FOUND' },
  HttpStatus.NOT_FOUND
);
```

Use **custom exception filters** for centralized error handling:

```typescript
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.getResponse(),
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 5. Database Layer (Prisma ORM)

### 5.1 Prisma Setup

**Installation** (when integrating):

```bash
npm install @prisma/client
npm install -D prisma
```

**Schema** (`prisma/schema.prisma`):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Order {
  id        String   @id @default(cuid())
  customerId String
  customer  Customer @relation(fields: [customerId], references: [id])
  total     Float
  status    String   @default("pending")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([customerId])
  @@index([status])
}
```

### 5.2 Prisma Service (Singleton)

```typescript
// database/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

### 5.3 Usage in Services

```typescript
// orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.order.findMany();
  }

  async create(data: CreateOrderDto) {
    return this.prisma.order.create({ data });
  }
}
```

### 5.4 Migrations

```bash
# Create migration after schema change
npx prisma migrate dev --name add_order_table

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

---

## 6. Authentication & Authorization

### 6.1 Auth Module (Supabase JWT)

```typescript
// auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Admin key for server
  );

  async verifyToken(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error) throw new UnauthorizedException();
    return data.user;
  }
}
```

### 6.2 JWT Auth Guard

```typescript
// auth/auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends PassportAuthGuard('jwt') {}
```

### 6.3 Role-Based Access Control (RBAC)

```typescript
// auth/auth.decorator.ts
export const HasRole = (...roles: Role[]) => SetMetadata('roles', roles);

// auth/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // No role requirement

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
```

### 6.4 Using Guards in Controllers

```typescript
// orders/orders.controller.ts
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  @Get()
  @HasRole('admin', 'ops')
  findAll() {
    return this.ordersService.findAll();
  }
}
```

---

## 7. API Endpoints (Planned)

### 7.1 Orders Module

```
GET    /api/orders              List orders (admin) or own orders (customer)
GET    /api/orders/:id          Get order details
POST   /api/orders              Create new order
PATCH  /api/orders/:id          Update order
DELETE /api/orders/:id          Cancel order (soft delete)

GET    /api/orders/:id/lines    Get line items
POST   /api/orders/:id/lines    Add line item
```

### 7.2 Inventory Module

```
GET    /api/inventory           List all lots & boxes
GET    /api/inventory/:id       Get lot details
POST   /api/inventory/import    Bulk import from vendor file

GET    /api/inventory/:id/boxes Get boxes in lot
POST   /api/allocation          Allocate box to order
DELETE /api/allocation/:id      Un-allocate
```

### 7.3 Finance Module

```
GET    /api/invoices            List invoices
GET    /api/invoices/:id        Get invoice
POST   /api/invoices            Create invoice from order

GET    /api/credits             List credit claims
POST   /api/credits             Submit credit claim

GET    /api/settlements         List vendor settlements
POST   /api/settlements/sync    Sync to QuickBooks
```

### 7.4 Integrations Module

```
POST   /api/integrations/qbo/sync        Sync orders → QBO
POST   /api/integrations/qbo/webhook     QBO webhook handler
POST   /api/integrations/hubspot/sync    Sync customers → HubSpot
```

### 7.5 Health & Admin

```
GET    /health                  Health check
GET    /api/admin/stats         System statistics
POST   /api/admin/audit-log     Audit log query
```

---

## 8. Data Transfer Objects (DTOs)

DTOs validate & transform API input/output.

### 8.1 DTO Pattern

```typescript
// orders/dto/create-order.dto.ts
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  ValidateNested,
  Type,
} from 'class-validator';

class OrderLineDto {
  @IsString()
  skuId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  grade?: string;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsDateString()
  shipDate: string;

  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}

// orders/dto/order.dto.ts
export class OrderDto {
  id: string;
  customerId: string;
  total: number;
  status: string;
  createdAt: Date;
}
```

### 8.2 Auto-Validation Pipe

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

This ensures:

- DTO validation (required fields, types)
- Whitelist (unknown properties stripped)
- Transform (string → number, etc.)

---

## 9. Services & Business Logic

### 9.1 Service Template

```typescript
// orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const where = userId ? { customerId: userId } : {};
    return this.prisma.order.findMany({ where });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(data: CreateOrderDto) {
    return this.prisma.order.create({ data });
  }

  async update(id: string, data: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() }, // Soft delete
    });
  }
}
```

### 9.2 Complex Service Example (Allocation)

```typescript
// inventory/allocation.service.ts
@Injectable()
export class AllocationService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService
  ) {}

  async allocateBoxToOrder(boxId: string, orderId: string) {
    // Validation
    const [box, order] = await Promise.all([
      this.prisma.box.findUnique({ where: { id: boxId } }),
      this.ordersService.findOne(orderId),
    ]);

    if (!box || !order) throw new NotFoundException();

    // Check box matches order species
    const orderLines = await this.prisma.orderLine.findMany({
      where: { orderId },
    });

    const boxContents = await this.prisma.boxContent.findMany({
      where: { boxId },
    });

    // Complex matching logic
    const isCompatible = this.checkCompatibility(orderLines, boxContents);
    if (!isCompatible) throw new BadRequestException('Box species mismatch');

    // Allocate
    return this.prisma.allocation.create({
      data: { boxId, orderId },
    });
  }

  private checkCompatibility(orderLines: OrderLine[], boxContents: BoxContent[]): boolean {
    // Implementation
    return true;
  }
}
```

---

## 10. Controllers

### 10.1 Controller Template

```typescript
// orders/orders.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderDto } from './dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  async findAll(@CurrentUser() user) {
    // Admin sees all, customers see own
    const userId = user.role === 'admin' ? undefined : user.id;
    return this.ordersService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
```

---

## 11. Testing

### 11.1 Unit Tests (Services)

```typescript
// orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../database/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find all orders', async () => {
    const mockOrders = [{ id: '1', customerId: 'c1', total: 100 }];
    jest.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders);

    const result = await service.findAll();
    expect(result).toEqual(mockOrders);
  });

  it('should throw NotFoundException when order not found', async () => {
    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

    await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
  });
});
```

### 11.2 E2E Tests (API)

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /orders should return all orders', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /orders should create order', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        customerId: 'c1',
        shipDate: '2026-07-20',
        lines: [{ skuId: 's1', quantity: 10 }],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 11.3 Running Tests

```bash
pnpm test                       # Run all tests
pnpm test:watch                 # Watch mode
pnpm test:cov                   # Coverage report
pnpm test:e2e                   # E2E tests only
```

---

## 12. Environment Variables

### 12.1 .env.example

```bash
# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eof_mana

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

# External APIs
QBO_CLIENT_ID=...
QBO_CLIENT_SECRET=...
QBO_REALM_ID=...

HUBSPOT_API_KEY=...
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Logging
LOG_LEVEL=debug
```

---

## 13. Development Workflow

### 13.1 Add a New Feature Module

```bash
# Create module structure
mkdir -p src/feature-name/{dto,entities}
touch src/feature-name/{feature-name.module.ts,feature-name.controller.ts,feature-name.service.ts}

# Add to app.module.ts imports
```

### 13.2 Add a Database Entity

1. **Update Prisma schema** (`prisma/schema.prisma`)
2. **Create migration**: `npx prisma migrate dev --name add_entity`
3. **Create service** using the entity
4. **Create controller** exposing CRUD endpoints
5. **Create DTOs** for validation
6. **Write tests**

### 13.3 Integrate External API

1. Create service in `src/integrations/{service-name}/`
2. Define types/interfaces for external API
3. Create methods for common operations
4. Add error handling & retry logic
5. Write tests (mock external calls)
6. Add environment variables

Example (QuickBooks):

```typescript
// integrations/quickbooks/qbo.service.ts
@Injectable()
export class QboService {
  private readonly client = new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID,
    clientSecret: process.env.QBO_CLIENT_SECRET,
    environment: 'production',
    redirectUri: 'http://localhost:4000/integrations/qbo/callback',
  });

  async syncOrder(order: Order) {
    // Convert to QBO Invoice format
    // POST to QBO API
    // Handle errors & retry
  }
}
```

---

## 14. Common Patterns

### 14.1 Pagination

```typescript
@Get()
async findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    this.prisma.order.findMany({ skip, take: limit }),
    this.prisma.order.count(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}
```

### 14.2 Filtering & Search

```typescript
async findAll(filters: {
  status?: string;
  customerId?: string;
  createdAfter?: Date;
  search?: string;
}) {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.createdAfter && { createdAt: { gte: filters.createdAfter } }),
    ...(filters.search && {
      OR: [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ],
    }),
  };

  return this.prisma.order.findMany({ where });
}
```

### 14.3 Nested Relations

```typescript
async findOneWithDetails(id: string) {
  return this.prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      lines: {
        include: {
          sku: true,
          allocations: true,
        },
      },
    },
  });
}
```

### 14.4 Transactions

```typescript
async transferBoxes(fromLotId: string, toOrderId: string, boxIds: string[]) {
  return this.prisma.$transaction(async (tx) => {
    // Step 1: Fetch boxes
    const boxes = await tx.box.findMany({
      where: { id: { in: boxIds } },
    });

    // Step 2: Validate
    if (boxes.length !== boxIds.length) {
      throw new BadRequestException('Some boxes not found');
    }

    // Step 3: Update allocations (all or nothing)
    await tx.allocation.createMany({
      data: boxIds.map((id) => ({ boxId: id, orderId: toOrderId })),
    });

    return { allocated: boxIds.length };
  });
}
```

---

## 15. Deployment

### 15.1 Build & Start

```bash
pnpm build                      # Compile TypeScript → dist/
pnpm start                      # Run dist/main.js (production)
pnpm start:prod                 # Production mode
```

### 15.2 Docker Deployment

```bash
docker build -t eof-mana-api:latest -f apps/api/Dockerfile .
docker run -e DATABASE_URL=... -p 4000:4000 eof-mana-api:latest
```

### 15.3 Environment Management

- **Local**: `.env` (not committed)
- **Staging**: Environment variables in deployment platform
- **Production**: Secrets manager (AWS Secrets Manager, Hashicorp Vault, etc.)

---

## 16. Monitoring & Logging

### 16.1 Structured Logging (Winston)

```typescript
// common/logger.ts
import { Logger } from '@nestjs/common';

export const logger = new Logger('AppLogger');

// Usage in services
logger.log('Order created', { orderId: '123', customerId: 'c1' });
logger.error('Allocation failed', { reason: 'Species mismatch' }, 'AllocationService');
```

### 16.2 Request Logging Interceptor

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        logger.log(`${req.method} ${req.path}`, { duration });
      })
    );
  }
}
```

---

## 17. Troubleshooting

### Issue: "Cannot find module @nestjs/..."

**Solution**: Run `pnpm install`

### Issue: Database migration fails

**Solution**: Check `.env` DATABASE_URL. Ensure PostgreSQL is running.

### Issue: Port 4000 already in use

**Solution**:

```bash
lsof -i :4000         # Find process
kill -9 <PID>         # Kill process
```

### Issue: Prisma schema out of sync

**Solution**:

```bash
npx prisma db pull                # Pull schema from DB
npx prisma generate              # Regenerate client
```

---

## 18. Resources & Links

- **NestJS Docs**: https://docs.nestjs.com
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Jest Testing**: https://jestjs.io

---

## Glossary

- **DTO** — Data Transfer Object (input/output validation)
- **ORM** — Object-Relational Mapping (Prisma)
- **RLS** — Row-Level Security (database policy)
- **JWT** — JSON Web Token (stateless auth)
- **RBAC** — Role-Based Access Control
- **E2E** — End-to-End testing (full API flow)
- **Prisma Client** — Type-safe database query builder

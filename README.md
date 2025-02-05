# Medication Order Delivery System Backend

A comprehensive backend system built with NestJS for managing medication orders and deliveries. This system handles user
authentication, medication inventory, order processing, payments, and delivery partner management.

## 🚀 Features

### User Management

- User registration and authentication
- Role-based access control (Admin/User)
- Email verification
- Password reset functionality
- Social authentication support
- Profile management

### Medication Management

- Complete CRUD operations for medications
- Inventory tracking
- Pagination and filtering support
- Caching for improved performance

### Order Processing

- Order creation and management
- Real-time order status updates
- Integration with payment gateway
- Delivery tracking
- Special instructions handling

### Payment Processing

- Secure payment integration with Paystack
- Payment status tracking
- Transaction history
- Refund handling

### Delivery Partner Management

- Partner registration and management
- Order assignment
- Delivery status updates
- Performance tracking

### System Features

- Redis caching for improved performance
- Winston logger for comprehensive logging
- JWT authentication
- Global exception handling
- Input validation
- Database migrations
- TypeORM integration
- Environmental configuration

## 🛠 Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Caching**: Redis
- **Authentication**: JWT
- **Payment**: Paystack
- **Email**: NodeMailer
- **Logging**: Winston
- **Testing**: Jest

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Redis
- npm or yarn
- PayStack Account (for payments)

## 🔧 Installation

1. Clone the repository:

```bash
git clone https://github.com/johnkrator/medication-order-delivery-system-backend
cd medication-order-delivery-system-backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration values.

4. Database setup:

```bash
npm run migration:run
```

## 🚀 Running the Application

### Development mode:

```bash
npm run start:dev
```

### Production mode:

```bash
npm run build
npm run start:prod
```

### Running tests:

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📁 Project Structure

```
src/
├── common/             # Common utilities and decorators
├── config/            # Configuration files
├── delivery-partner/  # Delivery partner module
├── email/            # Email service module
├── enums/            # Shared enums
├── guards/           # Authentication guards
├── logger/           # Logging configuration
├── medication/       # Medication module
├── order/           # Order processing module
├── payment/         # Payment processing module
├── services/        # Shared services
├── strategies/      # Authentication strategies
└── user/            # User management module
```

## 🔐 Environment Variables

Required environment variables:

```env
# Application
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=medication_delivery

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m

# PayStack
PAYSTACK_SECRET_KEY=your-paystack-secret-key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

## 📜 API Documentation

The API documentation is available at `/api/docs` when running the application. It includes detailed information about
all endpoints, request/response schemas, and authentication requirements.

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Request validation
- Rate limiting
- CORS configuration
- Secure password hashing
- Protected routes
- Input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

1. Email - cchidieberejohn@gmail.com
2. Project Link: https://github.com/johnkrator/medication-order-delivery-system-backend
3. Deployed API Link: https://pharmatradeapi.vercel.app/api
4. Deployed API Doc
   Link: https://documenter.getpostman.com/view/18462993/2sAYX6p1xN#8ddbe654-8b2e-4f15-a845-c88b7fc62e44

## 🙏 Acknowledgments

- NestJS Team
- TypeORM Contributors
- PayStack API Team
- Vercel

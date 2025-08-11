# AQB - Adaptive Question Bank

A modern quiz and question bank management application built with Angular and NestJS, designed for creating, managing, and practicing with custom question banks.

## 🚀 Features

- **Question Bank Management**: Create and manage collections of questions with multiple-choice answers
- **Quiz Practice Mode**: Interactive quiz interface with instant feedback
- **Import/Export**: Bulk import questions and export question banks
- **User Authentication**: Secure JWT-based authentication with email verification
- **Statistics Tracking**: Track quiz performance and view detailed statistics
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend

- **Angular 20.1** - Modern web application framework
- **Angular Material** - Material Design UI components
- **RxJS** - Reactive programming
- **Vite** - Fast build tool
- **TypeScript** - Type-safe JavaScript

### Backend

- **NestJS 11** - Progressive Node.js framework
- **TypeORM** - Object-relational mapping
- **PostgreSQL** - Relational database
- **JWT** - JSON Web Token authentication
- **Bcrypt** - Password hashing
- **Resend** - Email service

### Development Tools

- **Nx** - Monorepo management and build system
- **Docker** - Containerization
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Playwright** - E2E testing
- **Vitest** - Unit testing

## 📦 Project Structure

```
aqb/
├── apps/
│   ├── aqb/              # Angular frontend application
│   │   └── src/
│   │       ├── app/
│   │       │   ├── core/         # Core services, guards, interceptors
│   │       │   ├── features/     # Feature modules
│   │       │   │   ├── auth/     # Authentication
│   │       │   │   ├── question-bank/  # Question bank management
│   │       │   │   ├── quiz/     # Quiz practice
│   │       │   │   └── statistics/     # Performance statistics
│   │       │   └── layouts/      # Layout components
│   │       └── styles.scss       # Global styles
│   ├── api/              # NestJS backend API
│   │   └── src/
│   │       └── app/
│   │           ├── auth/         # Authentication module
│   │           ├── dto/          # Data transfer objects
│   │           ├── entities/     # Database entities
│   │           ├── question-bank/  # Question bank module
│   │           └── user/         # User module
│   └── aqb-e2e/          # E2E tests
├── libs/
│   └── data-access/      # Shared data access library
│       └── src/
│           └── lib/
│               ├── api-services/  # API service interfaces
│               └── interfaces/    # Shared interfaces
├── docker-compose.yml    # Docker configuration
└── nx.json              # Nx workspace configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for database)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd aqb
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Start the PostgreSQL database:

```bash
npm run docker:db
```

5. Run database migrations (if any):

```bash
npm run migration:run
```

### Development

Start both frontend and backend in development mode:

```bash
# Terminal 1 - Start the backend API
npm run api:dev

# Terminal 2 - Start the frontend
npm run dev
```

Access the applications:

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- pgAdmin: http://localhost:5050 (if using Docker)

## 📝 Available Scripts

### Frontend

- `npm run dev` - Start frontend dev server
- `npm run build` - Build frontend for production
- `npm run test` - Run frontend tests
- `npm run lint` - Lint frontend code
- `npm run e2e` - Run E2E tests

### Backend

- `npm run api:dev` - Start backend dev server
- `npm run api:build` - Build backend for production
- `npm run api:start` - Start production backend
- `npm run start:prod` - Start production server

### Docker

- `npm run docker:db` - Start PostgreSQL database only
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop all Docker services
- `npm run docker:logs` - View Docker logs
- `npm run docker:rebuild` - Rebuild Docker images

## 🐳 Docker Setup

For a complete Docker setup including PostgreSQL and pgAdmin:

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

See [README-DOCKER.md](./README-DOCKER.md) for detailed Docker instructions.

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run e2e
```

## 📊 Database Schema

The application uses the following main entities:

- **User** - User accounts with authentication
- **QuestionBank** - Collections of questions
- **Question** - Individual questions
- **Answer** - Multiple choice answers
- **OTPCode** - One-time password codes for email verification

## 🔐 Authentication

The application uses JWT-based authentication with:

- Email/password registration
- Email verification with OTP codes
- JWT access tokens
- Protected API routes

## 🎨 Features in Detail

### Question Bank Management

- Create and edit question banks
- Add multiple-choice questions
- Set correct answers
- Import questions in bulk
- Export question banks

### Quiz Practice

- Practice with any question bank
- Real-time answer feedback
- Progress tracking
- Performance statistics
- Keyboard navigation support

### Statistics

- Track quiz attempts
- View success rates
- Analyze performance over time
- Export statistics data

## 🚢 Deployment

### Production Build

```bash
# Build both frontend and backend
npm run build
npm run api:build

# Start production server
npm run start:prod
```

### Environment Variables

Key environment variables for production:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aqb_production
DATABASE_USER=postgres
DATABASE_PASSWORD=<secure-password>

# JWT
JWT_SECRET=<secure-secret>
JWT_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=noreply@yourdomain.com

# Application
NODE_ENV=production
PORT=3000
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues and questions, please use the GitHub issue tracker.

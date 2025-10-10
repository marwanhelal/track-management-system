# Professional Track Management System (CDTMS)

Enterprise-grade project tracking and management system for design and construction projects.

## 🎯 Overview

CDTMS is a comprehensive project management system designed specifically for design and construction firms. It provides real-time tracking of project phases, work hours, team collaboration, and intelligent progress monitoring.

## ✨ Key Features

- **Project Management** - Create and manage multiple projects with custom phases
- **Phase Tracking** - Track project phases with dependencies and progress monitoring
- **Work Log System** - Detailed time tracking for engineers and team members
- **Progress Adjustment** - Manual progress adjustments with supervisor approval
- **Real-time Updates** - Socket.IO powered live updates
- **Comprehensive Analytics** - Project health, team performance, and export capabilities
- **Role-Based Access** - Supervisor, Engineer, and Administrator roles
- **Smart Warnings** - Automated alerts for delays and budget overruns
- **Export Functionality** - JSON, CSV, and PDF report generation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 12+
- Git

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd cdtms

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev

# Setup frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
npm start
```

Visit [Quick Start Guide](./docs/deployment/quick-start.md) for detailed setup instructions.

## 📁 Project Structure

```
├── backend/          # Node.js/Express/PostgreSQL API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation
│   │   ├── database/     # DB connection
│   │   └── types/        # TypeScript types
│   └── scripts/      # Utility scripts
│
├── frontend/         # React/TypeScript UI
│   ├── src/
│   │   ├── pages/        # Route components
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API services
│   │   ├── contexts/     # React contexts
│   │   └── types/        # TypeScript types
│   └── build/        # Production build
│
├── database/         # Schema and migrations
│   ├── migrations/   # SQL migrations
│   ├── schema.sql    # Database schema
│   └── seeds.sql     # Sample data
│
├── deployment/       # Deployment configs
│   ├── docker/       # Docker configurations
│   └── nginx/        # Nginx configurations
│
├── scripts/          # Utility scripts
│   ├── backup/       # Backup scripts
│   ├── testing/      # Test scripts
│   └── deployment/   # Deployment scripts
│
└── docs/             # Documentation
    ├── deployment/   # Deployment guides
    ├── development/  # Development guides
    ├── operations/   # Operations guides
    └── architecture/ # Architecture docs
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Validation**: express-validator
- **Security**: Helmet, rate limiting, CORS

### Frontend
- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v7
- **State Management**: React Context API
- **Real-time**: Socket.IO Client
- **Charts**: Recharts
- **PDF Generation**: jsPDF

### DevOps
- **Containerization**: Docker
- **Web Server**: Nginx
- **Process Manager**: PM2
- **Version Control**: Git

## 📖 Documentation

Comprehensive documentation is available in the [`/docs`](./docs) directory:

- **[Deployment Guides](./docs/deployment/)** - How to deploy to various platforms
- **[Development Guides](./docs/development/)** - Development setup and guidelines
- **[Operations Guides](./docs/operations/)** - Maintenance and operations
- **[Architecture](./docs/architecture/)** - System architecture and design

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run comprehensive system test
node scripts/testing/comprehensive-system-test.js
```

See [Testing Guide](./docs/development/testing-guide.md) for details.

## 🚀 Deployment

Multiple deployment options are available:

- **Contabo VPS** - Full-stack deployment
- **Contabo + Vercel** - Backend on Contabo, frontend on Vercel
- **Hostinger** - Shared hosting deployment
- **Docker** - Containerized deployment

See [Deployment Documentation](./docs/deployment/) for platform-specific guides.

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/track_management
JWT_SECRET=your-secret-key
PORT=5005
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5005
```

## 👥 Team

- **Architect**: Hesham Helal
- **System Engineer**: Marwan Helal

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the [documentation](./docs)
- Review [session summaries](./docs/operations/session-summaries/)

---

**Version**: 2.0 (Refactored October 2025)
**Status**: Production Ready

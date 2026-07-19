# Richy's Eat - Enterprise Restaurant E-Commerce Ecosystem

![Status](https://img.shields.io/badge/status-active-success)
![Firebase](https://img.shields.io/badge/firebase-integrated-orange)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

A fully functional restaurant e-commerce platform with a unified admin management system, real-time rider delivery tracking, a complete customer-facing ordering experience, and a WebSocket sync server. All dashboards are integrated into one cohesive system powered by Firebase.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Project Overview](#project-overview)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Architecture](#architecture)
6. [Data Flow](#data-flow)
7. [Firebase Collections](#firebase-collections)
8. [Authentication & Roles](#authentication--roles)
9. [Real-Time Sync Server](#real-time-sync-server)
10. [Order State Machine](#order-state-machine)
11. [Firestore Security Rules](#firestore-security-rules)
12. [Features](#features)
13. [PWA & Offline Support](#pwa--offline-support)
14. [Enterprise Features](#enterprise-features)
15. [AI & Analytics](#ai--analytics)
16. [Getting Started](#getting-started)
17. [Firebase Setup](#firebase-setup)
18. [Server Setup](#server-setup)
19. [Python Service Setup](#python-service-setup)
20. [Development](#development)
21. [Testing](#testing)
22. [Deployment](#deployment)
23. [Browser Support](#browser-support)
24. [Contributing](#contributing)
25. [Author](#author)
26. [License](#license)

---

## Live Demo

- **Main Site**: [Richy's Eat](https://abdulrashidyussif.github.io/yussif-eats/)
- **Admin Dashboard**: [Admin Panel](https://abdulrashidyussif.github.io/yussif-eats/admin.html)
- **Rider Dashboard**: [Rider Panel](https://abdulrashidyussif.github.io/yussif-eats/rider.html)

---

## Project Overview

**Richy's Eat** is a production-ready restaurant e-commerce platform that enables customers to browse menus, customize orders, and checkout online. It provides a unified admin dashboard for managing orders, reservations, menu items, customers, riders, and contact messages. A real-time WebSocket sync server ensures instant updates across all three dashboards (Customer, Admin, Rider) while maintaining a durable store in Firebase Firestore.

### Key Capabilities

- Multi-role platform: Customer, Admin, Rider
- Real-time order tracking and status updates
- Unified admin management system
- Rider delivery management with availability status
- Firebase Authentication (Email, Google, GitHub)
- Firestore NoSQL database with real-time listeners
- WebSocket sync server for instant cross-dashboard updates
- PWA with offline support via Service Worker
- REST API server for future integrations
- AI-powered analytics and predictions
- Payment processing support
- Inventory management
- Real-time messaging
- Reviews and ratings system

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | — | Semantic markup |
| CSS3 | — | Custom styles, CSS variables, animations |
| JavaScript | ES6+ | Modular ES modules |
| TypeScript | 5.3+ | Type safety (gradual migration) |
| Bootstrap | 5.3 | Responsive grid and components |
| Firebase SDK | 10.12.2 | Authentication and Firestore |
| Vite | 5.0+ | Build tool and dev server |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=18 | Server runtime |
| Express.js | 4.18+ | REST API server |
| ws | 8.18+ | WebSocket server |
| firebase-admin | 12.7+ | Server-side Firestore and auth |
| Redis | 7+ | Caching and sessions |

### AI/Analytics

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109+ | Python API framework |
| Pandas | 2.2+ | Data processing |
| NumPy | 1.26+ | Numerical computing |
| Scikit-Learn | 1.4+ | ML models |
| ReportLab | 4.0+ | PDF generation |
| OpenPyXL | 3.1+ | Excel generation |
| Plotly | 5.18+ | Charts |
| Matplotlib | 3.8+ | Visualizations |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| GitHub Actions | CI/CD |
| Firebase Hosting | Frontend hosting |
| Render/Railway | Backend deployment |

---

## Directory Structure

```
C:\Users\Abdul Rashid\Desktop\Commerce\
├── README.md                      # Main documentation
├── TRANSFORMATION_PLAN.md         # Enterprise transformation plan
├── TRANSFORMATION_SUMMARY.md      # Transformation completion report
├── TESTING.md                     # Testing guide
├── DEPLOYMENT.md                  # Deployment guide
├── docker-compose.yml             # All services orchestration
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # CI/CD pipeline
├── backend/                       # Future Python backend API
├── Documentation/                 # Template documentation
├── sarab/                         # PRIMARY FRONTEND
│   ├── index.html                 # Main customer-facing site
│   ├── admin.html                 # Unified admin dashboard
│   ├── rider.html                 # Rider dashboard
│   ├── profile.html               # User profile page
│   ├── product.html               # Product detail page
│   ├── dashboard.html             # Unified dashboard
│   ├── command-center.html        # Command center page
│   ├── offline.html               # Offline fallback
│   ├── manifest.json              # PWA manifest
│   ├── firestore.rules            # Firestore security rules
│   ├── sw.js                      # Service Worker
│   ├── admin.css                  # Admin dashboard styles
│   ├── admin.js                   # Admin dashboard JS
│   ├── rider.css                  # Rider dashboard styles
│   ├── rider.js                   # Rider dashboard JS
│   ├── profile.js                 # Profile page JS
│   ├── command-center.css/js      # Command center assets
│   ├── dashboard.js               # Dashboard JS
│   ├── product.js                 # Product page JS
│   ├── Dockerfile                 # Frontend Docker image
│   ├── nginx.conf                 # Nginx configuration
│   ├── package.json               # Frontend dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── vite.config.ts             # Vite build config
│   ├── css/                       # Compiled CSS
│   ├── js/                        # JavaScript modules
│   │   ├── firebase.js            # Firebase re-exports
│   │   ├── firebase-shared.js     # Core Firebase abstraction
│   │   ├── main.js                # Main site logic
│   │   ├── admin.js               # Admin logic
│   │   ├── profile.js             # Profile logic
│   │   └── product.js             # Product logic
│   ├── src/                       # Modern modular architecture
│   │   ├── modules/               # Feature modules
│   │   │   ├── orders.ts          # Order management
│   │   │   ├── menu.ts            # Menu management
│   │   │   ├── reservations.ts    # Reservation management
│   │   │   ├── riders.ts          # Rider management
│   │   │   ├── payments.ts        # Payment processing
│   │   │   ├── inventory.ts       # Inventory management
│   │   │   ├── messaging.ts       # Real-time messaging
│   │   │   ├── reviews.ts         # Reviews & ratings
│   │   │   └── notifications.ts   # Notification system
│   │   ├── components/            # Reusable UI components
│   │   │   ├── OrderCard.ts       # Order card component
│   │   │   ├── StatusBadge.ts     # Status badge component
│   │   │   └── RiderCard.ts       # Rider card component
│   │   ├── styles/                # Modern CSS
│   │   │   ├── variables.css      # Design tokens
│   │   │   ├── main.css           # Base styles
│   │   │   ├── components.css     # Component styles
│   │   │   ├── admin.css          # Admin styles
│   │   │   └── rider.css          # Rider styles
│   │   └── types/                 # TypeScript definitions
│   │       └── index.ts           # Core interfaces
│   └── tests/                     # Frontend tests
│       └── firebase-shared.test.ts
├── server/                        # BACKEND
│   ├── package.json               # Server dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── Dockerfile                 # Server Docker image
│   ├── docker-compose.yml         # Server compose
│   ├── .env.example               # Environment template
│   ├── index.js                   # Legacy WebSocket server
│   ├── firestore.rules            # Server-authoritative rules
│   ├── shared/
│   │   └── orderEngine.js         # Order state machine
│   ├── public/
│   │   └── rt-sync.js             # WebSocket client
│   ├── scripts/
│   │   └── migrate-orders.js      # Data migration script
│   └── src/                       # Modern API server
│       ├── index.ts               # Express app entry
│       ├── api/v1/
│       │   ├── index.ts           # API routes
│       │   └── health.ts          # Health checks
│       ├── middleware/
│       │   ├── auth.ts            # Authentication
│       │   └── rateLimit.ts       # Rate limiting
│       ├── services/
│       │   └── firestore.ts       # Firestore service
│       └── models/
│           └── index.ts           # TypeScript interfaces
└── python-service/                # AI/Analytics Microservice
    ├── requirements.txt           # Python dependencies
    ├── Dockerfile                 # Python service image
    ├── docker-compose.yml         # Service compose
    ├── app/
    │   ├── main.py                # FastAPI app
    │   ├── services/
    │   │   ├── analytics_service.py
    │   │   ├── report_service.py
    │   │   └── ml_service.py
    │   └── routers/
    │       ├── analytics.py
    │       ├── reports.py
    │       ├── predictions.py
    │       └── health.py
    └── tests/                     # Python tests
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (sarab/)                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Customer    │  │    Admin     │  │      Rider       │  │
│  │  index.html  │  │  admin.html  │  │  dashboard.html  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           ▼                                  │
│               ┌──────────────────────┐                       │
│               │   firebase-shared.js │ (Auth + Firestore)   │
│               └──────────┬──────────┘                       │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         │                ▼                │                  │
│         │     Firestore (Durable Store)   │                  │
│         │   users, orders, menu, riders   │                  │
│         │   reservations, contactMessages │                  │
│         └─────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket + REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (server/)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Express.js REST API                                 │    │
│  │  - Orders, Menu, Riders, Reservations                │    │
│  │  - Authentication via Firebase ID tokens              │    │
│  │  - Rate limiting, validation, logging                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WebSocket Server (Real-time Sync)                    │    │
│  │  - Instant order updates across all dashboards       │    │
│  │  - Rider assignment notifications                    │    │
│  │  - Live GPS tracking                                 │    │
│  │  - Presence tracking                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PYTHON AI SERVICE (python-service/)              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  FastAPI Microservice                                │    │
│  │  - Daily/Weekly/Monthly analytics                    │    │
│  │  - PDF/Excel/CSV report generation                   │    │
│  │  - Demand forecasting (RandomForest)                 │    │
│  │  - Customer segmentation (K-Means)                   │    │
│  │  - Anomaly detection                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Single Source of Truth

Orders exist only once in Firestore:

```
orders/{orderId}
├── customerId
├── customerProfile
├── riderId
├── items
├── pricing
├── coupon
├── discount
├── deliveryFee
├── payment
├── paymentStatus
├── orderStatus
├── tracking
├── notifications
├── timeline
├── activityLogs
├── timestamps
└── history
```

### Customer Queries
```javascript
orders WHERE customerId == currentUser.uid
```

### Admin Queries
```javascript
orders (all)
```

### Rider Queries
```javascript
orders WHERE riderId == currentUser.uid
```

---

## Firebase Collections

| Collection | Path | Purpose | Access |
|------------|------|---------|--------|
| Users | `users/{uid}` | User profiles | Customer + Admin |
| Orders | `orders/{id}` | All orders (single source) | Admin + Rider + Customer |
| Reservations | `reservations/{id}` | All reservations | Admin + Customer |
| Menu | `menu/{id}` | Menu items | All authenticated |
| Riders | `riders/{id}` | Rider profiles | Admin + Rider |
| Contact Messages | `contactMessages/{id}` | Contact form submissions | Admin |
| Notifications | `notifications/{id}` | Global notifications | Admin |
| User Notifications | `users/{uid}/notifications/{id}` | User-specific notifications | Customer |
| Activity Logs | `activityLogs/{id}` | Audit trail | Admin |
| Messages | `messages/{id}` | User-to-user messaging | Participants + Admin |
| Payments | `payments/{id}` | Payment records | Admin + Customer |
| Inventory | `inventory/{id}` | Stock management | Admin |
| Reviews | `reviews/{id}` | Order and rider reviews | All authenticated |

---

## Authentication & Roles

### Supported Authentication Methods

- **Email/Password**: Standard sign-up and login
- **Google Sign-In**: OAuth via Firebase Auth
- **GitHub Sign-In**: OAuth via Firebase Auth
- **Password Reset**: Email-based password reset

### Roles & Permissions

| Role | Identifier | Access |
|------|------------|--------|
| Admin | Email: `rashlast395@gmail.com` OR displayName: `rashlast395-prog` | Full admin dashboard access |
| Rider | User present in `riders` collection | Rider dashboard |
| Customer | Any authenticated user | Main site + profile |

---

## Real-Time Sync Server

### Technology

- **Runtime**: Node.js >= 18
- **WebSocket Library**: `ws` ^8.18.0
- **Firebase Admin SDK**: `firebase-admin` ^12.7.0

### Features

- Authenticates browser clients via Firebase ID tokens
- Maintains an in-memory authoritative view of orders synced to Firestore
- Validates every status change against a unified state machine
- Broadcasts real-time events over WebSockets
- Falls back to Firestore `onSnapshot` if the server is offline
- Exposes a `/health` HTTP endpoint
- Handles commands: `CREATE_ORDER`, `UPDATE_ORDER`, `SET_STATUS`, `ASSIGN_RIDER`, `DECLINE_RIDER`, `UPDATE_TRACKING`, `RIDER_LOCATION`, `MARK_NOTIF`

### WebSocket Client

`server/public/rt-sync.js` - Real-time sync WebSocket client loaded by the frontend.

---

## Order State Machine

### Canonical Order Statuses

```
Pending → Approved → Assigned → Rider Accepted → Preparing
    → Picked Up → On The Way → Near Customer → Delivered → Completed
```

### Alternative / Terminal Statuses

- `Rejected`
- `Paused`
- `Cancelled`
- `Returned`
- `Refunded`

### Real-Time Events

The server emits events for every state change, allowing all connected dashboards to update instantly.

---

## Firestore Security Rules

### Key Rules

- **Customers** can only read/write their own documents
- **Riders** can read orders they're assigned to and update delivery status
- **Admins** have full access
- **Anonymous writes** blocked except to guest_orders
- **Orders** use single source of truth at top-level `orders/{id}`
- **Customer access** via `customerId` field

---

## Features

### Customer Features

- Menu browsing with filters and search
- Product details with customization
- Shopping cart with promo codes
- Multiple payment methods
- Real-time order tracking
- Table reservations
- Contact form
- User profile management
- Social login (Google, GitHub)
- Order history
- Saved addresses
- Reviews and ratings
- Live chat support

### Admin Features

- Dashboard with real-time stats
- Orders management with status workflow
- Reservations management
- Menu management (CRUD)
- Customer management
- Rider management
- Inventory management
- Payment history
- Review management
- Message management
- Analytics and reports
- Activity logs

### Rider Features

- Dashboard stats
- Available orders board
- My deliveries with status tracking
- Live GPS location sharing
- Performance metrics
- Earnings tracking
- Profile management

---

## Enterprise Features

### Payments

- Paystack integration ready
- Flutterwave integration ready
- Mobile Money support
- Card payments
- Bank Transfer
- Payment history
- Refund workflow

### Inventory

- Stock level tracking
- Low stock alerts
- Automatic menu disable when out of stock
- Purchase order management
- Supplier tracking

### Messaging

- Customer ↔ Admin chat
- Admin ↔ Rider chat
- Customer ↔ Rider chat
- Real-time messaging
- Typing indicators
- Read receipts

### Reviews & Ratings

- Order reviews
- Rider ratings
- Average rating calculation
- Rating-based insights

### Notifications

- In-app notifications
- Order status updates
- Reservation confirmations
- Payment alerts
- Promotion notifications

---

## AI & Analytics

### Daily Analytics

- Total orders, revenue, average order value
- Unique customers
- Status breakdown
- Top items
- Hourly breakdown

### Weekly/Monthly Analytics

- Revenue trends
- Customer retention
- Category breakdown
- Top customers

### ML Features

- **Demand Forecasting**: Predict future order volume
- **Customer Segmentation**: Group customers by value
- **Anomaly Detection**: Identify suspicious orders

### Reports

- PDF daily reports
- Excel monthly reports
- Revenue charts
- Category distribution charts

---

## PWA & Offline Support

### Web App Manifest

`sarab/manifest.json` - PWA manifest for installability

### Service Worker

`sarab/sw.js` - Offline caching and fallback

### Offline Fallback

`sarab/offline.html` - Shown when offline

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Python 3.11+ (for AI service)
- Docker and Docker Compose (recommended)
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abdulrashidyussif/yussif-eats.git
   cd Commerce
   ```

2. Start all services with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Or start services individually:
   ```bash
   # Frontend
   cd sarab && npm install && npm run dev
   
   # Backend API
   cd server && npm install && npm run dev
   
   # Python AI Service
   cd python-service && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```

---

## Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication**:
   - Email/Password provider
   - Google provider
   - GitHub provider
3. Enable **Firestore Database**
4. Update `firebaseConfig` in `sarab/js/firebase.js` with your project credentials
5. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase Admin:
   - Create a service account key in Firebase Console
   - Set the path via environment variable

4. Start the server:
   ```bash
   npm start
   ```

5. For development with auto-reload:
   ```bash
   npm run dev
   ```

---

## Python Service Setup

1. Navigate to the Python service directory:
   ```bash
   cd python-service
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set environment variables:
   ```bash
   export FIREBASE_PROJECT_ID=your-project-id
   export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

5. Start the service:
   ```bash   :
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## Development

### Project Structure

- **Pages**: Separate HTML files for each user type
- **Styles**: Organized CSS with component-based classes
- **Scripts**: Modular JavaScript with Firebase abstraction layer
- **Modules**: TypeScript-ready feature modules
- **Components**: Reusable UI components
- **API**: Express.js REST API
- **AI**: FastAPI microservice for analytics

### Key Files

| File | Purpose |
|------|---------|
| `sarab/js/firebase-shared.js` | Core Firebase abstraction layer |
| `sarab/src/modules/orders.ts` | Order management module |
| `sarab/src/modules/payments.ts` | Payment processing |
| `sarab/src/modules/inventory.ts` | Inventory management |
| `server/src/api/v1/index.ts` | REST API routes |
| `python-service/app/main.py` | FastAPI app |
| `server/index.js` | WebSocket server |

---

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd sarab
npm test
```

### Python Tests
```bash
cd python-service
pytest
```

---

## Deployment

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Firebase Hosting (Frontend)
```bash
firebase deploy --only hosting
```

### Render/Railway (Backend)
- Connect GitHub repository
- Set environment variables
- Deploy automatically on push

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Author

**Designed and Developed by Abdul Rashid Yussif**

- GitHub: [@rashlast395-prog](https://github.com/rashlast395-prog)
- Website: [abdulrashidyussif.github.io](https://abdulrashidyussif.github.io)

---

## License

Copyright (c) 2026 Richy's Eat. All rights reserved.

- Design and Code is Copyright (c) [Abdul Rashid Yussif](https://github.com/rashlast395-prog)
- All rights reserved.

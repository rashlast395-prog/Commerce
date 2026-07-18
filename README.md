# Richy's Eat - Restaurant E-Commerce & Unified Admin System

![Status](https://img.shields.io/badge/status-active-success)
![Firebase](https://img.shields.io/badge/firebase-integrated-orange)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen)
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
14. [Getting Started](#getting-started)
15. [Firebase Setup](#firebase-setup)
16. [Server Setup](#server-setup)
17. [Development](#development)
18. [Deployment](#deployment)
19. [Browser Support](#browser-support)
20. [Contributing](#contributing)
21. [Author](#author)
22. [License](#license)

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
- Responsive design with Bootstrap 5
- Customizable product options (size, spice level, extras)

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | — | Semantic markup |
| CSS3 | — | Custom styles, CSS variables, animations |
| JavaScript | ES6+ | Modular ES modules |
| Bootstrap | 5.3 | Responsive grid and components |
| jQuery | 3.7.1 | DOM manipulation |
| AOS | — | Animate on Scroll |
| Swiper.js | — | Touch sliders/carousels |
| Magnific Popup | — | Lightbox/popup modals |
| Font Awesome | 6 | Icons (solid, regular, brands, light, duotone, thin) |
| Google Fonts | — | Playfair Display, Poppins, Dancing Script |
| Firebase SDK | Modular (v9+) | Authentication and Firestore |

### Backend / Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=18 | Server runtime |
| ws | ^8.18.0 | WebSocket server |
| firebase-admin | ^12.7.0 | Server-side Firestore and ID token verification |
| Firebase Firestore | — | NoSQL durable database |
| Firebase Authentication | — | Identity provider (Email, Google, GitHub) |

### PWA / Offline

| Technology | Purpose |
|------------|---------|
| Service Worker | Offline caching and fallback |
| Web App Manifest | Installability (standalone display) |

### Development

| Tool | Purpose |
|------|---------|
| VS Code | Editor with Live Server (port 5501) and debug configs |
| Git | Version control |

---

## Directory Structure

```
C:\Users\Abdul Rashid\Desktop\Commerce\
├── README.md                      # Main project documentation
├── .vscode\
│   ├── launch.json                # VS Code debug/launch configs
│   └── settings.json              # Live Server port: 5501
├── backend\                       # Scaffold for future backend API
│   ├── app\
│   │   ├── ai\
│   │   ├── analytics\
│   │   ├── api\v1\
│   │   ├── auth\
│   │   ├── dispatch\
│   │   ├── models\
│   │   ├── notifications\
│   │   ├── reports\
│   │   ├── services\
│   │   └── utils\
│   └── tests\                     # (currently empty)
├── Documentation\                 # Sarab HTML template docs
│   ├── css\all.css
│   ├── fonts\
│   ├── js\
│   │   ├── all.js
│   │   └── main.js
│   └── index.html
├── sarab\                         # PRIMARY FRONTEND
│   ├── index.html                 # Main customer-facing site (~833+ lines)
│   ├── admin.html                 # Unified admin dashboard
│   ├── rider.html                 # Rider dashboard (redirects to dashboard.html)
│   ├── profile.html               # User profile page
│   ├── product.html               # Product detail page
│   ├── dashboard.html             # Unified dashboard (referenced by rider.html)
│   ├── command-center.html        # Command center page
│   ├── offline.html               # Offline fallback
│   ├── manifest.json              # PWA manifest
│   ├── firestore.rules            # Firestore security rules (client-side copy)
│   ├── sw.js                      # Service Worker (offline caching)
│   ├── admin.css                  # Admin dashboard styles
│   ├── admin.js                   # Admin dashboard JS entry
│   ├── rider.css                  # Rider dashboard styles
│   ├── rider.js                   # Rider dashboard JS entry
│   ├── profile.js                 # Profile page JS
│   ├── command-center.css
│   ├── command-center.js
│   ├── dashboard.js
│   ├── product.js
│   ├── css\
│   │   ├── bootstrap.min.css
│   │   ├── all.min.css            # FontAwesome
│   │   ├── aos.css                # Animate on Scroll
│   │   ├── magnific-popup.css
│   │   ├── style.css              # Main site styles
│   │   ├── swiper-bundle.min.css  # Carousel/slider
│   │   ├── admin.css              # Admin styles
│   │   └── rider.css              # Rider styles
│   ├── js\
│   │   ├── jquery-3.7.1.min.js
│   │   ├── bootstrap.bundle.min.js
│   │   ├── bootstrap.min.js
│   │   ├── aos.js
│   │   ├── swiper-bundle.min.js
│   │   ├── jquery.magnific-popup.min.js
│   │   ├── firebase.js            # Firebase Auth re-exports
│   │   ├── firebase-shared.js     # Core Firebase abstraction layer
│   │   ├── main.js                # Main site logic
│   │   ├── admin.js
│   │   ├── profile.js
│   │   └── product.js
│   ├── img\                       # ~50+ images (menu, about, chefs, etc.)
│   └── webfonts\                  # FontAwesome 6 web fonts
└── server\                         # REAL-TIME SYNC SERVER
    ├── index.js                    # WebSocket server (472 lines)
    ├── package.json                # Server dependencies
    ├── package-lock.json
    ├── firestore.rules             # Firestore security rules (server-authoritative)
    ├── server.log                  # Server logs
    ├── server.err                  # Server error logs
    ├── public\
    │   └── rt-sync.js              # Real-time sync WebSocket client
    ├── shared\
    │   └── orderEngine.js          # Unified order lifecycle state machine
    └── node_modules\               # Installed dependencies
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
│               │        .js           │                       │
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
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVER (server/index.js)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  WebSocket Server (ws)                               │    │
│  │  - Authenticates via Firebase ID tokens              │    │
│  │  - In-memory authoritative state                     │    │
│  │  - Validates transitions via orderEngine             │    │
│  │  - Broadcasts real-time events                       │    │
│  │  - Persists to Firestore (firebase-admin)            │    │
│  │  - Exposes /health HTTP endpoint                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                │
│                            ▼                                │
│               ┌──────────────────────┐                       │
│               │      Firestore       │ (Mirror / Durable)   │
│               │   (firebase-admin)   │                       │
│               └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Client-Server Interaction

1. **Client connects** via WebSocket and authenticates with a Firebase ID token
2. **Server validates** the token using `firebase-admin`
3. **Server maintains** an in-memory authoritative view of orders
4. **Every state change** is validated against the `orderEngine.js` state machine
5. **Server broadcasts** real-time events to all connected clients
6. **Server persists** all changes to Firestore
7. **Fallback**: If WebSocket server is offline, clients fall back to Firestore `onSnapshot` listeners

---

## Data Flow

### Customer Actions

```
Customer Action → Firebase Firestore → Admin/Rider Real-time Sync
    │
    ├── Place Order → users/{uid}/orders/{id} + orders/{id} (mirrored)
    ├── Make Reservation → users/{uid}/reservations/{id} + reservations/{id} (mirrored)
    ├── Send Message → contactMessages/{id}
    └── Update Profile → users/{uid}
```

### Admin Actions

```
Admin Action → Firebase Firestore → Real-time Update
    ├── Update Order Status → orders/{id}
    ├── Approve/Decline Reservation → reservations/{id}
    ├── Add/Edit Menu → menu/{id}
    ├── Manage Riders → riders/{id}
    └── Reply to Message → contactMessages/{id}
```

### Rider Actions

```
Rider Action → Firebase Firestore → Real-time Update
    ├── Accept Order → orders/{id} (riderId, deliveryStatus)
    ├── Pick Up → orders/{id} (deliveryStatus: picked_up)
    └── Deliver → orders/{id} (deliveryStatus: delivered)
```

---

## Firebase Collections

| Collection | Path | Purpose | Access |
|------------|------|---------|--------|
| Users | `users/{uid}` | User profiles (name, email, phone, DOB, gender, address) | Customer + Admin |
| User Orders | `users/{uid}/orders/{id}` | Customer's order history | Customer |
| User Reservations | `users/{uid}/reservations/{id}` | Customer's reservations | Customer |
| User Addresses | `users/{uid}/addresses/{id}` | Delivery addresses | Customer |
| User Notifications | `users/{uid}/notifications/{id}` | User-specific notifications | Customer |
| Orders | `orders/{id}` | All orders (mirrored) | Admin + Rider |
| Reservations | `reservations/{id}` | All reservations (mirrored) | Admin |
| Menu | `menu/{id}` | Menu items (name, description, price, category, image, tags, extras) | Admin + Rider |
| Riders | `riders/{id}` | Rider profiles (name, phone, vehicle, license plate, availability) | Admin + Rider |
| Contact Messages | `contactMessages/{id}` | Contact form submissions | Admin |
| Guest Orders | `guest_orders/{id}` | Guest checkout orders | Admin |
| Notifications | `notifications/{id}` | Global notification pool | Admin |
| Activity Logs | `activityLogs/{id}` | Audit trail | Admin |

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
| Rider | User present in `riders` collection with `role: 'rider'` | Rider dashboard |
| Customer | Any authenticated user not in admin/rider roles | Main site + profile |

### Role Detection Logic

The frontend checks:
1. If user email is `rashlast395@gmail.com` → Admin
2. If user displayName is `rashlast395-prog` → Admin
3. If user exists in `riders` collection → Rider
4. Otherwise → Customer

---

## Real-Time Sync Server

### Location

`server/index.js` (472 lines)

### Technology

- **Runtime**: Node.js >= 18
- **WebSocket Library**: `ws` ^8.18.0
- **Firebase Admin SDK**: `firebase-admin` ^12.7.0

### Features

- Authenticates browser clients via Firebase ID tokens
- Maintains an in-memory authoritative view of orders synced to Firestore
- Validates every status change against a unified state machine (`orderEngine.js`)
- Broadcasts real-time events over WebSockets so Customer, Admin, and Rider dashboards update instantly
- Falls back to Firestore `onSnapshot` if the server is offline
- Exposes a `/health` HTTP endpoint
- Handles commands: `CREATE_ORDER`, `UPDATE_ORDER`, `SET_STATUS`, `ASSIGN_RIDER`, `DECLINE_RIDER`, `UPDATE_TRACKING`, `RIDER_LOCATION`, `MARK_NOTIF`

### WebSocket Client

`server/public/rt-sync.js` - Real-time sync WebSocket client loaded by the frontend.

### Server Commands

| Command | Purpose |
|---------|---------|
| `CREATE_ORDER` | Create a new order |
| `UPDATE_ORDER` | Update order details |
| `SET_STATUS` | Update order status (validated by state machine) |
| `ASSIGN_RIDER` | Assign a rider to an order |
| `DECLINE_RIDER` | Rider declines an assignment |
| `UPDATE_TRACKING` | Update delivery tracking info |
| `RIDER_LOCATION` | Broadcast rider location |
| `MARK_NOTIF` | Mark notification as read |

---

## Order State Machine

### Location

`server/shared/orderEngine.js` (159 lines)

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

### State Machine Functions

- `canTransition(currentStatus, newStatus)` - Validates if a status transition is allowed
- `normalizeStatus(status)` - Normalizes status strings to canonical values
- `deliveryStatusFor(order)` - Returns current delivery status for an order

### Real-Time Events

The server emits events for every state change, allowing all connected dashboards to update instantly.

---

## Firestore Security Rules

### Location

`server/firestore.rules` (137 lines) - Server-authoritative rules

`sarab/firestore.rules` - Client-side copy

### Key Rules

- **Customers** can only read/write their own documents
- **Riders** can read orders they're assigned to and update delivery status
- **Admins** (`rashlast395@gmail.com` / `rashlast395-prog`) have full access
- **Anonymous writes** blocked except to `guest_orders`
- **Protected collections**: `users`, `orders`, `reservations`, `menu`, `riders`, `contactMessages`, `guest_orders`, `notifications`, `activityLogs`

---

## Features

### Customer Features

- **Menu Browsing**: Filterable menu with search, grid/list views, category cards
- **Product Details**: Full-page product view with size, spice level, and extras customization, reviews, nutrition info
- **Shopping Cart**: Add/remove items, quantity controls, promo codes, sidebar checkout
- **Checkout**: Multiple payment methods (Mobile Money, Card, Bank Transfer, Cash on Delivery)
- **Order Tracking**: Real-time order status updates via WebSocket or Firestore listeners
- **Reservations**: Table booking with date/time selection and guest count
- **Contact Form**: Send messages to restaurant
- **User Profile**: Manage personal information (name, email, phone, DOB, gender, address)
- **Authentication**: Email/password, Google, GitHub sign-in
- **Deals & Bundles**: Special offers with countdown timer
- **Gallery & Testimonials**: Visual showcase and customer reviews
- **PWA**: Installable as a standalone app with offline support

### Admin Features (Unified Dashboard)

- **Dashboard Overview**: Real-time stats (total orders, pending, delivery, revenue, reservations, customers, riders, messages) with recent activity tables
- **Orders Management**: View all orders, update status through full workflow, filter by status, real-time updates
- **Reservations Management**: View all reservations, approve or decline with one click
- **Menu Management**: Add, edit, delete menu items with image, category, price, tags, extras
- **Customer Management**: View all registered users with profile information
- **Rider Management**: Add/edit/delete riders, manage availability, view assignments, track performance stats
- **Messages**: View contact form submissions, reply directly to customers, conversation history
- **Activity Logs**: Audit trail of all admin actions

### Rider Features

- **Dashboard Stats**: Available orders, my deliveries, completed, earnings
- **Available Orders**: Real-time list of unassigned orders, accept with one click
- **My Deliveries**: Filterable list of assigned orders, update status (picked up → delivered)
- **Profile**: Update name, phone, vehicle, license plate
- **Menu View**: Browse all menu items
- **Riders List**: View all riders and their availability status

---

## PWA & Offline Support

### Web App Manifest

`sarab/manifest.json` - PWA manifest for installability:

- Name: "Richy's Eat - Fast Food & Restaurant"
- Start URL: `./index.html`
- Display: standalone, portrait
- Theme color: `#e8281a`
- Icons: 192x192 and 512x512 SVG

### Service Worker

`sarab/sw.js` (66 lines) - Offline caching:

- Cache name: `richyeat-v1`
- Caches core assets (HTML, CSS, JS, images)
- Falls back to `offline.html` for documents when offline

### Offline Fallback

`sarab/offline.html` - Shown when the user is offline and a cached version is not available.

---

## Getting Started

### Prerequisites

- Node.js >= 18 (for the sync server)
- A modern web browser (Chrome, Firefox, Safari, Edge - latest versions)
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abdulrashidyussif/yussif-eats.git
   cd Commerce
   ```

2. Open `sarab/index.html` in your browser or serve via Live Server (port 5501)

3. For admin access, navigate to `sarab/admin.html` and login with:
   - Email: `rashlast395@gmail.com`
   - Or use an account with displayName: `rashlast395-prog`

4. For rider access, ensure your user ID is in the `riders` collection in Firestore

---

## Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication**:
   - Email/Password provider
   - Google provider
   - GitHub provider
3. Enable **Firestore Database**
4. Update `firebaseConfig` in `sarab/js/firebase.js` with your project credentials
5. Add your domain to **Authorized Domains** in Firebase Authentication settings
6. Deploy Firestore security rules:
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
   - Set the path via environment variable or update `index.js` to load credentials

4. Start the server:
   ```bash
   npm start
   ```

5. For development with auto-reload:
   ```bash
   npm run dev
   ```

6. The WebSocket server will be available at `ws://localhost:8080` (or configured port)

7. Health check endpoint: `http://localhost:8080/health`

### Server Environment Variables

| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `PORT` | WebSocket server port (default: 8080) |

---

## Development

### Project Structure

- **Pages**: Separate HTML files for each user type (customer, admin, rider)
- **Styles**: Organized CSS with component-based classes
- **Scripts**: Modular JavaScript with Firebase abstraction layer (`firebase-shared.js`)
- **Data**: All data stored in Firebase Firestore with real-time listeners
- **Server**: Node.js WebSocket server for real-time sync

### Key Files

| File | Purpose |
|------|---------|
| `sarab/js/firebase-shared.js` | Core Firebase abstraction layer (Auth, Firestore, real-time listeners) |
| `sarab/js/firebase.js` | Backward-compatible re-exports of firebase-shared.js |
| `sarab/js/main.js` | Main site logic (cart, checkout, menu browsing) |
| `sarab/js/admin.js` | Admin dashboard logic |
| `sarab/js/rider.js` | Rider dashboard logic |
| `sarab/js/profile.js` | Profile page logic |
| `sarab/js/product.js` | Product detail page logic |
| `server/index.js` | WebSocket server (472 lines) |
| `server/shared/orderEngine.js` | Unified order lifecycle state machine (159 lines) |

### Development Tools

- **VS Code Live Server**: Port 5501 (configured in `.vscode/settings.json`)
- **Debug Configs**: Available in `.vscode/launch.json` for Python and Node.js

### Running Locally

1. Start the Firebase emulator (optional):
   ```bash
   firebase emulators:start
   ```

2. Start the WebSocket server:
   ```bash
   cd server
   npm run dev
   ```

3. Open the frontend via Live Server or directly in browser

---

## Deployment

### Frontend (GitHub Pages)

The frontend is deployed to GitHub Pages at `https://abdulrashidyussif.github.io/yussif-eats/`.

To deploy:
1. Push changes to the `main` branch
2. Ensure GitHub Pages is configured to serve from the `/sarab` directory or root
3. The site will be available at the configured GitHub Pages URL

### Backend (Server)

The WebSocket server can be deployed to:
- **Render**: Connect GitHub repo, set environment variables, deploy
- **Railway**: Similar setup with environment variables
- **Vercel / Netlify**: For serverless WebSocket alternatives
- **Docker**: Containerize the server for any cloud provider

### Firebase Rules Deployment

```bash
firebase deploy --only firestore:rules
```

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

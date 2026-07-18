# Richy's Eat - Restaurant E-Commerce & Unified Admin System

![Status](https://img.shields.io/badge/status-active-success)
![Firebase](https://img.shields.io/badge/firebase-integrated-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

A fully functional restaurant e-commerce platform with a unified admin management system, real-time rider delivery tracking, and a complete customer-facing ordering experience. All dashboards are integrated into one cohesive system powered by Firebase.

## Live Demo

- **Main Site**: [Richy's Eat](https://abdulrashidyussif.github.io/yussif-eats/)
- **Admin Dashboard**: [Admin Panel](https://abdulrashidyussif.github.io/yussif-eats/admin.html)
- **Rider Dashboard**: [Rider Panel](https://abdulrashidyussif.github.io/yussif-eats/rider.html)

## Screenshots

### Main Site
- Modern landing page with hero slider, about section, menu gallery, deals, reservation form, and contact form
- Full e-commerce cart with sidebar checkout
- Product detail pages with customization (size, spice, extras)
- User authentication (login/signup with email, Google, GitHub)
- User profile management with personal details

### Admin Dashboard (Unified Management System)
- **Dashboard Overview**: Real-time stats for orders, reservations, customers, riders, revenue, and messages
- **Orders Management**: View all orders, update status (Order Received → Preparing → Out for Delivery → Delivered), filter by status
- **Reservations Management**: View all reservations, approve or decline with one click
- **Menu Management**: Add, edit, delete menu items with image, category, price, tags
- **Customer Management**: View all registered users
- **Rider Management**: Add/edit/delete riders, manage availability, view assignments, track rider stats
- **Messages**: View contact form submissions, reply directly to customers

### Rider Dashboard
- Available orders board with accept functionality
- My Deliveries with status tracking (assigned → picked up → delivered)
- Earnings statistics
- Profile management
- Menu view and riders list

## Architecture

```
sarab/
├── index.html          # Main customer-facing site
├── admin.html          # Unified admin dashboard (orders + reservations + menu + customers + riders + messages)
├── rider.html          # Rider delivery dashboard
├── profile.html        # User profile page
├── product.html        # Product detail page
├── css/
│   ├── style.css       # Main site styles
│   ├── admin.css       # Admin dashboard styles
│   └── rider.css       # Rider dashboard styles
├── js/
│   ├── main.js         # Main site logic
│   ├── firebase.js     # Firebase integration layer
│   ├── admin.js        # Admin dashboard logic
│   ├── profile.js      # Profile page logic
│   └── product.js      # Product page logic
├── admin.js            # Admin dashboard entry
├── rider.js            # Rider dashboard entry
└── profile.js          # Profile page entry
```

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5
- **Backend**: Firebase (Authentication, Firestore)
- **Animations**: AOS (Animate on Scroll), Swiper.js
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Playfair Display, Poppins, Dancing Script)

## Features

### Customer Features
- **Menu Browsing**: Filterable menu with search, grid/list views
- **Product Details**: Full-page product view with size, spice level, and extras customization
- **Shopping Cart**: Add/remove items, quantity controls, promo codes
- **Checkout**: Multiple payment methods (Mobile Money, Card, Bank Transfer, Cash on Delivery)
- **Order Tracking**: Real-time order status updates
- **Reservations**: Table booking with date/time selection
- **Contact Form**: Send messages to restaurant
- **User Profile**: Manage personal information (name, email, phone, DOB, gender, address)
- **Authentication**: Email/password, Google, GitHub sign-in

### Admin Features (Unified Dashboard)
- **Dashboard**: Real-time stats (total orders, pending, delivery, revenue, reservations, customers, riders, messages)
- **Orders Management**: View all orders, update status (Order Received → Preparing → Out for Delivery → Delivered), filter by status
- **Reservations Management**: View all reservations, approve or decline with one click
- **Menu Management**: Add, edit, delete menu items with image, category, price, tags
- **Customer Management**: View all registered users
- **Rider Management**: Add/edit/delete riders, manage availability, view assignments, track rider performance
- **Messages**: View contact form submissions, reply directly to customers

### Rider Features
- **Dashboard**: Stats (available orders, my deliveries, completed, earnings)
- **Available Orders**: Real-time list of unassigned orders, accept with one click
- **My Deliveries**: Filterable list of assigned orders, update status (picked up → delivered)
- **Menu View**: Browse all menu items
- **Riders List**: View all riders and their status
- **Profile**: Update name, phone, vehicle, license plate

## Data Flow

```
Customer Action → Firebase Firestore → Admin/Rider Real-time Sync
     │
     ├── Place Order → users/{uid}/orders/{id} + orders/{id} (mirrored)
     ├── Make Reservation → users/{uid}/reservations/{id} + reservations/{id} (mirrored)
     ├── Send Message → contactMessages/{id}
     └── Update Profile → users/{uid}

Admin Action → Firebase Firestore → Real-time Update
     ├── Update Order Status → orders/{id}
     ├── Approve/Decline Reservation → reservations/{id}
     ├── Add/Edit Menu → menu/{id}
     ├── Manage Riders → riders/{id}
     └── Reply to Message → contactMessages/{id}

Rider Action → Firebase Firestore → Real-time Update
     ├── Accept Order → orders/{id} (riderId, deliveryStatus)
     ├── Pick Up → orders/{id} (deliveryStatus: picked_up)
     └── Deliver → orders/{id} (deliveryStatus: delivered)
```

## Firebase Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `users/{uid}` | User profiles | Customer + Admin |
| `users/{uid}/orders` | User's order history | Customer |
| `users/{uid}/reservations` | User's reservations | Customer |
| `users/{uid}/addresses` | Delivery addresses | Customer |
| `orders` | All orders (mirrored) | Admin + Rider |
| `reservations` | All reservations (mirrored) | Admin |
| `menu` | Menu items | Admin + Rider |
| `riders` | Rider profiles | Admin + Rider |
| `contactMessages` | Contact form submissions | Admin |
| `guest_orders` | Guest checkout orders | Admin |

## Authentication & Roles

| Role | Email | Access |
|------|-------|--------|
| Admin | rashlast395@gmail.com | Full admin dashboard access |
| Admin | displayName: rashlast395-prog | Full admin dashboard access |
| Rider | Any user in `riders` collection | Rider dashboard |
| Customer | Any authenticated user | Main site + profile |

## Getting Started

### Prerequisites
- A modern web browser
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/abdulrashidyussif/yussif-eats.git
   ```

2. Open `sarab/index.html` in your browser

3. For admin access, navigate to `sarab/admin.html` and login with:
   - Email: `rashlast395@gmail.com`
   - Or use an account with displayName: `rashlast395-prog`

4. For rider access, ensure your user ID is in the `riders` collection in Firestore

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication:
   - Email/Password provider
   - Google provider
   - GitHub provider
3. Enable Firestore Database
4. Update `firebaseConfig` in `sarab/js/firebase.js` with your project credentials
5. Add your domain to Authorized Domains in Firebase Authentication settings

## Usage

### Customer Flow
1. Browse menu on the homepage
2. Click any product to view details and customize
3. Add to cart and proceed to checkout
4. Select payment method and complete order
5. Track order status in real-time
6. Make reservations via the reservation form
7. Manage profile via user dropdown → My Profile

### Admin Flow (Unified Management System)
1. Login to admin dashboard
2. View unified dashboard stats (orders, reservations, customers, riders, messages)
3. Process orders: update status as they progress
4. Manage reservations: approve or decline
5. Edit menu: add/remove items
6. Manage riders: add/edit riders, set availability, track assignments
7. View customers
8. Reply to contact messages

### Rider Flow
1. Login to rider dashboard
2. Set status to Available
3. Accept available orders
4. Update delivery status (picked up → delivered)
5. View earnings and completed deliveries

## Unified Admin System Architecture

The admin dashboard serves as the central management hub for the entire platform:

```
┌─────────────────────────────────────────────┐
│          ADMIN DASHBOARD (UNIFIED)           │
├─────────────────────────────────────────────┤
│  Dashboard Overview                          │
│  ├── Total Orders, Pending, Delivery         │
│  ├── Revenue, Reservations, Customers        │
│  ├── Active Riders, Messages                 │
│  └── Recent Activity Tables                  │
├─────────────────────────────────────────────┤
│  Orders Management                           │
│  ├── View all orders                         │
│  ├── Update status (Received → Delivered)    │
│  ├── Filter by status                        │
│  └── Real-time updates                       │
├─────────────────────────────────────────────┤
│  Reservations Management                     │
│  ├── View all reservations                   │
│  ├── Approve / Decline                       │
│  └── Real-time sync                          │
├─────────────────────────────────────────────┤
│  Menu Management                             │
│  ├── Add / Edit / Delete items               │
│  ├── Image, category, price, tags            │
│  └── Real-time menu sync                     │
├─────────────────────────────────────────────┤
│  Customer Management                         │
│  ├── View all registered users               │
│  └── Profile information                     │
├─────────────────────────────────────────────┤
│  Rider Management                            │
│  ├── Add / Edit / Delete riders              │
│  ├── Set availability                        │
│  ├── View assignments                        │
│  ├── Track performance                       │
│  └── Real-time rider sync                    │
├─────────────────────────────────────────────┤
│  Messages                                    │
│  ├── View contact form submissions           │
│  ├── Reply to customers                      │
│  └── Conversation history                    │
└─────────────────────────────────────────────┘
```

## Project Structure

This project follows a modular architecture:

- **Pages**: Separate HTML files for each user type (customer, admin, rider)
- **Styles**: Organized CSS with component-based classes
- **Scripts**: Modular JavaScript with Firebase abstraction layer
- **Data**: All data stored in Firebase Firestore with real-time listeners

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

**Designed and Developed by Abdul Rashid Yussif**

- GitHub: [@rashlast395-prog](https://github.com/rashlast395-prog)
- Website: [abdulrashidyussif.github.io](https://abdulrashidyussif.github.io)

## License

Copyright © 2026 Richy's Eat. All rights reserved.

- Design and Code is Copyright © [Abdul Rashid Yussif](https://github.com/rashlast395-prog)
- All rights reserved.

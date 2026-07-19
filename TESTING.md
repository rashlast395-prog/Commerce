# Testing Guide

## Overview

Richy's Eat uses a multi-layered testing strategy to ensure reliability and stability across the entire platform.

## Test Structure

```
server/
├── tests/
│   ├── unit/
│   │   ├── orderEngine.test.js
│   │   ├── firestore.test.js
│   │   └── validators.test.js
│   ├── integration/
│   │   ├── api.test.js
│   │   └── websocket.test.js
│   └── e2e/
│       └── order-flow.test.js

sarab/
├── tests/
│   ├── firebase-shared.test.ts
│   ├── components.test.ts
│   └── modules.test.ts

python-service/
├── tests/
│   ├── test_analytics.py
│   ├── test_reports.py
│   └── test_ml.py
```

## Running Tests

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

## Test Coverage

- **Unit Tests**: Test individual functions and utilities
- **Integration Tests**: Test API endpoints and WebSocket communication
- **E2E Tests**: Test complete user flows
- **Python Tests**: Test analytics, reports, and ML services

## CI/CD

Tests run automatically on:
- Every pull request
- Every push to main/develop branches
- Before deployment to staging/production

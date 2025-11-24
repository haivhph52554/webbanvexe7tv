# Bus Booking Backend (Express + MongoDB)

## Quick start

1. Copy `.env.example` to `.env` and edit `MONGO_URI` if needed.
2. Install dependencies:
   ```
   npm install
   ```
3. Seed sample data:
   ```
   npm run seed
   ```
4. Run server:
   ```
   npm run dev
   ```

API endpoints included (minimal):
- GET /api/trips
- POST /api/trips
- GET /api/bookings
- POST /api/bookings
- GET /api/routes
- POST /api/routes
- POST /api/routes/:routeId/stops
- GET /api/users
- POST /api/users

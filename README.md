# Notflix

Notflix is a MERN-stack study-material platform where students can discover, upload, and download lecture notes. Submitted notes are reviewed by an administrator before being published. The application also provides image-to-text OCR and authenticated real-time discussion rooms.

## What it does

- Lets users create an account with email/password or Google OAuth.
- Displays approved study notes and lets users search, filter, and sort them by subject.
- Lets authenticated users upload PDF, DOCX, or TXT study material (up to 10 MB) with a title, description, subject, and free/premium designation.
- Stores uploaded files in Cloudinary and note/user data in MongoDB.
- Sends newly uploaded notes to an admin moderation workflow. Admins can review, approve, or reject submissions.
- Protects premium downloads in the frontend and presents a premium-membership page.
- Extracts English text from uploaded note images using the OCR.space API; processed OCR results are cached.
- Provides Socket.IO-powered chat rooms with stored message history and admin message deletion.
- Includes a contact form, legal pages, health checks, Redis-backed caching, and Redis-backed API rate limiting.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, Context API |
| Styling/UI | Tailwind CSS, Radix UI, Lucide React, Framer Motion, React Hot Toast / Toastify |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt/bcryptjs, Passport, Google OAuth 2.0, Express Session |
| Real-time communication | Socket.IO |
| Storage/uploads | Multer and Cloudinary |
| OCR | OCR.space API (with image validation and 5 MB limit) |
| Caching and rate limiting | Redis, node-cron cache warming, custom Redis rate-limit middleware |
| Other integrations | Nodemailer contact emails, Razorpay public-key endpoint, Google Analytics |
| Development | Nodemon, ESLint, concurrently |

## Features and roles

### Student/user

- Register, log in, log out, and view the signed-in account.
- Sign in using Google OAuth.
- Browse approved notes in Java, C++, Web Development, Python, Data Structures, and Algorithms.
- Search note titles, filter by subject, sort by date/downloads/rating, and download allowed files.
- Upload study notes and optionally label them premium.
- Extract text from JPEG, PNG, GIF, or WebP images.
- Join a chat room and exchange real-time messages.

### Administrator

- Access an admin dashboard.
- View all notes or pending submissions.
- Approve or reject submitted notes and add a review comment.
- Delete chat messages.
- Inspect and reset Redis-backed rate-limit records.

## Project structure

```text
.
├── frontend/                 # React + Vite single-page application
│   ├── src/pages/            # Home, notes, upload, OCR, chat, admin, legal pages
│   ├── src/components/       # Reusable UI, guards, chat, OCR, payment components
│   └── src/context/          # Authentication context and API client
├── backend/                  # Express API and Socket.IO server
│   ├── controllers/          # Auth, notes, OCR, Google auth, contact logic
│   ├── models/               # User, Note, and chat/message schemas
│   ├── routes/               # REST endpoints
│   ├── middlewares/          # Auth, admin, upload, cache, and rate-limit middleware
│   └── utils/                # Cloudinary, cache, and token helpers
├── Bruno/                    # Bruno API request collection
└── Notflix.postman_collection.json
```

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB (local instance or MongoDB Atlas)
- Redis (local instance or hosted Redis URL)
- Cloudinary account
- Google OAuth credentials (if Google sign-in is enabled)
- OCR.space API key (if OCR is enabled)

## Installation and local development

1. Clone the project and enter its directory.

   ```bash
   git clone <your-repository-url>
   cd <your-project-directory>
   ```

2. Install dependencies in the root, frontend, and backend directories.

   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   cd ..
   ```

3. Create the environment files described below.

4. Start Redis, then start both applications from the root directory.

   ```bash
   npm run all
   ```

   Or run them separately:

   ```bash
   npm run backend
   npm run frontend
   ```

5. Open `http://localhost:5173`. The API runs at `http://localhost:5000` by default.

## Environment variables

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/notflix
REDIS_URL=redis://127.0.0.1:6379

JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-different-long-random-secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

OCR_SPACE_API_KEY=your-ocr-space-api-key

CONTACT_EMAIL_USER=your-email-address
CONTACT_EMAIL_PASS=your-email-app-password
CONTACT_EMAIL_TO=your-support-inbox@example.com
CONTACT_EMAIL_FROM=your-email-address

RAZORPAY_KEY_ID=your-razorpay-public-key
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GA_MEASUREMENT_ID=your-google-analytics-measurement-id
VITE_SUPPORT_EMAIL=your-support-inbox@example.com
```

Keep `.env` files out of version control. Google OAuth, OCR, contact email, analytics, and Razorpay configuration are optional only if the related feature is not used; MongoDB, Redis, JWT, and Cloudinary configuration are required for the full backend.

## Production deployment

Notflix is a MERN application: React/Vite on the frontend, Express/Node.js on the backend, and MongoDB/Mongoose for persistent data. Redis is required for caching, rate limits, and token revocation.

1. Copy [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) into environment-specific `.env` files. Never commit real credentials.
2. Set `NODE_ENV=production`, use long random values for `JWT_SECRET` and `SESSION_SECRET` (at least 32 characters), and set `FRONTEND_URL` to the exact deployed frontend origin.
3. Deploy the frontend as a static Vite build (`npm run build`). Set `VITE_API_URL` to the HTTPS API URL at build time.
4. Deploy the backend with Node.js 20+ or build [`backend/Dockerfile`](backend/Dockerfile). It exposes port `5000` and expects the platform's `PORT` value when provided.
5. Use managed MongoDB and Redis with TLS-enabled connection strings. Confirm `GET /api/health` returns `200` before accepting traffic.

### Production safeguards included

- Security headers via Helmet, compressed responses, explicit payload size limits, and disabled `X-Powered-By`.
- Strict origin allow-list based on `FRONTEND_URL`; local Vite access is enabled only outside production.
- Startup validation for required production secrets and service URLs.
- Redis-backed rate limits, JWT invalidation, protected cache management endpoints, and graceful MongoDB/Redis shutdown.
- Ownership checks for note updates/deletions and restricted access to unapproved notes.
- Admin-only premium-status changes. Connect a verified payment webhook before enabling self-service premium upgrades.
- Health checks report MongoDB and Redis readiness.

## API overview

| Base path | Purpose |
| --- | --- |
| `/api/auth` | Registration, login, logout, current user, premium-status update, and Google OAuth routes |
| `/api/notes` | Public approved-note listing; authenticated note CRUD; admin review endpoints |
| `/api/ocr/process` | Extract text from an uploaded image |
| `/api/chat/messages/:room` | Get persisted chat history; admins can delete a message |
| `/api/contact` | Send a contact-form email |
| `/api/payment/razorpay-key` | Return the configured Razorpay public key |
| `/api/rate-limit` | Rate-limit configuration/info and admin management endpoints |
| `/api/cache` | Cache health, statistics, and clearing endpoints |
| `/api/health` | Basic service health check |

API examples are available in [the Bruno collection](Bruno) and [the Postman collection](Notflix.postman_collection.json).

## Security and safeguards

- Passwords are hashed with bcrypt before storage.
- JWT-protected routes use bearer-token authentication; logged-out JWTs are blacklisted in Redis until expiry.
- Admin-only endpoints use a role check.
- Note uploads accept only PDF, DOCX, and TXT files and limit files to 10 MB.
- OCR accepts common image formats and limits files to 5 MB.
- Request limits are applied to authentication, notes, uploads, OCR, chat, public, and admin endpoints.
- CORS is restricted to the configured development/production frontend origins.

## Available scripts

From the project root:

```bash
npm run frontend     # Start Vite
npm run backend      # Start Express with Nodemon
npm run all          # Start frontend and backend together
```

From `frontend/`:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

From `backend/`:

```bash
npm run dev
npm start
npm run cache:stats
npm run cache:clear
npm run cache:warm
npm run cache:list
npm run cache:monitor
```

## License

This repository is currently marked as `ISC` in `package.json`.

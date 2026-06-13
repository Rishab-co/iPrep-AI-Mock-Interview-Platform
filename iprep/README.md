# iPrep — AI-Powered Mock Interview Platform

A full-stack SaaS application that conducts realistic voice-and-text technical interviews using GPT-4o, TTS-1, and Whisper.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Java 17, Spring Boot 3.2, Spring Security, JPA |
| Frontend  | React 18, Vite, Tailwind CSS, Lucide-React |
| AI        | OpenAI GPT-4o, TTS-1, Whisper          |
| Database  | PostgreSQL 14+                          |
| Auth      | JWT (jjwt 0.12)                         |

---

## Project Structure

```
iprep/
├── backend/                         # Spring Boot application
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/iprep/
│       │   ├── IprepApplication.java
│       │   ├── config/
│       │   │   └── SecurityConfig.java      # CORS, JWT filter chain
│       │   ├── controller/
│       │   │   ├── AuthController.java      # POST /api/v1/auth/*
│       │   │   └── InterviewController.java # POST/GET /api/v1/interviews/*
│       │   ├── dto/                         # Request/Response objects
│       │   ├── entity/
│       │   │   ├── User.java
│       │   │   ├── Interview.java
│       │   │   └── TranscriptMessage.java
│       │   ├── exception/
│       │   │   ├── GlobalExceptionHandler.java
│       │   │   └── OpenAIException.java
│       │   ├── repository/
│       │   ├── security/
│       │   │   ├── JwtService.java
│       │   │   ├── JwtAuthFilter.java
│       │   │   └── UserDetailsServiceImpl.java
│       │   └── service/
│       │       ├── AuthService.java
│       │       ├── InterviewService.java    # Interview lifecycle
│       │       └── OpenAIService.java       # GPT-4o + TTS + Whisper
│       └── resources/
│           ├── application.properties
│           └── schema.sql                   # Database schema
│
└── frontend/                        # React + Vite application
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                          # Routes
        ├── main.jsx
        ├── index.css                        # Tailwind + custom utilities
        ├── context/
        │   └── AuthContext.jsx              # JWT auth state
        ├── hooks/
        │   ├── useAudioRecorder.js          # MediaRecorder API wrapper
        │   └── useAudioPlayer.js            # Base64 MP3 playback
        ├── services/
        │   ├── api.js                       # Axios instance + interceptors
        │   └── interviewService.js          # All interview API calls
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── DashboardPage.jsx            # Interview history + stats
            ├── NewInterviewPage.jsx         # 3-step setup wizard
            ├── LiveInterviewPage.jsx        # Voice/text interview room
            └── ReportPage.jsx              # Evaluation results
```

---

## Quick Start

### 1. Database

```sql
-- Create database
CREATE DATABASE iprep_db;

-- Run schema
psql -U postgres -d iprep_db -f backend/src/main/resources/schema.sql
```

### 2. Backend

```bash
cd backend

# Copy and edit environment file
cp .env.example .env
# Fill in: OPENAI_API_KEY, DATABASE_PASSWORD, JWT_SECRET

# Export env vars (or use your IDE's run config)
export $(cat .env | xargs)

# Run
./mvnw spring-boot:run
# Server starts at http://localhost:8080
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Optional — defaults to localhost:8080
npm run dev
# App at http://localhost:5173
```

---

## API Reference

### Auth

| Method | Endpoint               | Body                              | Response         |
|--------|------------------------|-----------------------------------|------------------|
| POST   | /api/v1/auth/register  | `{fullName, email, password}`     | `{accessToken, email, fullName}` |
| POST   | /api/v1/auth/login     | `{email, password}`               | `{accessToken, email, fullName}` |

### Interviews

| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| POST   | /api/v1/interviews                    | Start interview → AI opening  |
| POST   | /api/v1/interviews/{id}/respond       | Submit text response           |
| POST   | /api/v1/interviews/{id}/transcribe    | Upload audio → Whisper STT     |
| POST   | /api/v1/interviews/{id}/end           | End + generate evaluation      |
| GET    | /api/v1/interviews                    | List all user interviews       |
| GET    | /api/v1/interviews/{id}               | Detail + transcript            |

All interview endpoints require `Authorization: Bearer <token>`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Required | Description                         |
|-------------------|----------|-------------------------------------|
| `OPENAI_API_KEY`  | ✅       | OpenAI API key (sk-...)             |
| `DATABASE_URL`    | ✅       | PostgreSQL JDBC URL                 |
| `DATABASE_USERNAME` | ✅     | DB username                         |
| `DATABASE_PASSWORD` | ✅     | DB password                         |
| `JWT_SECRET`      | ✅       | Min 32-char secret for JWT signing  |
| `CORS_ORIGINS`    | ❌       | Defaults to localhost:5173          |
| `PORT`            | ❌       | Server port (default 8080)          |

### Frontend (`frontend/.env`)

| Variable             | Required | Description              |
|----------------------|----------|--------------------------|
| `VITE_API_BASE_URL`  | ❌       | Defaults to localhost:8080 |

---

## Voice Interaction Flow

```
User speaks
    ↓
MediaRecorder (WebM blob)
    ↓
POST /api/v1/interviews/{id}/transcribe  (multipart audio)
    ↓
Spring Boot → OpenAI Whisper API
    ↓
Transcribed text returned to frontend
    ↓
POST /api/v1/interviews/{id}/respond  { content: "..." }
    ↓
Spring Boot → GPT-4o (full conversation history)
    ↓
AI text response → OpenAI TTS-1
    ↓
Base64 MP3 returned to frontend
    ↓
useAudioPlayer decodes + plays audio
```

---

## OpenAI Cost Estimate (per interview, 5 questions)

| Model     | Usage                    | Est. Cost  |
|-----------|--------------------------|------------|
| GPT-4o    | ~3,000 tokens in/out     | ~$0.03     |
| TTS-1     | ~500 chars × 6 responses | ~$0.02     |
| Whisper   | ~2 min audio             | ~$0.01     |
| **Total** |                          | **~$0.06** |

---

## Security Notes

- API keys are loaded from environment variables — never hardcoded
- JWT tokens expire after 24 hours
- All interview endpoints require authentication
- CORS is restricted to configured origins
- Passwords are BCrypt-hashed (cost factor 12)
- In production, set `spring.jpa.hibernate.ddl-auto=none`

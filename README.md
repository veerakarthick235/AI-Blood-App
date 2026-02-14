# 🧠 AI_Blood_App -- Intelligent Blood Donation Network

AI_Blood is a full-stack AI-powered platform that connects donors,
patients, and hospitals in real time to reduce blood shortage and
emergency response time.

------------------------------------------------------------------------

## 🚀 Tech Stack

**Frontend:** Next.js\
**Backend:** FastAPI (Python)\
**Database:** MongoDB Atlas\
**AI/ML:** Scikit-learn, XGBoost, Prophet (for forecasting)\
**Realtime:** WebSockets\
**Maps:** Mapbox\
**Notifications:** Firebase FCM, Twilio, WhatsApp Cloud API\
**Email:** Resend

------------------------------------------------------------------------

## 🎯 Core Features

### 👤 Donor

-   Register with blood group, location, health info
-   Availability toggle
-   Donation history tracking
-   Smart reminders

### 🩸 Patient / Requester

-   Emergency blood request
-   Upload prescription (OCR ready)
-   Live donor tracking
-   Urgency score

### 🏥 Hospital

-   Inventory dashboard
-   Blood demand forecasting
-   Bulk donor alerts
-   Camp management

### 🛡️ Admin

-   Fraud detection panel
-   Analytics dashboard
-   User verification

------------------------------------------------------------------------

## 🧠 AI Modules

### 1. Donor Matching Engine

Ranks donors using: - Blood compatibility - Distance (Haversine) - Last
donation date - Response probability

### 2. Donor Response Prediction

ML model predicts likelihood of donor accepting request.

### 3. Blood Demand Forecasting

Time-series model predicts shortages per city.

### 4. Fraud Detection

Detects fake emergency requests using behavior patterns.

------------------------------------------------------------------------

## 📂 Project Structure

    ai-blood/
    │
    ├── frontend/ (Next.js)
    │   ├── pages/
    │   ├── components/
    │   └── services/
    │
    ├── backend/ (FastAPI)
    │   ├── routes/
    │   ├── models/
    │   ├── ai/
    │   └── utils/
    │
    ├── database/
    │   └── mongo_schemas/
    │
    └── docs/

------------------------------------------------------------------------

## 🔌 Key API Endpoints

### Auth

-   POST `/auth/register`
-   POST `/auth/login`

### Donor

-   GET `/donors/nearby`
-   POST `/donor/availability`

### Requests

-   POST `/request/emergency`
-   POST `/request/{id}/accept`

### AI

-   GET `/ai/match-donors/{requestId}`
-   GET `/ai/demand-forecast`

------------------------------------------------------------------------

## 🗄️ MongoDB Collections

### donors

-   name
-   bloodGroup
-   geo location (2dsphere)
-   lastDonationDate
-   availability
-   responseScore

### requests

-   patientName
-   bloodGroup
-   units
-   urgencyScore
-   status

### hospitals

-   name
-   location
-   inventory

------------------------------------------------------------------------

## ⚡ Realtime Workflow

1.  Patient creates emergency request\
2.  AI ranks nearby donors\
3.  Top donors receive push/SMS/WhatsApp\
4.  Donor accepts → live update to patient & hospital

------------------------------------------------------------------------

## 🔐 Security

-   JWT authentication
-   Role-based access control
-   AES encryption for sensitive data
-   Rate limiting & audit logs

------------------------------------------------------------------------

## 📊 KPIs

-   Fulfillment rate
-   Average response time
-   Donor retention
-   Shortage prediction accuracy

------------------------------------------------------------------------

## 🧪 MVP Scope

-   Donor registration
-   Emergency request
-   Geo-based donor search
-   Notifications
-   Basic AI ranking

------------------------------------------------------------------------

## 🏁 Deployment

Frontend → Vercel\
Backend → Docker + AWS/Render\
Database → MongoDB Atlas

------------------------------------------------------------------------

## 💡 Future Enhancements

-   Rare blood group network
-   Wearable health integration
-   Route optimization
-   Gamified donor leaderboard

------------------------------------------------------------------------

## 👨‍💻 Author

Veera Karthick -- AI & Data Science\
AI_Blood: Real-time intelligent blood supply network.

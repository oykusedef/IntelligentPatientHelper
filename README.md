# Intelligent Patient System

A modern healthcare platform for symptom analysis, doctor recommendations, and appointment scheduling.

## Features

- AI-powered symptom analysis
- Department and doctor recommendations
- Appointment scheduling
- Patient registration
- Responsive design for all devices

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: FastAPI (Python)
- **Database**: Neon PostgreSQL

## Getting Started

### Prerequisites

- Python 3.8+
- Neon DB account (https://neon.tech)

### Setting Up Neon DB

1. Create a free account on [Neon](https://neon.tech)
2. Create a new project
3. Create a new database
4. Copy your connection string from the Neon dashboard
5. Update the `.env` file with your connection string:

```
DATABASE_URL=postgres://your-username:your-password@your-neon-db-host/your-database
```

### Installation

1. Clone the repository
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Run the application:

```
python -m uvicorn main:app --reload
```

4. Open your browser and navigate to `http://localhost:8000`

## API Endpoints

- `GET /api/patient/check/{tc_number}` - Check if a patient exists
- `POST /api/patient/register` - Register a new patient
- `POST /api/chat` - Process chat messages for symptom analysis
- `POST /api/appointment/create` - Create a new appointment

## Database Structure

The application uses Neon PostgreSQL with the following tables:

### Patients Table

| Column        | Type           | Description               |
|---------------|----------------|---------------------------|
| id            | SERIAL         | Primary key               |
| tc_number     | VARCHAR(11)    | Unique patient ID number  |
| name          | VARCHAR(100)   | Patient's full name       |
| date_of_birth | DATE           | Date of birth             |
| phone         | VARCHAR(20)    | Contact phone number      |
| email         | VARCHAR(100)   | Email address             |
| created_at    | TIMESTAMP      | Record creation timestamp |

### Appointments Table

| Column           | Type           | Description               |
|------------------|----------------|---------------------------|
| id               | SERIAL         | Primary key               |
| patient_id       | INTEGER        | Foreign key to patients   |
| department       | VARCHAR(100)   | Medical department        |
| doctor_name      | VARCHAR(100)   | Doctor's name             |
| doctor_id        | VARCHAR(100)   | Doctor's ID               |
| appointment_date | TIMESTAMP      | Appointment date and time |
| symptoms         | TEXT           | Patient's symptoms        |
| status           | VARCHAR(20)    | Appointment status        |
| created_at       | TIMESTAMP      | Record creation timestamp |

## Fallback Mechanism

The application includes a fallback to use in-memory data structures if the database connection fails. This ensures the application remains functional even without database access.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

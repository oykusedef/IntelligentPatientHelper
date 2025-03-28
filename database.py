import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        """Connect to Neon PostgreSQL database"""
        try:
            # Get connection string from environment variable
            database_url = os.getenv("DATABASE_URL")
            
            if not database_url:
                raise ValueError("DATABASE_URL environment variable not set")
            
            # Connect to Neon DB
            self.conn = psycopg2.connect(database_url)
            self.conn.autocommit = True
            
            # Create tables if they don't exist
            self.create_tables()
            
            print("Connected to Neon Database successfully!")
            
        except Exception as e:
            print(f"Database connection error: {e}")
            # If connection fails, create in-memory data structures for testing
            self.init_mock_data()

    def create_tables(self):
        """Create necessary tables if they don't exist"""
        try:
            cursor = self.conn.cursor()
            
            # Create patients table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patients (
                    id SERIAL PRIMARY KEY,
                    tc_number VARCHAR(11) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    date_of_birth DATE NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create appointments table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id SERIAL PRIMARY KEY,
                    patient_id INTEGER REFERENCES patients(id),
                    department VARCHAR(100) NOT NULL,
                    doctor_name VARCHAR(100) NOT NULL,
                    doctor_id VARCHAR(100) NOT NULL,
                    appointment_date TIMESTAMP NOT NULL,
                    symptoms TEXT,
                    status VARCHAR(20) DEFAULT 'scheduled',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            cursor.close()
            
        except Exception as e:
            print(f"Error creating tables: {e}")

    def init_mock_data(self):
        """Initialize mock data if database connection fails"""
        print("Using mock data instead of database")
        self.mock_patients = {
            "12345678901": {
                "id": 1,
                "tc_number": "12345678901",
                "name": "John Smith",
                "date_of_birth": "1990-01-01",
                "phone": "5551234567",
                "email": "john@example.com"
            },
            "98765432109": {
                "id": 2,
                "tc_number": "98765432109",
                "name": "Sarah Johnson", 
                "date_of_birth": "1985-05-15",
                "phone": "5559876543",
                "email": "sarah@example.com"
            }
        }
        
        self.mock_appointments = []

    def check_patient_exists(self, tc_number):
        """Check if a patient exists in the database"""
        try:
            print(f"Checking if patient with TC {tc_number} exists")
            
            if not self.conn:
                # Using mock data
                exists = tc_number in self.mock_patients
                patient = self.mock_patients.get(tc_number)
                print(f"Using mock data, patient exists: {exists}")
                return {"exists": exists, "patient": patient}
            
            # Using real database
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM patients WHERE tc_number = %s", (tc_number,))
            patient = cursor.fetchone()
            cursor.close()
            
            print(f"Using database, patient exists: {patient is not None}")
            return {
                "exists": patient is not None,
                "patient": patient
            }
            
        except Exception as e:
            print(f"Error checking patient: {e}")
            return {"exists": False, "patient": None}

    def register_patient(self, patient_data):
        """Register a new patient in the database"""
        try:
            print(f"Registering patient with TC {patient_data['tc_number']}")
            
            if not self.conn:
                # Using mock data
                tc_number = patient_data["tc_number"]
                if tc_number in self.mock_patients:
                    print(f"Mock data: Patient {tc_number} already exists")
                    return {"success": False, "message": "Patient already exists"}
                
                # Add to mock data
                self.mock_patients[tc_number] = {
                    "id": len(self.mock_patients) + 1,
                    **patient_data
                }
                
                print(f"Mock data: Patient {tc_number} registered successfully")
                return {
                    "success": True,
                    "message": "Registration successful",
                    "patient": self.mock_patients[tc_number]
                }
            
            # Using real database
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Check if patient already exists
            cursor.execute("SELECT id FROM patients WHERE tc_number = %s", (patient_data["tc_number"],))
            if cursor.fetchone():
                print(f"Database: Patient {patient_data['tc_number']} already exists")
                cursor.close()
                return {"success": False, "message": "Patient already exists"}
            
            # Insert new patient
            print(f"Database: Registering new patient with data: {patient_data}")
            cursor.execute("""
                INSERT INTO patients (tc_number, name, date_of_birth, phone, email)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, tc_number, name, date_of_birth, phone, email
            """, (
                patient_data["tc_number"],
                patient_data["name"],
                patient_data["date_of_birth"],
                patient_data["phone"],
                patient_data["email"]
            ))
            
            new_patient = cursor.fetchone()
            cursor.close()
            
            print(f"Database: Patient registered successfully: {new_patient}")
            return {
                "success": True,
                "message": "Registration successful",
                "patient": new_patient
            }
            
        except Exception as e:
            print(f"Error registering patient: {e}")
            return {"success": False, "message": f"Registration failed: {str(e)}"}

    def create_appointment(self, appointment_data):
        """Create a new appointment in the database"""
        try:
            if not self.conn:
                # Using mock data
                appointment_id = len(self.mock_appointments) + 1
                self.mock_appointments.append({
                    "id": appointment_id,
                    **appointment_data
                })
                
                return {
                    "success": True,
                    "appointment_id": appointment_id,
                    "department": appointment_data["department"],
                    "appointment_date": appointment_data["appointment_date"],
                    "doctor_name": appointment_data["doctor_name"]
                }
            
            # Using real database
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            
            # Get patient ID from tc_number
            tc_number = appointment_data["tc_number"]
            cursor.execute("SELECT id FROM patients WHERE tc_number = %s", (tc_number,))
            patient = cursor.fetchone()
            
            if not patient:
                cursor.close()
                return {"success": False, "message": "Patient not found"}
            
            patient_id = patient["id"]
            
            # Insert appointment
            cursor.execute("""
                INSERT INTO appointments (patient_id, department, doctor_name, doctor_id, appointment_date, symptoms)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                patient_id,
                appointment_data["department"],
                appointment_data["doctor_name"],
                appointment_data["doctor_id"],
                appointment_data["appointment_date"],
                appointment_data.get("symptoms", "")
            ))
            
            result = cursor.fetchone()
            appointment_id = result["id"]
            cursor.close()
            
            return {
                "success": True,
                "appointment_id": appointment_id,
                "department": appointment_data["department"],
                "appointment_date": appointment_data["appointment_date"],
                "doctor_name": appointment_data["doctor_name"]
            }
            
        except Exception as e:
            print(f"Error creating appointment: {e}")
            return {"success": False, "message": f"Appointment creation failed: {str(e)}"}

# Create a database instance
db = Database() 
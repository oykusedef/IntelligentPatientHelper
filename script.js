// API_URL for backend
const API_URL = 'http://localhost:8000/api';

// Mock veri kullanımı için bir flag ekleyelim
const USE_MOCK_DATA = true;

// Mock veri tanımları
const MOCK_DATA = {
    patientHistory: {
        "past_conditions": ["Migren", "Hipertansiyon"],
        "medications": [
            {"name": "Beloc", "status": "active", "dosage": "50mg", "frequency": "günde bir kez"},
            {"name": "Majezik", "status": "past", "dosage": "100mg", "frequency": "gerektiğinde"}
        ],
        "past_appointments": [
            {"department": "Nöroloji", "date": "2024-01-15", "doctor": "Dr. Ayşe Yılmaz", "diagnosis": "Migren"},
            {"department": "Kardiyoloji", "date": "2024-02-20", "doctor": "Dr. Mehmet Öz", "diagnosis": "Hipertansiyon"}
        ]
    },
    
    diagnoseResult: {
        "recommended_departments": ["Nöroloji", "Dahiliye", "Göz Hastalıkları"],
        "initial_treatment": ["Sessiz, karanlık bir odada dinlenin. Ağrı kesici alabilirsiniz."],
        "warnings": ["Baş ağrısı ile birlikte görme problemleri ciddi olabilir. Lütfen en kısa sürede tıbbi yardım alın."],
        "patient_specific_notes": ["Lütfen doktorunuza şu andaki ilaçlarınızı bildirin: Beloc (50mg)"]
    },
    
    doctorRecommendations: {
        "available_doctors": [
            {
                "name": "Dr. Ayşe Yılmaz",
                "specialization": "Nöroloji",
                "past_visit": {"date": "2024-01-15", "diagnosis": "Migren"}
            },
            {
                "name": "Dr. Ahmet Kaya",
                "specialization": "Nöroloji"
            },
            {
                "name": "Dr. Zeynep Demir",
                "specialization": "Nöroloji"
            }
        ]
    },
    
    appointmentCreated: {
        "success": true,
        "appointment_id": 123,
        "department": "Nöroloji",
        "appointment_date": "2024-04-15T14:30:00",
        "doctor_name": "Dr. Ayşe Yılmaz"
    }
};

// Login işlemi için mock kullanıcı bilgileri
const MOCK_USERS = {
    "12345678901": {
        name: "Ahmet Yılmaz",
        email: "ahmet@example.com",
        phone: "5551234567"
    },
    "98765432109": {
        name: "Ayşe Kaya",
        email: "ayse@example.com",
        phone: "5559876543"
    }
};

// DOM Elements
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const chatSection = document.getElementById('chatSection');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const tcInput = document.getElementById('tcInput');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const showRegisterButton = document.getElementById('showRegisterButton');
const showLoginButton = document.getElementById('showLoginButton');
const patientInfo = document.getElementById('patientInfo');
const patientName = document.getElementById('patientName');
const patientTc = document.getElementById('patientTc');
const recommendationsSection = document.getElementById('recommendationsSection');
const recommendationsList = document.getElementById('recommendationsList');
const departmentsSection = document.getElementById('departmentsSection');
const departmentsList = document.getElementById('departmentsList');
const doctorsSection = document.getElementById('doctorsSection');
const doctorsList = document.getElementById('doctorsList');
const confirmationSection = document.getElementById('confirmationSection');
const confirmationDetails = document.getElementById('confirmationDetails');

// Registration form elements
const registerTcInput = document.getElementById('registerTcInput');
const nameInput = document.getElementById('nameInput');
const dobInput = document.getElementById('dobInput');
const phoneInput = document.getElementById('phoneInput');
const emailInput = document.getElementById('emailInput');

// Chat state
let currentState = 'initial';
let selectedDepartment = null;
let selectedDate = null;
let currentTcNumber = null;
let currentPatient = null;
let selectedDoctor = null;
let inactivityTimer = null;
let currentAppointmentId = null;
let detectedSymptoms = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login with Enter key
    tcInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            await loginUser();
        }
    });

    // Send message with Enter key
    userInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await sendMessage();
        }
    });

    // Button click handlers
    loginButton.addEventListener('click', loginUser);
    sendButton.addEventListener('click', sendMessage);
    registerButton.addEventListener('click', register);
    
    // Toggle registration/login form
    showRegisterButton.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    });
    
    showLoginButton.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // Reset inactivity timer on user activity
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });

    // Set ARIA labels for buttons with icons
    sendButton.setAttribute('aria-label', 'Send message');
});

// Reset inactivity timer
function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (currentPatient) {
        inactivityTimer = setTimeout(logout, 5 * 60 * 1000); // 5 minutes
    }
}

// Logout function
function logout() {
    currentPatient = null;
    currentTcNumber = null;
    selectedDepartment = null;
    selectedDoctor = null;
    selectedDate = null;
    detectedSymptoms = [];
    chatMessages.innerHTML = '';
    loginSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    recommendationsSection.classList.add('hidden');
    departmentsSection.classList.add('hidden');
    doctorsSection.classList.add('hidden');
    confirmationSection.classList.add('hidden');
    tcInput.value = '';
    userInput.value = '';
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

// Login user
async function loginUser() {
    const tcNumber = tcInput.value.trim();
    
    if (!tcNumber || tcNumber.length !== 11 || isNaN(tcNumber)) {
        showNotification('Please enter a valid 11-digit ID number', 'error');
        return;
    }
    
    try {
        // Show loading state
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Checking...';
        loginButton.disabled = true;
        
        // Log API call for debugging
        console.log(`Checking patient with TC: ${tcNumber}`);
        console.log(`API URL: ${API_URL}/patient/check/${tcNumber}`);
        
        // Check if patient exists (using GET endpoint)
        const response = await fetchWithMockFallback(`${API_URL}/patient/check/${tcNumber}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Log response for debugging
        console.log('Patient check response:', response);
        
        // Reset button state
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt" aria-hidden="true"></i> Sign In';
        loginButton.disabled = false;
        
        if (response.exists) {
            // Patient exists, proceed to chat
            currentTcNumber = tcNumber;
            currentPatient = response.patient;
            patientName.textContent = currentPatient.name;
            patientTc.textContent = tcNumber;
            
            // Show chat section
            loginSection.classList.add('hidden');
            chatSection.classList.remove('hidden');
            
            // Welcome message
            addMessage(`Hello ${currentPatient.name}! How can I help you today?`, 'system');
            resetInactivityTimer();
        } else {
            // Patient not found, redirect to registration
            showNotification('User not found. Please register first.', 'info');
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            registerTcInput.value = tcNumber;
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt" aria-hidden="true"></i> Sign In';
        loginButton.disabled = false;
    }
}

// Register new patient
async function register() {
    const tcNumber = registerTcInput.value.trim();
    const name = nameInput.value.trim();
    const dob = dobInput.value;
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    
    // Validate inputs
    if (!tcNumber || tcNumber.length !== 11 || isNaN(tcNumber)) {
        showNotification('Please enter a valid 11-digit ID number', 'error');
        return;
    }
    
    if (!name || name.length < 3) {
        showNotification('Please enter your full name', 'error');
        return;
    }
    
    if (!dob) {
        showNotification('Please enter your date of birth', 'error');
        return;
    }
    
    if (!phone || phone.length < 10) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    if (!email || !email.includes('@') || !email.includes('.')) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Show loading state
        registerButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Registering...';
        registerButton.disabled = true;
        
        // Log API call for debugging
        console.log('Registering patient with data:', {
            tc_number: tcNumber,
            name: name,
            date_of_birth: dob,
            phone: phone,
            email: email
        });
        console.log(`API URL: ${API_URL}/patient/register`);
        
        // Register the patient
        const response = await fetchWithMockFallback(`${API_URL}/patient/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tc_number: tcNumber,
                name: name,
                date_of_birth: dob,
                phone: phone,
                email: email
            })
        });
        
        // Log response for debugging
        console.log('Registration response:', response);
        
        // Reset button state
        registerButton.innerHTML = '<i class="fas fa-user-plus" aria-hidden="true"></i> Register';
        registerButton.disabled = false;
        
        if (response.success) {
            // Registration successful
            showNotification('Registration successful! You can now log in.', 'success');
            
            // Redirect to login page
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            tcInput.value = tcNumber;
        } else {
            // Registration failed
            showNotification(response.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        registerButton.innerHTML = '<i class="fas fa-user-plus" aria-hidden="true"></i> Register';
        registerButton.disabled = false;
    }
}

// Send message
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    
    // Show typing indicator
    addTypingIndicator();
    
    // Process message with AI
    try {
        const response = await fetchWithMockFallback(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tc_number: currentTcNumber,
                message: message
            })
        });
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Process response based on action
        if (response.error) {
            addMessage('There was an error processing your request. Please try again.', 'system');
            return;
        }
        
        // Add AI response
        addMessage(response.message, 'system');
        
        // Save detected symptoms
        if (response.detected_symptoms && response.detected_symptoms.length > 0) {
            detectedSymptoms = response.detected_symptoms;
        }
        
        // Handle different actions
        switch (response.action) {
            case 'ask_more':
                // Just wait for user to provide more info
                break;
                
            case 'recommend_department':
                // Show department recommendations
                recommendDepartments(response.recommended_departments, response.available_doctors);
                break;
        }
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', 'system');
    }
}

// Recommend departments
function recommendDepartments(departments, doctors) {
    // Create department buttons
    const deptButtons = departments.map(dept => {
        return `<button class="dept-button" data-dept="${dept}" aria-label="Select ${dept} department">${dept}</button>`;
    }).join('');
    
    // Add department selection message
    addMessage(`Please select a department for your appointment:`, 'system');
    
    // Add clickable department buttons
    const deptContainer = document.createElement('div');
    deptContainer.className = 'selection-options departments';
    deptContainer.innerHTML = deptButtons;
    chatMessages.appendChild(deptContainer);
    
    // Add event listeners to department buttons
    deptContainer.querySelectorAll('.dept-button').forEach(button => {
        button.addEventListener('click', () => {
            selectedDepartment = button.dataset.dept;
            
            // Show selected department
            addMessage(`You selected: ${selectedDepartment}`, 'user');
            
            // Show available doctors for the selected department
            showDoctorsForDepartment(selectedDepartment, doctors);
        });
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show doctors for selected department
function showDoctorsForDepartment(department, allDoctors) {
    // Filter doctors by selected department
    const departmentDoctors = allDoctors.filter(doctor => doctor.department === department);
    
    if (departmentDoctors.length === 0) {
        addMessage(`Sorry, there are no available doctors in the ${department} department at the moment.`, 'system');
        return;
    }
    
    // Add doctor selection message
    addMessage(`Please select a doctor from the ${department} department:`, 'system');
    
    // Create doctor buttons
    const doctorButtons = departmentDoctors.map((doctor, index) => {
        return `<button class="doctor-button" data-id="${index}" data-name="${doctor.name}" aria-label="Select doctor ${doctor.name}">${doctor.name}</button>`;
    }).join('');
    
    // Add clickable doctor buttons
    const doctorContainer = document.createElement('div');
    doctorContainer.className = 'selection-options doctors';
    doctorContainer.innerHTML = doctorButtons;
    chatMessages.appendChild(doctorContainer);
    
    // Add event listeners to doctor buttons
    doctorContainer.querySelectorAll('.doctor-button').forEach(button => {
        button.addEventListener('click', () => {
            const doctorId = button.dataset.id;
            const doctorName = button.dataset.name;
            
            // Show selected doctor
            addMessage(`You selected: ${doctorName}`, 'user');
            
            // Save selected doctor
            selectedDoctor = {
                id: doctorId,
                name: doctorName,
                department: department
            };
            
            // Show date selection
            showDateSelection();
        });
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show date selection
function showDateSelection() {
    // Generate next 7 days
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
            continue;
        }
        
        dates.push({
            date: date,
            formatted: formatDate(date)
        });
    }
    
    // Add date selection message
    addMessage(`Please select an appointment date:`, 'system');
    
    // Create date buttons
    const dateButtons = dates.map(d => {
        return `<button class="date-button" data-date="${d.date.toISOString()}" aria-label="Select date ${d.formatted}">${d.formatted}</button>`;
    }).join('');
    
    // Add clickable date buttons
    const dateContainer = document.createElement('div');
    dateContainer.className = 'selection-options dates';
    dateContainer.innerHTML = dateButtons;
    chatMessages.appendChild(dateContainer);
    
    // Add event listeners to date buttons
    dateContainer.querySelectorAll('.date-button').forEach(button => {
        button.addEventListener('click', () => {
            const selectedDateIso = button.dataset.date;
            const selectedDateObj = new Date(selectedDateIso);
            
            // Format date for display
            const formattedDate = formatDate(selectedDateObj);
            
            // Show selected date
            addMessage(`You selected: ${formattedDate}`, 'user');
            
            // Save selected date
            selectedDate = selectedDateIso;
            
            // Show time selection
            showTimeSelection(selectedDateObj);
        });
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show time selection
function showTimeSelection(date) {
    // Generate time slots (9 AM to 4 PM, 1-hour intervals)
    const timeSlots = [];
    const startHour = 9;
    const endHour = 16;
    
    for (let hour = startHour; hour <= endHour; hour++) {
        const timeObj = new Date(date);
        timeObj.setHours(hour, 0, 0, 0);
        
        timeSlots.push({
            time: timeObj,
            formatted: formatTime(timeObj)
        });
    }
    
    // Add time selection message
    addMessage(`Please select an appointment time:`, 'system');
    
    // Create time buttons
    const timeButtons = timeSlots.map(t => {
        return `<button class="time-button" data-time="${t.time.toISOString()}" aria-label="Select time ${t.formatted}">${t.formatted}</button>`;
    }).join('');
    
    // Add clickable time buttons
    const timeContainer = document.createElement('div');
    timeContainer.className = 'selection-options times';
    timeContainer.innerHTML = timeButtons;
    chatMessages.appendChild(timeContainer);
    
    // Add event listeners to time buttons
    timeContainer.querySelectorAll('.time-button').forEach(button => {
        button.addEventListener('click', () => {
            const selectedTimeIso = button.dataset.time;
            const selectedTimeObj = new Date(selectedTimeIso);
            
            // Format time for display
            const formattedTime = formatTime(selectedTimeObj);
            
            // Show selected time
            addMessage(`You selected: ${formattedTime}`, 'user');
            
            // Save selected time (full datetime)
            selectedDate = selectedTimeIso;
            
            // Show appointment confirmation
            confirmAppointment();
        });
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Confirm appointment
function confirmAppointment() {
    const appointmentDate = new Date(selectedDate);
    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentDate);
    
    // Show appointment details
    addMessage(`
        <div class="appointment-confirmation">
            <h3>Appointment Details</h3>
            <p><strong>Department:</strong> ${selectedDepartment}</p>
            <p><strong>Doctor:</strong> ${selectedDoctor.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Symptoms:</strong> ${detectedSymptoms.join(', ')}</p>
        </div>
    `, 'system');
    
    // Add confirmation buttons
    const confirmContainer = document.createElement('div');
    confirmContainer.className = 'confirmation-buttons';
    confirmContainer.innerHTML = `
        <button id="confirmButton" class="confirm-button" aria-label="Confirm appointment">Confirm Appointment</button>
        <button id="cancelButton" class="cancel-button" aria-label="Cancel appointment">Cancel</button>
    `;
    chatMessages.appendChild(confirmContainer);
    
    // Add event listeners to confirmation buttons
    document.getElementById('confirmButton').addEventListener('click', async () => {
        // Book the appointment
        await bookAppointment();
    });
    
    document.getElementById('cancelButton').addEventListener('click', () => {
        addMessage('Appointment booking cancelled.', 'system');
        addMessage('How else can I help you today?', 'system');
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Book appointment
async function bookAppointment() {
    try {
        // Show loading message
        addMessage('Booking your appointment...', 'system');
        
        // Book the appointment
        const response = await fetchWithMockFallback(`${API_URL}/appointment/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tc_number: currentTcNumber,
                department: selectedDepartment,
                doctor_id: selectedDoctor.id,
                appointment_date: selectedDate
            })
        });
        
        if (response.success) {
            // Show success message
            addMessage(`
                <div class="appointment-success">
                    <h3>Appointment Booked Successfully!</h3>
                    <p>Your appointment has been confirmed with ${selectedDoctor.name} on ${formatDate(new Date(selectedDate))} at ${formatTime(new Date(selectedDate))}.</p>
                    <p>Appointment ID: ${response.appointment_id}</p>
                    <p>Please arrive 15 minutes before your appointment time.</p>
                </div>
            `, 'system');
            
            // Reset selection
            selectedDepartment = null;
            selectedDoctor = null;
            selectedDate = null;
            
            // Ask if they need anything else
            addMessage('Is there anything else I can help you with today?', 'system');
        } else {
            // Show error message
            addMessage('Sorry, we could not book your appointment. Please try again.', 'system');
        }
    } catch (error) {
        console.error('Booking error:', error);
        addMessage('An error occurred while booking your appointment. Please try again.', 'system');
    }
}

// Add message to chat
function addMessage(message, sender = 'system') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.innerHTML = `<p>${message}</p>`;
    
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const typingElement = document.createElement('div');
    typingElement.className = 'message system typing-indicator';
    typingElement.innerHTML = `
        <div class="message-content">
            <div class="typing-dots" aria-label="Bot is typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification type and message
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// Helper functions
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(date) {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString('en-US', options);
}

// API fetch with mock fallback
async function fetchWithMockFallback(url, options) {
    if (!USE_MOCK_DATA) {
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('API error:', error);
            console.warn('Falling back to mock data');
            // Fall back to mock data
            return getMockDataForUrl(url, options);
        }
    }
    
    // Return mock data directly if USE_MOCK_DATA is true
    return getMockDataForUrl(url, options);
}

// Get mock data for URL
function getMockDataForUrl(url, options) {
    // Convert POST body to an object if it exists
    let requestData = {};
    if (options && options.body) {
        try {
            requestData = JSON.parse(options.body);
        } catch (e) {
            console.error('Error parsing request body:', e);
        }
    }
    
    // Extract TC number from URL for GET requests
    let tcNumber = '';
    if (url.includes('/patient/check/') && options.method === 'GET') {
        tcNumber = url.split('/patient/check/')[1];
    } else if (url.includes('/patient/check') && options.method === 'POST') {
        tcNumber = requestData.tc_number;
    }
    
    // Mock login (supports both GET and POST methods)
    if (url.includes('/patient/check')) {
        // Demo accounts for testing
        const mockUsers = {
            "12345678901": { name: "John Smith", email: "john@example.com", phone: "5551234567" },
            "98765432109": { name: "Sarah Johnson", email: "sarah@example.com", phone: "5559876543" }
        };
        
        const exists = mockUsers[tcNumber] !== undefined;
        
        return {
            exists: exists,
            patient: exists ? mockUsers[tcNumber] : null
        };
    }
    
    // Mock registration
    if (url.includes('/patient/register')) {
        return {
            success: true,
            message: 'Registration successful',
            patient: {
                id: Math.floor(Math.random() * 1000),
                name: requestData.name,
                tc_number: requestData.tc_number
            }
        };
    }
    
    // Mock chat
    if (url.includes('/chat')) {
        const message = requestData.message.toLowerCase();
        
        // Simple keyword matching for the demo
        const hasHeadache = message.includes('headache') || message.includes('head pain');
        const hasStomachPain = message.includes('stomach') || message.includes('belly') || message.includes('nausea');
        const hasFever = message.includes('fever') || message.includes('temperature');
        const hasCough = message.includes('cough');
        
        let detectedSymptoms = [];
        let departments = [];
        
        if (hasHeadache) {
            detectedSymptoms.push('headache');
            departments.push('Neurology');
        }
        
        if (hasStomachPain) {
            detectedSymptoms.push('stomach pain');
            departments.push('Gastroenterology');
        }
        
        if (hasFever) {
            detectedSymptoms.push('fever');
            departments.push('Internal Medicine');
        }
        
        if (hasCough) {
            detectedSymptoms.push('cough');
            departments.push('ENT');
        }
        
        // If no symptoms detected
        if (detectedSymptoms.length === 0) {
            return {
                message: "I'm not sure I understood your symptoms. Could you describe what you're experiencing in more detail?",
                detected_symptoms: [],
                action: "ask_more"
            };
        }
        
        // Remove duplicates
        departments = [...new Set(departments)];
        
        // Generate mock doctors
        const mockDoctors = [];
        departments.forEach(dept => {
            mockDoctors.push({ name: `Dr. John Smith`, department: dept });
            mockDoctors.push({ name: `Dr. Sarah Johnson`, department: dept });
        });
        
        return {
            message: `Based on your symptoms, I've detected you may have: ${detectedSymptoms.join(', ')}. ` +
                   `I recommend consulting with doctors in these departments: ${departments.join(', ')}.`,
            detected_symptoms: detectedSymptoms,
            severity: "medium",
            recommended_departments: departments,
            initial_treatment: ["Rest and drink plenty of fluids. Take over-the-counter medication if needed."],
            available_doctors: mockDoctors,
            action: "recommend_department"
        };
    }
    
    // Mock appointment booking
    if (url.includes('/appointment/create')) {
        return {
            success: true,
            appointment_id: Math.floor(Math.random() * 10000),
            department: requestData.department,
            appointment_date: requestData.appointment_date,
            doctor_name: selectedDoctor ? selectedDoctor.name : 'Dr. John Smith'
        };
    }
    
    // Default mock data
    return { error: 'No mock data available for this endpoint' };
} 
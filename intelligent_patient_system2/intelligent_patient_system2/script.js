// API_URL değişkenini localhost olarak ayarlayalım
const API_URL = 'http://localhost:8001/api';

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
const logoutButton = document.getElementById('logoutButton');

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
        if (e.key === 'Enter') {
            await sendMessage();
        }
    });

    // Button click handlers
    loginButton.addEventListener('click', loginUser);
    sendButton.addEventListener('click', sendMessage);
    logoutButton.addEventListener('click', logout);
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
    selectedDepartment = null;
    selectedDoctor = null;
    chatMessages.innerHTML = '';
    loginSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    tcInput.value = '';
    userInput.value = '';
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

// Display patient info
function displayPatientInfo(patient) {
    const details = document.createElement('div');
    details.innerHTML = `
        <p><strong>Past Conditions:</strong> ${patient.past_conditions.length > 0 ? patient.past_conditions.join(', ') : 'None'}</p>
        <p><strong>Active Medications:</strong></p>
        <ul>
            ${patient.medications && patient.medications.filter(med => med.status === 'active').length > 0 
                ? patient.medications
                    .filter(med => med.status === 'active')
                    .map(med => `<li>${med.name} (${med.dosage}, ${med.frequency})</li>`)
                    .join('')
                : '<li>No active medications</li>'
            }
        </ul>
        <p><strong>Recent Appointments:</strong></p>
        <ul>
            ${patient.past_appointments && patient.past_appointments.length > 0
                ? patient.past_appointments
                    .slice(-2)
                    .map(apt => `<li>${apt.date}: ${apt.department} - ${apt.doctor}</li>`)
                    .join('')
                : '<li>No recent appointments</li>'
            }
        </ul>
    `;
    patientInfo.querySelector('#patientDetails').innerHTML = '';
    patientInfo.querySelector('#patientDetails').appendChild(details);
}

// Register new patient
async function register() {
    const tcNumber = registerTcInput.value.trim();
    const name = nameInput.value.trim();
    const dob = dobInput.value;
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    
    // Validate inputs
    if (tcNumber.length !== 11) {
        alert('Please enter a valid 11-digit ID number.');
        return;
    }
    
    if (!name || !dob || !phone || !email) {
        alert('Please fill in all fields.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/patient/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tc_number: tcNumber,
                name: name,
                date_of_birth: dob,
                phone: phone,
                email: email
            })
        });
        
        if (!response.ok) {
            throw new Error('Registration failed');
        }
        
        const data = await response.json();
        
        alert('Registration successful! You can now login with your ID number.');
        
        // Switch to login form and pre-fill TC number
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        tcInput.value = tcNumber;
        
        // Clear registration form
        registerTcInput.value = '';
        nameInput.value = '';
        dobInput.value = '';
        phoneInput.value = '';
        emailInput.value = '';
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration. Please try again.');
    }
}

// Login button event
loginButton.addEventListener('click', () => {
    const tcNumber = tcInput.value.trim();
    
    if (!tcNumber || tcNumber.length !== 11 || !/^\d+$/.test(tcNumber)) {
        showMessage('Lütfen geçerli bir TC Kimlik numarası giriniz (11 haneli rakam)', 'error');
        return;
    }
    
    if (USE_MOCK_DATA) {
        // Mock data ile login
        if (MOCK_USERS[tcNumber]) {
            currentPatient = {
                tcNumber: tcNumber,
                name: MOCK_USERS[tcNumber].name
            };
            
            showMessage('Giriş başarılı', 'success');
            
            // Hasta bilgilerini göster
            document.getElementById('patientName').textContent = MOCK_USERS[tcNumber].name;
            document.getElementById('patientTc').textContent = tcNumber;
            
            // Sohbet ekranını göster
            hideAllSections();
            chatSection.classList.remove('hidden');
            
            // Hasta geçmişini getir
            fetchWithMockFallback(`${API_URL}/patient/${tcNumber}/history`)
                .then(data => {
                    // Geçmiş bilgilerini işle
                    console.log("Hasta geçmişi:", data);
                });
        } else {
            showMessage('Bu TC numarası ile kayıtlı hasta bulunamadı. Lütfen kayıt olun.', 'error');
        }
    } else {
        // Gerçek API çağrısı
        fetch(`${API_URL}/patient/${tcNumber}/history`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Bu TC numarası ile kayıtlı hasta bulunamadı. Lütfen kayıt olun.');
                }
                return response.json();
            })
            .then(data => {
                currentPatient = {
                    tcNumber: tcNumber,
                    name: data.name || "Hasta"
                };
                
                showMessage('Giriş başarılı', 'success');
                
                // Sohbet ekranını göster
                hideAllSections();
                chatSection.classList.remove('hidden');
            })
            .catch(error => {
                showMessage(error.message, 'error');
            });
    }
});

// Mesaj gönderme fonksiyonunu güncelle
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Kullanıcı mesajını ekle
    addMessage(message, 'user');
    userInput.value = '';
    
    // Yapay zeka cevabını simüle et
    const aiResponse = await simulateAIResponse(message);
    addMessage(aiResponse, 'system');
}

// Yapay zeka cevabını simüle etme fonksiyonu
async function simulateAIResponse(userMessage) {
    // Kullanıcı mesajına göre basit cevaplar
    const lowerMessage = userMessage.toLowerCase();
    
    // Hasta cevaplarını simüle et
    if (lowerMessage.includes('baş ağrısı') || lowerMessage.includes('başım ağrıyor')) {
        setTimeout(() => {
            showDiagnosisResults({
                symptoms: 'baş ağrısı',
                severity: 'orta',
                duration: '3 gün'
            });
        }, 1000);
        return 'Baş ağrınız için size bazı bölümler önereceğim. Lütfen bekleyin...';
    } 
    else if (lowerMessage.includes('göz') || lowerMessage.includes('görme')) {
        setTimeout(() => {
            showDiagnosisResults({
                symptoms: 'görme problemi, göz ağrısı',
                severity: 'hafif',
                duration: '1 hafta'
            });
        }, 1000);
        return 'Göz şikayetleriniz için size bazı bölümler önereceğim. Lütfen bekleyin...';
    }
    else if (lowerMessage.includes('karın ağrısı') || lowerMessage.includes('mide')) {
        setTimeout(() => {
            showDiagnosisResults({
                symptoms: 'karın ağrısı, mide bulantısı',
                severity: 'orta',
                duration: '2 gün'
            });
        }, 1000);
        return 'Karın ağrınız için size bazı bölümler önereceğim. Lütfen bekleyin...';
    }
    else if (lowerMessage.includes('randevu') || lowerMessage.includes('doktor')) {
        return 'Hangi bölümden randevu almak istiyorsunuz? Lütfen şikayetlerinizi anlatın.';
    }
    else if (lowerMessage.includes('teşekkür') || lowerMessage.includes('sağol')) {
        return 'Rica ederim! Başka bir konuda yardımcı olabilir miyim?';
    }
    else {
        return 'Sağlık durumunuz hakkında daha fazla bilgi verebilir misiniz? Şikayetlerinizi detaylı anlatırsanız size daha iyi yardımcı olabilirim.';
    }
}

// Teşhis sonuçlarını gösterme fonksiyonu
function showDiagnosisResults(symptomData) {
    // Teşhis API'sini çağırarak sonuçları göster
    diagnoseProblem(currentTcNumber, symptomData.symptoms, symptomData.severity, symptomData.duration)
        .then(data => {
            // Sonuçları chat ekranında göster
            let resultMessage = 'Değerlendirme sonuçları:\n\n';
            
            if (data.recommended_departments && data.recommended_departments.length > 0) {
                resultMessage += '🏥 Önerilen Bölümler:\n' + data.recommended_departments.join('\n') + '\n\n';
            }
            
            if (data.initial_treatment && data.initial_treatment.length > 0) {
                resultMessage += '💊 İlk Tedavi Önerileri:\n' + data.initial_treatment.join('\n') + '\n\n';
            }
            
            if (data.warnings && data.warnings.length > 0) {
                resultMessage += '⚠️ Uyarılar:\n' + data.warnings.join('\n') + '\n\n';
            }
            
            if (data.patient_specific_notes && data.patient_specific_notes.length > 0) {
                resultMessage += '📝 Kişisel Notlar:\n' + data.patient_specific_notes.join('\n');
            }
            
            addMessage(resultMessage, 'system');
            
            // Bölüm seçimi için butonları göster
            setTimeout(() => {
                const departmentOptions = 'Hangi bölümden randevu almak istersiniz?\n\n' + 
                data.recommended_departments.map((dept, index) => 
                    `${index + 1}. ${dept}`
                ).join('\n');
                
                addMessage(departmentOptions, 'system');
                
                // Bölüm seçimi için özel bir mesaj alanı oluştur
                const selectDeptMessage = document.createElement('div');
                selectDeptMessage.className = 'message system';
                
                const deptButtons = document.createElement('div');
                deptButtons.className = 'department-buttons';
                
                data.recommended_departments.forEach(dept => {
                    const button = document.createElement('button');
                    button.textContent = dept;
                    button.onclick = () => selectDepartment(dept);
                    deptButtons.appendChild(button);
                });
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.appendChild(deptButtons);
                
                selectDeptMessage.appendChild(messageContent);
                chatMessages.appendChild(selectDeptMessage);
                
                // Otomatik scrolling
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1500);
        });
}

// Bölüm seçimi
function selectDepartment(department) {
    selectedDepartment = department;
    addMessage(`${department} bölümünü seçtiniz. Doktor önerileri getiriliyor...`, 'system');
    
    // Doktor önerilerini getir
    getRecommendedDoctors(currentTcNumber, department, new Date().toISOString().split('T')[0])
        .then(data => {
            if (data.available_doctors && data.available_doctors.length > 0) {
                let doctorOptions = 'Aşağıdaki doktorlardan birini seçebilirsiniz:\n\n';
                
                data.available_doctors.forEach((doctor, index) => {
                    doctorOptions += `${index + 1}. ${doctor.name}`;
                    
                    if (doctor.past_visit) {
                        doctorOptions += ` (Daha önce gittiğiniz doktor: ${doctor.past_visit.date})`;
                    }
                    
                    doctorOptions += '\n';
                });
                
                addMessage(doctorOptions, 'system');
                
                // Doktor seçim butonları
                const selectDoctorMessage = document.createElement('div');
                selectDoctorMessage.className = 'message system';
                
                const doctorButtons = document.createElement('div');
                doctorButtons.className = 'doctor-buttons';
                
                data.available_doctors.forEach((doctor, index) => {
                    const button = document.createElement('button');
                    button.textContent = doctor.name;
                    button.onclick = () => selectDoctor(index + 1, doctor.name);
                    doctorButtons.appendChild(button);
                });
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.appendChild(doctorButtons);
                
                selectDoctorMessage.appendChild(messageContent);
                chatMessages.appendChild(selectDoctorMessage);
                
                // Otomatik scrolling
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                addMessage('Üzgünüm, şu anda uygun doktor bulunamadı.', 'system');
            }
        });
}

// Doktor seçimi
function selectDoctor(doctorId, doctorName) {
    selectedDoctorId = doctorId;
    selectedDoctorName = doctorName;
    
    addMessage(`${doctorName} doktoru seçildi. Uygun zamanlar getiriliyor...`, 'system');
    
    // Zaman seçimi için mock tarihler
    setTimeout(() => {
        const today = new Date();
        const timeSlots = [];
        
        // Önümüzdeki 7 günün zaman dilimlerini oluştur
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            // Hafta sonu hariç
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                // 09:00 - 16:00 arası saatler
                for (let hour = 9; hour <= 16; hour++) {
                    if (hour !== 12) { // Öğle arası hariç
                        timeSlots.push({
                            date: date.toISOString().split('T')[0],
                            time: `${hour}:00`,
                            datetime: `${date.toISOString().split('T')[0]}T${hour}:00:00`
                        });
                    }
                }
            }
        }
        
        let timeOptions = 'Aşağıdaki zaman dilimlerinden birini seçebilirsiniz:\n\n';
        
        // Zaman dilimlerini formatla
        const formattedTimeSlots = {};
        timeSlots.forEach(slot => {
            if (!formattedTimeSlots[slot.date]) {
                formattedTimeSlots[slot.date] = [];
            }
            formattedTimeSlots[slot.date].push(slot);
        });
        
        // Zaman dilimlerini ekrana yazdır
        Object.keys(formattedTimeSlots).forEach(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            timeOptions += `📅 ${formattedDate}:\n`;
            formattedTimeSlots[date].forEach(slot => {
                timeOptions += `   🕒 ${slot.time}\n`;
            });
            timeOptions += '\n';
        });
        
        addMessage(timeOptions, 'system');
        
        // Zaman seçimi için butonları göster
        Object.keys(formattedTimeSlots).forEach(date => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const dateMessage = document.createElement('div');
            dateMessage.className = 'message system';
            
            const dateContent = document.createElement('div');
            dateContent.className = 'message-content';
            
            const dateTitle = document.createElement('p');
            dateTitle.textContent = formattedDate;
            dateTitle.style.fontWeight = 'bold';
            dateContent.appendChild(dateTitle);
            
            const timeButtons = document.createElement('div');
            timeButtons.className = 'time-slots';
            
            formattedTimeSlots[date].forEach(slot => {
                const button = document.createElement('button');
                button.textContent = slot.time;
                button.onclick = () => selectTimeSlot(slot.datetime);
                timeButtons.appendChild(button);
            });
            
            dateContent.appendChild(timeButtons);
            dateMessage.appendChild(dateContent);
            chatMessages.appendChild(dateMessage);
        });
        
        // Otomatik scrolling
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Zaman dilimi seçimi
function selectTimeSlot(dateTime) {
    selectedDateTime = dateTime;
    
    const dateObj = new Date(dateTime);
    const formattedDate = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    addMessage(`${formattedDate} ${formattedTime} için randevu oluşturuluyor...`, 'system');
    
    // Randevu oluştur
    createAppointment(currentTcNumber, selectedDepartment, selectedDoctorId, selectedDateTime)
        .then(data => {
            if (data.success) {
                const appointmentDate = new Date(data.appointment_date);
                const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedTime = appointmentDate.toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const confirmationMessage = `✅ Randevunuz başarıyla oluşturuldu!

🏥 Bölüm: ${data.department}
👨‍⚕️ Doktor: ${data.doctor_name}
📅 Tarih: ${formattedDate}
🕒 Saat: ${formattedTime}
🆔 Randevu No: ${data.appointment_id}

Randevu saatinden 15 dakika önce hastanede olmanız önerilir. Sorularınız için bize ulaşabilirsiniz.`;
                
                addMessage(confirmationMessage, 'system');
                
                // Randevu bilgilerini sıfırla
                selectedDepartment = null;
                selectedDoctorId = null;
                selectedDoctorName = null;
                selectedDateTime = null;
            } else {
                addMessage('Randevu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.', 'system');
            }
        });
}

// Add message to chat
function addMessage(message, sender = 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const appointmentForm = document.getElementById('appointmentForm');
    const bookButtons = document.querySelectorAll('.primary-btn');
    const navLinks = document.querySelectorAll('nav a');
    
    // Form Submission
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(appointmentForm);
            const appointmentData = {};
            
            for (let [key, value] of formData.entries()) {
                appointmentData[key] = value;
            }
            
            // Simulate API call
            simulateAppointmentBooking(appointmentData);
        });
    }
    
    // Book Appointment Button Click
    bookButtons.forEach(button => {
        if (button.textContent.includes('Book Appointment')) {
            button.addEventListener('click', function() {
                const appointmentSection = document.querySelector('.appointment-form');
                if (appointmentSection) {
                    appointmentSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });
    
    // Navigation Active State
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // If it's a real link, navigate to the page
            // For demo purposes, we're just showing the active state
        });
    });
    
    // Initialize the intelligent referral system
    initializeReferralSystem();
});

// Simulate appointment booking
function simulateAppointmentBooking(data) {
    // Show loading state
    const submitButton = document.querySelector('form .primary-btn');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    // Simulate API delay
    setTimeout(() => {
        // Analyze appointment data with "AI"
        const response = analyzeAppointmentRequest(data);
        
        // Show success message
        showNotification(response.message, 'success');
        
        // Reset form
        document.getElementById('appointmentForm').reset();
        
        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }, 1500);
}

// Analyze appointment request (simulated AI logic)
function analyzeAppointmentRequest(data) {
    // This would be where the actual AI logic would go
    // For demo purposes, we're just returning a success message
    
    const doctorName = getRecommendedDoctor(data.department);
    const appointmentDate = new Date(data.date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    return {
        success: true,
        message: `Appointment request received! Based on your symptoms, we've matched you with Dr. ${doctorName}. Your appointment is scheduled for ${formattedDate} at ${data.time}. You will receive a confirmation email shortly.`,
        recommendedDoctor: doctorName,
        priority: getPriorityLevel(data.symptoms)
    };
}

// Get recommended doctor based on department (simulated)
function getRecommendedDoctor(department) {
    const doctors = {
        'cardiology': 'Emma Wilson',
        'neurology': 'James Thompson',
        'orthopedics': 'Sarah Miller',
        'pediatrics': 'Robert Johnson',
        'dermatology': 'Lisa Chen',
        'ophthalmology': 'David Kim'
    };
    
    return doctors[department] || 'John Smith';
}

// Get priority level based on symptoms (simulated AI analysis)
function getPriorityLevel(symptoms) {
    // This would be where the actual symptom analysis would happen
    // For demo purposes, we're just checking for keywords
    
    const urgentKeywords = ['severe', 'pain', 'emergency', 'acute', 'critical'];
    const symptomText = symptoms.toLowerCase();
    
    for (const keyword of urgentKeywords) {
        if (symptomText.includes(keyword)) {
            return 'high';
        }
    }
    
    return 'normal';
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.maxWidth = '400px';
    notification.style.backgroundColor = type === 'success' ? '#34a853' : '#1a73e8';
    notification.style.color = 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '1000';
    notification.style.display = 'flex';
    notification.style.justifyContent = 'space-between';
    notification.style.alignItems = 'center';
    
    // Close button styles
    const closeButton = notification.querySelector('.notification-close');
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '10px';
    
    // Add close functionality
    closeButton.addEventListener('click', function() {
        document.body.removeChild(notification);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

// Initialize the intelligent referral system
function initializeReferralSystem() {
    console.log('Patient Referral Intelligent System initialized');
    // This would be where the actual system initialization would happen
    // For demo purposes, we're just logging a message
}

// Add some additional features for the demo
function addDemoFeatures() {
    // Simulate real-time doctor availability
    setInterval(() => {
        const departments = ['cardiology', 'neurology', 'orthopedics', 'pediatrics', 'dermatology', 'ophthalmology'];
        const randomDept = departments[Math.floor(Math.random() * departments.length)];
        const doctorName = getRecommendedDoctor(randomDept);
        const waitTime = Math.floor(Math.random() * 30) + 5;
        
        console.log(`Current wait time for Dr. ${doctorName} (${randomDept}): ${waitTime} minutes`);
    }, 10000); // Update every 10 seconds
}

// Call demo features in non-production environment
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    addDemoFeatures();
}

// Add clickable options to chat
function addClickableOptions(options) {
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'chat-options';
    
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option.text;
        button.onclick = async () => {
            addMessage(option.message || option.text, 'user');
            if (option.action) {
                await option.action();
            } else {
                await processUserInput(option.message || option.text);
            }
        };
        optionsDiv.appendChild(button);
    });
    
    chatMessages.appendChild(optionsDiv);
}

// Add CSS for new buttons
const style = document.createElement('style');
style.textContent = `
    .chat-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 10px 0;
    }
    
    .option-button {
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 20px;
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.3s;
        text-align: left;
    }
    
    .option-button:hover {
        background-color: #0056b3;
    }
`;
document.head.appendChild(style);

// API çağrılarında mock data kullanımı için fonksiyonlar
async function fetchWithMockFallback(url, options) {
    if (!USE_MOCK_DATA) {
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('API çağrısı başarısız:', error);
            // API çağrısı başarısız olduğunda mock dataya düşelim
            return getMockDataForUrl(url);
        }
    } else {
        // Mock data kullanılıyorsa doğrudan mock veriyi döndür
        return getMockDataForUrl(url);
    }
}

function getMockDataForUrl(url) {
    if (url.includes('/patient/') && url.includes('/history')) {
        return MOCK_DATA.patientHistory;
    } else if (url.includes('/diagnose')) {
        return MOCK_DATA.diagnoseResult;
    } else if (url.includes('/recommend')) {
        return MOCK_DATA.doctorRecommendations;
    } else if (url.includes('/appointment/create')) {
        return MOCK_DATA.appointmentCreated;
    } else {
        return {}; // Bilinmeyen endpoint için boş obje döndür
    }
}

// API çağrı fonksiyonları güncellenir
async function getPatientHistory(tcNumber) {
    return await fetchWithMockFallback(`${API_URL}/patient/${tcNumber}/history`);
}

async function diagnoseProblem(tcNumber, symptoms, severity, duration) {
    if (!USE_MOCK_DATA) {
        const response = await fetch(`${API_URL}/patient/diagnose`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tc_number: tcNumber,
                symptoms: symptoms,
                severity: severity,
                duration: duration
            })
        });
        return await response.json();
    } else {
        return MOCK_DATA.diagnoseResult;
    }
}

async function getRecommendedDoctors(tcNumber, department, preferredDate) {
    if (!USE_MOCK_DATA) {
        const response = await fetch(`${API_URL}/patient/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tc_number: tcNumber,
                department: department,
                preferred_date: preferredDate
            })
        });
        return await response.json();
    } else {
        return MOCK_DATA.doctorRecommendations;
    }
}

async function createAppointment(tcNumber, department, doctorId, appointmentDate) {
    if (!USE_MOCK_DATA) {
        const response = await fetch(`${API_URL}/appointment/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tc_number: tcNumber,
                department: department,
                doctor_id: doctorId,
                appointment_date: appointmentDate
            })
        });
        return await response.json();
    } else {
        return MOCK_DATA.appointmentCreated;
    }
} 
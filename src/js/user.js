import { v4 as uuidv4 } from 'uuid'; // הוספת ספריית uuid

class UserManager {
    constructor() {
        console.log("UserManager initialized");
        this.userContainer = document.getElementById("userContainer");
        this.loginButton = document.getElementById("loginButton");
        this.signupButton = document.getElementById("signupButton");
        this.logoutButton = document.getElementById("logoutButton");
        this.userGreeting = document.getElementById("userGreeting");
        
        this.loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
        this.initializeEventListeners();
        this.checkAuthStatus();
    }

    initializeEventListeners() {
        console.log("Initializing event listeners");
        
        if (this.loginButton) {
            this.loginButton.addEventListener("click", () => {
                console.log("Login button clicked");
                this.createModal("login");
            });
        }
        
        if (this.signupButton) {
            this.signupButton.addEventListener("click", () => {
                console.log("Signup button clicked");
                this.createModal("register");
            });
        }

        if (this.logoutButton) {
            this.logoutButton.addEventListener("click", () => {
                console.log("Logout button clicked");
                this.logout();
            });
        }

        // הוספת האזנה לכפתור העין
        document.addEventListener('click', (e) => {
            if (e.target.id === 'eyeIcon') {
                const passwordInput = document.getElementById('passwordInput');
                const eyeIcon = e.target;
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    eyeIcon.classList.remove('fa-eye');
                    eyeIcon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    eyeIcon.classList.remove('fa-eye-slash');
                    eyeIcon.classList.add('fa-eye');
                }
            }
        });

        document.addEventListener('submit', (event) => {
            event.preventDefault();
            if (event.target.id === 'registerForm') {
                console.log("Register form submitted");
                this.handleRegister(event.target);
            } else if (event.target.id === 'loginForm') {
                console.log("Login form submitted");
                const credentials = {
                    username: event.target.querySelector('input[type="tel"]').value,
                    password: event.target.querySelector('input[type="password"]').value
                };
                this.login(credentials);
            }
        });
    }

    checkAuthStatus() {
        if (this.loggedInUser) {
            console.log("User is logged in");
            this.updateUIForLoggedInUser();
        } else {
            console.log("No user is logged in");
            this.updateUIForLoggedOutUser();
        }
    }

    updateUIForLoggedInUser() {
        this.userGreeting.textContent = `שלום ${this.loggedInUser.name}`;
        this.loginButton.style.display = "none";
        this.signupButton.style.display = "none";
        this.logoutButton.style.display = "inline-block";
        const userNameElement = document.querySelector('#userName');
        if (userNameElement) {
            userNameElement.textContent = this.loggedInUser.name;
        } else {
            console.error('Element #userName not found');
        }
    }

    updateUIForLoggedOutUser() {
        this.userGreeting.textContent = '';
        this.loginButton.style.display = "inline-block";
        this.signupButton.style.display = "inline-block";
        this.logoutButton.style.display = "none";
    }

    async handleRegister(form) {
        console.log('Register form submitted');
    
        try {
            const inputs = {
                name: form.querySelector('#nameInput'),
                phone: form.querySelector('#phoneInput'),
                password: form.querySelector('#passwordInput'),
                city: form.querySelector('select[name="city"]'),
                address: form.querySelector('#addressInput')
            };

            // בדיקת כפילויות
            const existingUsers = await fetch('/api/getUsers');
            if (!existingUsers.ok) {
                throw new Error('שגיאה בקבלת משתמשים');
            }
            const usersData = await existingUsers.json();
            const duplicateUser = usersData.find(user => 
                user.name === inputs.name.value.trim() || 
                user.phone === inputs.phone.value.trim() || 
                user.address === inputs.address.value.trim()
            );

            if (duplicateUser) {
                const confirmMessage = `משתמש עם פרטים דומים קיים. האם ברצונך להמשיך?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }

            // טיפול במספר טלפון
            let phoneNumber = inputs.phone.value.trim();
            console.log('מספר טלפון לפני עיבוד:', phoneNumber);
            
            // הסרת מקפים ורווחים
            phoneNumber = phoneNumber.replace(/[\s-]/g, '');
            
            // טיפול בקידומות בינלאומיות
            if (phoneNumber.startsWith('+972')) {
                phoneNumber = '0' + phoneNumber.substring(4);
            } else if (phoneNumber.startsWith('972')) {
                phoneNumber = '0' + phoneNumber.substring(3);
            } else if (!phoneNumber.startsWith('0') && phoneNumber) {
                phoneNumber = '0' + phoneNumber; // אם אין קידומת, הוסף 0
            }
    
            console.log('מספר טלפון לאחר עיבוד:', phoneNumber);

            // יצירת מזהה ייחודי (UUID)
            const id = uuidv4();

            // קביעת תאריך הצטרפות
            const join_date = new Date().toISOString().split('T')[0];
    
            const formData = {
                id: id,
                name: inputs.name.value.trim(),
                phone: phoneNumber || "",
                password: inputs.password.value,
                city: inputs.city.value,
                address: inputs.address.value.trim(),
                maps: "", // ערך ריק עבור maps
                note: "",
                position: 999999, // ערך ברירת מחדל עבור position
                cart: [],
                purchases: [],
                join_date: join_date,
                code: ""
            };
    
            console.log('נתוני הטופס:', formData);

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`שגיאה בהרשמה: ${errorData.details}`);
            }

            const data = await response.json();
            console.log('תשובה מהשרת:', data);
    
            if (data.success) {
                alert('נרשמת בהצלחה!');
                this.loggedInUser = data.user;
                localStorage.setItem("loggedInUser", JSON.stringify(this.loggedInUser));
                this.updateUIForLoggedInUser();
                this.userContainer.innerHTML = '';
            } else {
                throw new Error(data.message || 'שגיאה בהרשמה');
            }
        } catch (error) {
            console.error('שגיאת הרשמה:', error);
            alert(error.message || 'שגיאה בהרשמה');
        }
    }

    async login(credentials) {
        console.log('Login form submitted');
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

            this.loggedInUser = data.user;
            localStorage.setItem("loggedInUser", JSON.stringify(this.loggedInUser));
            this.updateUIForLoggedInUser();
            return true;
        } catch (error) {
            console.error('שגיאת התחברות:', error);
            alert(error.message || 'שגיאה בהתחברות');
            return false;
        }
    }

    logout() {
        console.log('Logout button clicked');
        localStorage.removeItem("loggedInUser");
        this.loggedInUser = null;
        alert('התנתקת בהצלחה!');
        this.updateUIForLoggedOutUser();
    }

    createModal(type) {
        let modalContent = '';
        if (type === 'login') {
            modalContent = this.createLoginModal();
        } else if (type === 'register') {
            modalContent = this.createRegisterModal();
        }
        const modalContainer = document.createElement('div');
        modalContainer.classList.add('modal-container');
        modalContainer.innerHTML = modalContent;
        document.body.appendChild(modalContainer);

        // הוספת מאזיני אירועים למודלים
        this.addEventListeners();
    }

    createLoginModal() {
        return `
            <div class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>תחברות</h2>
                    <form id="loginForm">
                        <input type="tel" placeholder="מספר טלפון" required>
                        <input type="password" placeholder="סיסמה" required>
                        <button type="submit">התחברות</button>
                        <button type="button" id="forgotPasswordButton">שכחתי סיסמה</button>
                    </form>
                </div>
            </div>
        `;
    }

    createRegisterModal() {
        return `
            <div class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>הרשמה</h2>
                    <form id="registerForm">
                        <input type="text" 
                               id="nameInput"
                               name="name"
                               placeholder="שם" 
                               required
                               autocomplete="name">

                        <input type="text" 
                               id="phoneInput"
                               name="phone"
                               placeholder="פלאפון" 
                               autocomplete="tel">

                        <div class="password-container">
                            <input type="password" 
                                   id="passwordInput"
                                   name="password" 
                                   placeholder="סיסמה" 
                                   required
                                   autocomplete="new-password">
                            <i id="eyeIcon" class="fas fa-eye"></i>
                        </div>

                        <select name="city" required>
                            <option value="">בחר עיר</option>
                            <option value="עומר">עומר</option>
                            <option value="להבים">להבים</option>
                            <option value="מיתר">מיתר</option>
                            <option value="כרמים">כרמים</option>
                            <option value="באר שבע">באר שבע</option>
                            <option value="אחר">אחר</option>
                        </select>

                        <input type="text" 
                               id="addressInput"
                               name="address"
                               placeholder="כתובת" 
                               required>

                        <button type="submit">הירשם</button>
                    </form>
                </div>
            </div>
        `;
    }

    createLogoutModal() {
        return `
            <div class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>התנתקות</h2>
                    <button id="logoutButton">התנתק</button>
                </div>
            </div>
        `;
    }

    // פונקציה לטעינת Google Maps API
    loadGoogleMapsScript() {
        const script = document.createElement('script');
        script.src = "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&language=iw";
        script.async = true;
        script.defer = true;
        script.onload = () => this.initializeAutocomplete();
        document.head.appendChild(script);
    }

    // אתחול האוטוקומפליט
    initializeAutocomplete() {
        if (document.getElementById('addressInput')) {
            const addressInput = document.getElementById('addressInput');
            const autocomplete = new google.maps.places.Autocomplete(addressInput, {
                componentRestrictions: { country: "il" },
                fields: ["address_components", "formatted_address"],
                types: ["address"],
            });
        }
    }
}

// ייבוא ספריית uuid
document.addEventListener('DOMContentLoaded', () => {
    const userManager = new UserManager();
    document.body.insertAdjacentHTML('beforeend', userManager.createLogoutModal());
});

// ידיקה שה-script נטען
console.log("User script loaded");
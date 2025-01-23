// מצב התחברות
let isLoggedIn = false;
let isAdmin = false;

// אלמנטים
const guestButtons = document.querySelector('.guest-buttons');
const userButtons = document.querySelector('.user-buttons');
const adminBtn = document.querySelector('.admin-btn');

// כפתורים
const loginBtn = document.querySelector('.login-btn');
const registerBtn = document.querySelector('.register-btn');
const profileBtn = document.querySelector('.profile-btn');
const ordersBtn = document.querySelector('.orders-btn');
const logoutBtn = document.querySelector('.logout-btn');

// יצירת מודל
function createModal(title, content) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        padding-top: 100px;
        padding-bottom: 100px;
        overflow-y: auto;
        box-sizing: border-box;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        margin: 0 auto;
        position: relative;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #e53e3e;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    `;
    closeBtn.onclick = () => modalOverlay.remove();
    
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.cssText = `
        text-align: center;
        margin-bottom: 1.5rem;
        color: var(--color-text);
    `;
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(titleElement);
    modalContent.appendChild(content);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    return modalOverlay;
}

// יצירת טופס התחברות
function createLoginForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">שם משתמש / מספר טלפון:</label>
            <input type="text" id="loginUsername" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה:</label>
            <div style="position: relative;">
                <input type="password" id="loginPassword" required style="width: 100%; padding: 0.5rem 35px 0.5rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="toggle-password" style="
                    position: absolute;
                    left: 8px;
                    top: 35%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">👁️</button>
            </div>
        </div>
        <button type="submit" style="
            width: 100%;
            padding: 0.75rem;
            background: var(--color-success);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            margin-bottom: 1rem;
        ">התחבר</button>
        <button type="button" id="forgotPasswordBtn" style="
            width: 100%;
            padding: 0.75rem;
            background: transparent;
            color: var(--color-secondary);
            border: 1px solid var(--color-secondary);
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        ">שכחתי סיסמה</button>
    `;
    
    // הוספת פונקציונליות להצגת/הסתרת סיסמה
    const togglePasswordBtn = form.querySelector('.toggle-password');
    const passwordInput = form.querySelector('#loginPassword');
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });
    
    form.querySelector('#forgotPasswordBtn').addEventListener('click', () => {
        form.closest('.modal-overlay').remove();
        showForgotPasswordForm();
    });
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier, password })
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.success) {
                const user = data.user;
                console.log('User data:', user);

                // בדיקה אם המשתמש הוא אדמין
                const adminResponse = await fetch(`/api/admins/checkAdmin/${user.id}`);
                if (adminResponse.ok) {
                    const adminData = await adminResponse.json();
                    user.isAdmin = adminData.exists;
                } else {
                    user.isAdmin = false;
                }

                localStorage.setItem('user', JSON.stringify(user));
                isLoggedIn = true;
                isAdmin = user.isAdmin;
                
                console.log('Is admin:', isAdmin);
                showUserMenu();
                e.target.closest('.modal-overlay').remove();
                
                // הודעת הצלחה
                if (isAdmin) {
                    alert('ברוך הבא מנהל! נכנסת בהצלחה למערכת');
                } else {
                    alert('ברוך הבא! נכנסת בהצלחה למערכת');
                }
            } else {
                alert(data.message || 'שם משתמש או סיסמה שגויים');
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('אירעה שגיאה בהתחברות, אנא נסה שוב מאוחר יותר');
        }
    };
    
    return form;
}

// יצירת טופס שחזור סיסמה
function showForgotPasswordForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">שם משתמש:</label>
            <input type="text" id="resetUsername" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">מספר טלפון:</label>
            <input type="tel" id="resetPhone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem;">כתובת:</label>
            <input type="text" id="resetAddress" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה חדשה:</label>
            <div style="position: relative;">
                <input type="password" id="newPassword" required style="width: 100%; padding: 0.5rem 35px 0.5rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="toggle-password" style="
                    position: absolute;
                    left: 8px;
                    top: 35%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">👁️</button>
            </div>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem;">אימות סיסמה חדשה:</label>
            <div style="position: relative;">
                <input type="password" id="confirmNewPassword" required style="width: 100%; padding: 0.5rem 35px 0.5rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="toggle-password" style="
                    position: absolute;
                    left: 8px;
                    top: 35%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">👁️</button>
            </div>
        </div>
        <button type="submit" style="
            width: 100%;
            padding: 0.75rem;
            background: var(--color-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        ">עדכן סיסמה</button>
    `;
    
    // הוספת פונקציונליות להצגת/הסתרת סיסמה
    const togglePasswordBtns = form.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            btn.textContent = type === 'password' ? '👁️' : '🔒';
        });
    });
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('resetUsername').value;
        const phone = document.getElementById('resetPhone').value;
        const address = document.getElementById('resetAddress').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        if (newPassword !== confirmNewPassword) {
            alert('הסיסמאות אינן תואמות');
            return;
        }
        
        try {
            // קודם נבדוק אם המשתמש קיים
            const checkResponse = await fetch('/api/users/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: username, phone })
            });
            
            const exists = await checkResponse.json();
            
            if (exists) {
                // אם המשתמש קיים, נקבל את ה-ID שלו
                const usersResponse = await fetch('/api/users');
                const users = await usersResponse.json();
                const user = users.find(u => u.name === username && u.phone === phone);
                
                if (user) {
                    // עדכון הסיסמה עם ה-ID
                    const updateResponse = await fetch(`/api/users/${user.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...user,
                            password: newPassword
                        })
                    });
                    
                    if (updateResponse.ok) {
                        alert('הסיסמה עודכנה בהצלחה');
                        e.target.closest('.modal-overlay').remove();
                        handleLogin();
                    } else {
                        alert('אירעה שגיאה בעדכון הסיסמה');
                    }
                } else {
                    alert('לא נמצא משתמש עם הפרטים שהוזנו');
                }
            } else {
                alert('לא נמצא משתמש עם הפרטים שהוזנו');
            }
        } catch (error) {
            console.error('Error during password reset:', error);
            alert('אירעה שגיאה בעדכון הסיסמה, אנא נסה שוב מאוחר יותר');
        }
    };
    
    createModal('שחזור סיסמה', form);
}

// יצירת טופס הרשמה
function createRegisterForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <div style="margin-bottom: 1.5rem; text-align: center; color: #666; font-size: 0.9rem;">
            * כרגע משלוחים מתבצעים רק בערים: להבים, עומר, מיתר, כרמים ובאר שבע
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">שם מלא:</label>
            <input type="text" id="registerName" autocomplete="name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">מספר טלפון:</label>
            <input type="tel" id="registerPhone" autocomplete="tel" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">עיר: <span style="color: red">*</span></label>
            <select id="registerCity" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" onchange="toggleOtherCity(this)" autocomplete="address-level2">
                <option value="">בחר עיר</option>
                <option value="להבים">להבים</option>
                <option value="עומר">עומר</option>
                <option value="מיתר">מיתר</option>
                <option value="כרמים">כרמים</option>
                <option value="באר שבע">באר שבע</option>
                <option value="אחר">אחר</option>
            </select>
            <input type="text" id="otherCity" style="display: none; width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="הכנס שם עיר" autocomplete="address-level2">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">כתובת:</label>
            <input type="text" id="registerAddress" autocomplete="street-address" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">הערות:</label>
            <div id="notesContainer">
                <div class="note-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input type="text" class="note-input" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: calc(100% - 40px);">
                    <button type="button" onclick="removeNote(this)" style="padding: 0.25rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; width: 30px; min-width: 30px;">-</button>
                </div>
            </div>
            <button type="button" onclick="addNote()" style="padding: 0.25rem 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem;">+ הוסף הערה</button>
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה:</label>
            <div style="position: relative;">
                <input type="password" id="registerPassword" autocomplete="new-password" style="width: 100%; padding: 0.5rem 35px 0.5rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="toggle-password" style="
                    position: absolute;
                    left: 8px;
                    top: 35%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">👁️</button>
            </div>
            <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">אם לא תוזן סיסמה, מספר הטלפון ישמש כסיסמה</div>
        </div>
        <button type="submit" style="
            width: 100%;
            padding: 0.75rem;
            background: var(--color-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        ">הרשם</button>
    `;
    
    // הוספת פונקציונליות להצגת/הסתרת סיסמה
    const togglePasswordBtn = form.querySelector('.toggle-password');
    const passwordInput = form.querySelector('#registerPassword');
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // הוספת פונקציונליות לטיפול בהערות
    window.addNote = () => {
        const container = document.getElementById('notesContainer');
        const noteRow = document.createElement('div');
        noteRow.className = 'note-row';
        noteRow.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
        noteRow.innerHTML = `
            <input type="text" class="note-input" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: calc(100% - 40px);">
            <button type="button" onclick="removeNote(this)" style="padding: 0.25rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; width: 30px; min-width: 30px;">-</button>
        `;
        container.appendChild(noteRow);
    };

    window.removeNote = (button) => {
        button.closest('.note-row').remove();
    };

    // הוספת פונקציונליות לשדה 'עיר אחרת'
    window.toggleOtherCity = (select) => {
        const otherCityInput = document.getElementById('otherCity');
        otherCityInput.style.display = select.value === 'אחר' ? 'block' : 'none';
        otherCityInput.required = select.value === 'אחר';
    };

    // טיפול בשליחת הטופס
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const phone = document.getElementById('registerPhone').value.replace(/\D/g, '');
        const city = document.getElementById('registerCity').value;
        const otherCity = document.getElementById('otherCity').value;
        const address = document.getElementById('registerAddress').value;
        const password = document.getElementById('registerPassword').value || phone;
        
        
        // איסוף ההערות
        const notes = Array.from(document.querySelectorAll('.note-input'))
            .map(input => input.value.trim())
            .filter(note => note !== '');

        const userData = {
            name,
            phone,
            city: city === 'אחר' ? otherCity : city,
            address,
            password,
            notes
        };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                isLoggedIn = true;
                isAdmin = false;
                showUserMenu();
                e.target.closest('.modal-overlay').remove();
                alert('נרשמת בהצלחה!');
            } else {
                alert(data.message || 'שגיאה בהרשמה');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('אירעה שגיאה בהרשמה, אנא נסה שוב מאוחר יותר');
        }
    };
    
    return form;
}

// בדיקת מצב התחברות בטעינה
function checkLoginStatus() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        isLoggedIn = true;
        showUserMenu();
    } else {
        showGuestMenu();
    }
}

// הצגת תפריט אורח
function showGuestMenu() {
    guestButtons.style.display = 'flex';
    userButtons.style.display = 'none';
}

// הצגת תפריט משתמש מחובר
function showUserMenu() {
    guestButtons.style.display = 'none';
    userButtons.style.display = 'flex';
    
    // בדיקה אם המשתמש הוא אדמין
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.isAdmin) {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn && logoutBtn.parentNode) {
        const adminButton = document.createElement('button');
        adminButton.className = 'admin-btn menu-btn';
        adminButton.textContent = 'ניהול';
        adminButton.onclick = () => window.location.href = 'admin.html';
            logoutBtn.parentNode.insertBefore(adminButton, logoutBtn);
        }
    }
}

// פונקציות טיפול באירועים
function handleLogin() {
    const loginForm = createLoginForm();
    createModal('התחברות', loginForm);
}

function handleRegister() {
    const registerForm = createRegisterForm();
    createModal('הרשמה', registerForm);
}

function handleProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('לא נמצאו פרטי משתמש');
        return;
    }

    const content = document.createElement('div');
    content.innerHTML = `
        <div style="text-align: right;">
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600; color: #666;">שם:</span>
                <span style="margin-right: 0.5rem;">${user.name}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600; color: #666;">טלפון:</span>
                <span style="margin-right: 0.5rem;">${user.phone || 'לא הוזן'}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600; color: #666;">כתובת:</span>
                <span style="margin-right: 0.5rem;">${user.address || 'לא הוזנה'}</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600; color: #666;">עיר:</span>
                <span style="margin-right: 0.5rem;">${user.city || 'לא הוזנה'}</span>
            </div>
            ${user.code ? `
            <div style="margin-bottom: 1rem;">
                <span style="font-weight: 600; color: #666;">קוד:</span>
                <span style="margin-right: 0.5rem;">${user.code}</span>
            </div>
            ` : ''}
            <div style="margin-bottom: 0.8rem;">
                <span style="font-weight: 600; color: #666;">חוב:</span>
                <span style="margin-right: 0.5rem;">₪${user.debt_balance || '0'}</span>
            </div>
        </div>
        
        ${(() => {
            let notes = [];
            try {
                notes = JSON.parse(user.notes || '[]');
            } catch (e) {
                console.error('Error parsing notes:', e);
                notes = [];
            }
            
            return notes.length > 0 ? `
                <div style="margin-bottom: 1rem; text-align: right;">
                    <h3 style="color: #666; margin-bottom: 0.5rem;">הערות:</h3>
                    ${notes.map((note) => `
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem; background: #fff; padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
                            <span style="flex: 1;">${note}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '';
        })()}
        
        <button id="editProfileBtn" style="
            background: var(--color-secondary);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            font-weight: 600;
            width: 100%;
        ">ערוך פרטים</button>
    `;

    content.querySelector('#editProfileBtn').addEventListener('click', handleProfileEdit);
    createModal('פרטים אישיים', content);
}

function handleProfileEdit() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    fetch(`/api/users/${user.id}`)
        .then(response => response.json())
        .then(userData => {
            const content = document.createElement('div');
            content.innerHTML = `
                <form id="editProfileForm" style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">שם:</label>
                        <input type="text" id="editName" value="${user.name}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">טלפון:</label>
                        <input type="tel" id="editPhone" value="${user.phone || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">כתובת:</label>
                        <input type="text" id="editAddress" value="${user.address || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">עיר:</label>
                        <input type="text" id="editCity" value="${user.city || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">הערות:</label>
                        <div id="notesContainer">
                            ${JSON.parse(user.notes || '[]').map((note, index) => `
                                <div class="note-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <input type="text" class="note-input" value="${note}" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                                    <button type="button" onclick="removeNote(${index})" style="padding: 0.25rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; width: 30px;">-</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="addNote()" style="padding: 0.25rem 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem;">+ הוסף הערה</button>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">סיסמה:</label>
                        <div style="position: relative;">
                            <input type="password" id="editPassword" value="${userData.password}" style="width: 100%; padding: 0.5rem 35px 0.5rem 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <button type="button" class="toggle-password" style="
                                position: absolute;
                                left: 8px;
                                top: 35%;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                cursor: pointer;
                                padding: 0;
                                width: 24px;
                                height: 24px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">👁️</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" style="
                            flex: 1;
                            padding: 0.75rem;
                            background: var(--color-success);
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: 600;
                        ">שמור שינויים</button>
                        <button type="button" id="cancelEditBtn" style="
                            flex: 1;
                            padding: 0.75rem;
                            background: var(--color-danger);
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: 600;
                        ">בטל</button>
                    </div>
                </form>
            `;
            
            // הוספת פונקציונליות להצגת/הסתרת סיסמה וקוד
            const togglePasswordBtns = content.querySelectorAll('.toggle-password');
            togglePasswordBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = btn.parentElement.querySelector('input');
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    btn.textContent = type === 'password' ? '👁️' : '🔒';
                });
            });
            
            // טיפול בכפתור ביטול
            content.querySelector('#cancelEditBtn').addEventListener('click', () => {
                document.querySelector('.modal-overlay').remove();
                handleProfile();
            });
            
            // טיפול בשמירת השינויים
            const form = content.querySelector('#editProfileForm');
            form.onsubmit = async (e) => {
                e.preventDefault();
                const updatedUser = {
                    ...user,
                    name: document.getElementById('editName').value,
                    phone: document.getElementById('editPhone').value,
                    address: document.getElementById('editAddress').value,
                    city: document.getElementById('editCity').value,
                    password: document.getElementById('editPassword').value,
                    notes: JSON.stringify(Array.from(document.querySelectorAll('.note-input')).map(input => input.value.trim()).filter(note => note !== ''))
                };
                
                try {
                    const response = await fetch(`/api/users/${user.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedUser)
                    });
                    
                    if (response.ok) {
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        alert('הפרטים עודכנו בהצלחה');
                        document.querySelector('.modal-overlay').remove();
                        handleProfile();
                    } else {
                        alert('אירעה שגיאה בעדכון הפרטים');
                    }
                } catch (error) {
                    console.error('Error updating profile:', error);
                    alert('אירעה שגיאה בעדכון הפרטים');
                }
            };
            
            // החלפת התוכן במודל
            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = '';
            const title = document.createElement('h2');
            title.textContent = 'עריכת פרטים';
            title.style.cssText = 'text-align: center; margin-bottom: 1.5rem; color: var(--color-text);';
            modalContent.appendChild(title);
            modalContent.appendChild(content);
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            alert('אירעה שגיאה בטעינת פרטי המשתמש');
        });
}

// פונקציות לטיפול בהערות רגילות
async function addNote() {
    const note = prompt('הכנס הערה חדשה:');
    if (!note) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    const notes = JSON.parse(user.notes || '[]');
    notes.push(note);
    
    try {
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                notes: JSON.stringify(notes)
            })
        });
        
        if (response.ok) {
            localStorage.setItem('user', JSON.stringify({ ...user, notes: JSON.stringify(notes) }));
            handleProfile();
        } else {
            alert('אירעה שגיאה בהוספת ההערה');
        }
    } catch (error) {
        console.error('Error adding note:', error);
        alert('אירעה שגיאה בהוספת ההערה');
    }
}

async function removeNote(index) {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) return;
    
    const user = JSON.parse(localStorage.getItem('user'));
    const notes = JSON.parse(user.notes || '[]');
    notes.splice(index, 1);
    
    try {
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                notes: JSON.stringify(notes)
            })
        });
        
        if (response.ok) {
            localStorage.setItem('user', JSON.stringify({ ...user, notes: JSON.stringify(notes) }));
            handleProfile();
        } else {
            alert('אירעה שגיאה במחיקת ההערה');
        }
    } catch (error) {
        console.error('Error removing note:', error);
        alert('אירעה שגיאה במחיקת ההערה');
    }
}

async function handleOrders() {
    const user = JSON.parse(localStorage.getItem('user'));
    const content = document.createElement('div');
    
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        const userOrders = orders.filter(order => order.customerName === user.name);
        
        if (userOrders.length === 0) {
            content.innerHTML = `
                <div style="text-align: center;">
                    <h3 style="margin-bottom: 1rem;">ההזמנות שלי</h3>
                    <p>אין הזמנות קודמות</p>
                </div>
            `;
        } else {
            const ordersList = userOrders.map(order => `
                <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                    <p>תאריך: ${new Date(order.orderDate).toLocaleDateString('he-IL')}</p>
                    <p>סכום: ₪${order.totalAmount}</p>
                    <p>סטטוס: ${order.status}</p>
                    <div style="margin-top: 0.5rem;">
                        <strong>מוצרים:</strong>
                        <ul style="margin: 0.5rem 0;">
                            ${order.items.map(item => `
                                <li>${item.name} - כמות: ${item.quantity}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `).join('');
            
            content.innerHTML = `
                <div>
                    <h3 style="text-align: center; margin-bottom: 1rem;">ההזמנות שלי</h3>
                    ${ordersList}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        content.innerHTML = `
            <div style="text-align: center;">
                <h3 style="margin-bottom: 1rem;">ההזמנות שלי</h3>
                <p>אירעה שגיאה בטעינת ההזמנות</p>
            </div>
        `;
    }
    
    createModal('הזמנות', content);
}

function handleLogout() {
    localStorage.removeItem('user');
    isLoggedIn = false;
    isAdmin = false;
    showGuestMenu();
}

// הוספת מאזיני אירועים
loginBtn?.addEventListener('click', handleLogin);
registerBtn?.addEventListener('click', handleRegister);
profileBtn?.addEventListener('click', handleProfile);
ordersBtn?.addEventListener('click', handleOrders);
logoutBtn?.addEventListener('click', handleLogout);

// בדיקת מצב התחברות בטעינת הדף
document.addEventListener('DOMContentLoaded', checkLoginStatus);
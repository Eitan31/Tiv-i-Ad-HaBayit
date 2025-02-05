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
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 5vh;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        position: relative;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: #ef4444;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
        closeBtn.style.transform = 'scale(1.1)';
        closeBtn.style.background = '#dc2626';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.transform = 'scale(1)';
        closeBtn.style.background = '#ef4444';
    };
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
            <label style="display: block; margin-bottom: 0.5rem;">שם משתמש / טלפון:</label>
            <input type="text" id="loginUsername" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה:</label>
            <div style="position: relative;">
                <input type="password" id="loginPassword" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <i class="bi bi-eye-slash" onclick="togglePassword('loginPassword', this)" style="
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: pointer;
                    color: #666;
                "></i>
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
        ">התחבר</button>
    `;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier: username, password })
            });

            if (!response.ok) {
                throw new Error('שגיאה בהתחברות');
            }

            const data = await response.json();
            console.log('Raw server response:', data);

            if (data.success) {
                // טיפול בהערות
                let userNotes = data.user.notes;
                try {
                    if (typeof data.user.notes === 'string') {
                        // בדיקה אם זה JSON
                        JSON.parse(data.user.notes);
                        userNotes = data.user.notes;
                    } else if (Array.isArray(data.user.notes)) {
                        userNotes = JSON.stringify(data.user.notes);
                    } else if (data.user.notes) {
                        userNotes = JSON.stringify([data.user.notes]);
                    } else {
                        userNotes = '[]';
                    }
                } catch (e) {
                    console.log('Error parsing notes:', e);
                    userNotes = JSON.stringify([data.user.notes || '']);
                }

                // שמירת הסיסמה בנפרד בלוקל סטורג'
                localStorage.setItem('userPassword', password);

                const userData = {
                    ...data.user,
                    notes: userNotes,
                    isAdmin: false
                };

                // בדיקה אם המשתמש הוא מנהל
                try {
                    const adminResponse = await fetch('/api/admins');
                    const adminList = await adminResponse.json();
                    isAdmin = adminList.includes(userData.id);
                    userData.isAdmin = isAdmin;
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    isAdmin = false;
                    userData.isAdmin = false;
                }

                // שמירת המשתמש בכל המקומות הנדרשים
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('loggedInUser', JSON.stringify(userData));
                
                isLoggedIn = true;
                showUserMenu();
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.remove();
                window.location.reload();
            } else {
                alert(data.message || 'שם משתמש או סיסמה שגויים');
            }
            
        } catch (error) {
            console.error('Full login error:', error);
            alert('שם משתמש או סיסמה שגויים');
        }
    };
    
    return form;
}

// יצירת טופס הרשמה
function createRegisterForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">שם מלא:</label>
            <input type="text" id="registerName" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">טלפון:</label>
            <input type="tel" id="registerPhone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">עיר:</label>
            <input type="text" id="registerCity" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">כתובת:</label>
            <input type="text" id="registerAddress" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה:</label>
            <div style="position: relative;">
                <input type="password" id="registerPassword" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <i class="bi bi-eye-slash" onclick="togglePassword('registerPassword', this)" style="
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: pointer;
                    color: #666;
                "></i>
            </div>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem;">אימות סיסמה:</label>
            <div style="position: relative;">
                <input type="password" id="registerPasswordConfirm" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                <i class="bi bi-eye-slash" onclick="togglePassword('registerPasswordConfirm', this)" style="
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: pointer;
                    color: #666;
                "></i>
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
        ">הרשם</button>
    `;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const phone = document.getElementById('registerPhone').value;
        const city = document.getElementById('registerCity').value;
        const address = document.getElementById('registerAddress').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            alert('הסיסמאות אינן תואמות');
            return;
        }
        
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    phone,
                    city,
                    address,
                    password,
                    notes: '[]',
                    admin_notes: '[]',
                    cart: '[]',
                    purchases: '[]',
                    debt_balance: 0
                })
            });

            if (!response.ok) {
                throw new Error('שגיאה בהרשמה');
            }

            const data = await response.json();
            
            if (data.success) {
                const userData = {
                    ...data.user,
                    isAdmin: false
                };

                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('loggedInUser', JSON.stringify(userData));
                localStorage.setItem('userPassword', password);
                
                isLoggedIn = true;
                showUserMenu();
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.remove();
                window.location.reload();
            } else {
                alert(data.message || 'שגיאה בהרשמה');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('שגיאה בהרשמה');
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
        isAdmin = userData.isAdmin || false;
        showUserMenu();

        // בדיקה אם צריך לפתוח פרטים אישיים
        if (localStorage.getItem('openProfileAfterRefresh') === 'true') {
            localStorage.removeItem('openProfileAfterRefresh');
            setTimeout(() => {
                handleProfile();
            }, 100);
        }
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
    if (isAdmin) {
        adminBtn.style.display = 'block';
        adminBtn.style.background = '#000000';
        adminBtn.onclick = () => window.location.href = 'admin.html';
    } else {
        adminBtn.style.display = 'none';
    }
    // עדכון צבע כפתור הזמנות לסגול
    ordersBtn.style.background = '#8B5CF6';
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
    const content = document.createElement('div');
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('Current user data:', user);
    let isEditing = false;

    function createProfileContent() {
        const savedPassword = localStorage.getItem('userPassword');
        
        let userNotes = [];
        try {
            if (typeof user.notes === 'string') {
                userNotes = JSON.parse(user.notes);
            } else if (Array.isArray(user.notes)) {
                userNotes = user.notes;
            } else if (user.notes) {
                userNotes = [user.notes];
            }
        } catch (e) {
            console.log('Error parsing notes:', e);
            userNotes = user.notes ? [user.notes] : [];
        }

        if (!isEditing) {
            const notesDisplay = userNotes && userNotes.length > 0 
                ? userNotes.map(note => `
                    <div style="
                        background: #f8fafc;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 8px;
                        border-right: 4px solid #3b82f6;
                        transition: all 0.2s ease;
                    "
                    onmouseover="this.style.transform='translateX(-5px)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'"
                    onmouseout="this.style.transform='translateX(0)';this.style.boxShadow='none'">
                        <i class="bi bi-chat-right-text" style="color: #3b82f6; margin-left: 8px;"></i>
                        ${note}
                    </div>
                `).join('')
                : '<div style="color: #94a3b8; text-align: center; padding: 20px;">אין הערות</div>';

            return `
                <div style="text-align: right;">
                    <div class="profile-container" style="
                        background: white;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    ">
                        <div style="
                            background: linear-gradient(135deg, #3b82f6, #2563eb);
                            padding: 20px 15px;
                            color: white;
                            text-align: center;
                            position: relative;
                        ">
                            <div style="
                                width: 60px;
                                height: 60px;
                                background: white;
                                border-radius: 50%;
                                margin: 0 auto 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            ">
                                <i class="bi bi-person" style="font-size: 2rem; color: #3b82f6;"></i>
                            </div>
                            <h2 style="margin: 0; font-size: 1.3rem;">${user.name || 'לא צוין'}</h2>
                        </div>
                        
                        <div style="padding: 15px;">
                            <div style="
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 10px;
                                margin-bottom: 15px;
                            ">
                                <div style="
                                    background: #f8fafc;
                                    padding: 12px;
                                    border-radius: 10px;
                                    text-align: center;
                                ">
                                    <i class="bi bi-telephone" style="color: #3b82f6; font-size: 1.1rem;"></i>
                                    <p style="margin: 3px 0 0; color: #64748b; font-size: 0.9rem;">טלפון</p>
                                    <strong style="color: #1e293b; font-size: 0.95rem;">${user.phone || 'לא צוין'}</strong>
                                </div>
                                <div style="
                                    background: #f8fafc;
                                    padding: 12px;
                                    border-radius: 10px;
                                    text-align: center;
                                ">
                                    <i class="bi bi-cash" style="color: #3b82f6; font-size: 1.1rem;"></i>
                                    <p style="margin: 3px 0 0; color: #64748b; font-size: 0.9rem;">חוב</p>
                                    <strong style="color: #1e293b; font-size: 0.95rem;">${user.debt || '0'} ₪</strong>
                                </div>
                            </div>
                            
                            <div style="
                                background: #f8fafc;
                                padding: 12px;
                                border-radius: 10px;
                                margin-bottom: 10px;
                            ">
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <i class="bi bi-geo-alt" style="color: #3b82f6; font-size: 1.1rem; margin-left: 6px;"></i>
                                    <strong style="color: #1e293b; font-size: 0.95rem;">כתובת</strong>
                                </div>
                                <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                                    ${user.city ? user.city + ', ' : ''}${user.address || 'לא צוין'}
                                </p>
                            </div>
                            
                            <div style="
                                background: #f8fafc;
                                padding: 15px;
                                border-radius: 12px;
                                margin-bottom: 15px;
                            ">
                                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                    <i class="bi bi-sticky" style="color: #3b82f6; font-size: 1.2rem; margin-left: 8px;"></i>
                                    <strong style="color: #1e293b;">הערות</strong>
                                </div>
                                ${notesDisplay}
                            </div>

                            <button onclick="toggleEdit()" style="
                                width: 100%;
                                padding: 10px;
                                background: linear-gradient(135deg, #3b82f6, #2563eb);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                font-size: 0.9rem;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 6px;
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"
                            onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                                <i class="bi bi-pencil"></i>
                                ערוך פרטים
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <form id="editProfileForm" style="text-align: right;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">שם מלא:</label>
                        <input type="text" name="name" value="${user.name || ''}" required style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 1rem;
                        ">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">טלפון:</label>
                        <input type="tel" name="phone" value="${user.phone || ''}" required style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 1rem;
                        ">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">עיר:</label>
                        <input type="text" name="city" value="${user.city || ''}" required style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 1rem;
                        ">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">כתובת:</label>
                        <input type="text" name="address" value="${user.address || ''}" required style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            font-size: 1rem;
                        ">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">סיסמה נוכחית:</label>
                        <div style="position: relative;">
                            <input type="password" name="currentPassword" value="${savedPassword}" required style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 1rem;
                            ">
                            <i class="bi bi-eye-slash" onclick="togglePassword('currentPassword', this)" style="
                                position: absolute;
                                left: 10px;
                                top: 50%;
                                transform: translateY(-50%);
                                cursor: pointer;
                                color: #64748b;
                            "></i>
                        </div>
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">סיסמה חדשה (אופציונלי):</label>
                        <div style="position: relative;">
                            <input type="password" name="newPassword" style="
                                width: 100%;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 1rem;
                            ">
                            <i class="bi bi-eye-slash" onclick="togglePassword('newPassword', this)" style="
                                position: absolute;
                                left: 10px;
                                top: 50%;
                                transform: translateY(-50%);
                                cursor: pointer;
                                color: #64748b;
                            "></i>
                        </div>
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">הערות:</label>
                        <div id="notesContainer" style="
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 12px;
                        ">
                            ${userNotes.map((note, index) => `
                                <div class="note-item" style="
                                    display: flex;
                                    gap: 8px;
                                    margin-bottom: 8px;
                                    align-items: flex-start;
                                ">
                                    <textarea name="note-${index}" style="
                                        flex: 1;
                                        padding: 8px;
                                        border: 1px solid #e2e8f0;
                                        border-radius: 6px;
                                        min-height: 60px;
                                        resize: vertical;
                                        font-size: 0.9rem;
                                    ">${note}</textarea>
                                    <button type="button" onclick="removeNote(${index})" style="
                                        background: #ef4444;
                                        color: white;
                                        border: none;
                                        width: 32px;
                                        height: 32px;
                                        border-radius: 6px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    "
                                    onmouseover="this.style.transform='scale(1.1)';this.style.background='#dc2626'"
                                    onmouseout="this.style.transform='scale(1)';this.style.background='#ef4444'">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="addNote()" style="
                            margin-top: 8px;
                            background: linear-gradient(135deg, #3b82f6, #2563eb);
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
                        onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
                            <i class="bi bi-plus-circle"></i>
                            הוסף הערה
                        </button>
                    </div>
                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 1.5rem;
                    ">
                        <button type="submit" style="
                            flex: 1;
                            padding: 12px;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                            שמור שינויים
                        </button>
                        <button type="button" onclick="toggleEdit()" style="
                            padding: 12px 24px;
                            background: #ef4444;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                            ביטול
                        </button>
                    </div>
                </form>
            `;
        }
    }

    content.innerHTML = createProfileContent();
    const modal = createModal('פרטים אישיים', content);

    // פונקציה להחלפה בין מצב תצוגה לעריכה
    window.toggleEdit = function() {
        isEditing = !isEditing;
        content.innerHTML = createProfileContent();

        if (isEditing) {
            const form = document.getElementById('editProfileForm');
            const savedPassword = localStorage.getItem('userPassword');
            
            // פונקציות לטיפול בהערות
            window.addNote = function() {
                const notesContainer = document.getElementById('notesContainer');
                const noteItems = notesContainer.querySelectorAll('.note-item');
                const newIndex = noteItems.length;
                
                const newNoteDiv = document.createElement('div');
                newNoteDiv.className = 'note-item';
                newNoteDiv.style.cssText = `
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                    align-items: flex-start;
                `;
                
                newNoteDiv.innerHTML = `
                    <textarea name="note-${newIndex}" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        min-height: 60px;
                        resize: vertical;
                        font-size: 0.9rem;
                    "></textarea>
                    <button type="button" onclick="removeNote(${newIndex})" style="
                        background: #ef4444;
                        color: white;
                        border: none;
                        width: 32px;
                        height: 32px;
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    "
                    onmouseover="this.style.transform='scale(1.1)';this.style.background='#dc2626'"
                    onmouseout="this.style.transform='scale(1)';this.style.background='#ef4444'">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                
                notesContainer.appendChild(newNoteDiv);
            };

            window.removeNote = function(index) {
                const noteElement = document.querySelector(`[name="note-${index}"]`).closest('.note-item');
                noteElement.remove();
                
                // עדכון אינדקסים
                const notesContainer = document.getElementById('notesContainer');
                const noteItems = notesContainer.querySelectorAll('.note-item');
                noteItems.forEach((item, i) => {
                    const textarea = item.querySelector('textarea');
                    const button = item.querySelector('button');
                    textarea.name = `note-${i}`;
                    button.setAttribute('onclick', `removeNote(${i})`);
                });
            };

            form.onsubmit = async function(e) {
                e.preventDefault();
                const formData = new FormData(form);
                
                try {
                    // בדיקת הסיסמה הנוכחית
                    if (formData.get('currentPassword') !== savedPassword) {
                        alert('הסיסמה הנוכחית שגויה');
                        return;
                    }

                    // איסוף ההערות
                    const notes = [];
                    const noteInputs = form.querySelectorAll('[name^="note-"]');
                    noteInputs.forEach(input => {
                        if (input.value.trim()) {
                            notes.push(input.value.trim());
                        }
                    });

                    // הכנת האובייקט לשליחה
                    const updateData = {
                        name: formData.get('name'),
                        phone: formData.get('phone'),
                        city: formData.get('city'),
                        address: formData.get('address'),
                        notes: JSON.stringify(notes),
                        admin_notes: user.admin_notes || '[]',
                        cart: user.cart || '[]',
                        purchases: user.purchases || '[]',
                        debt_balance: user.debt_balance || 0
                    };

                    // הוספת סיסמה חדשה רק אם הוזנה
                    if (formData.get('newPassword')) {
                        updateData.password = formData.get('newPassword');
                    }

                    console.log('Sending update data:', updateData);

                    const response = await fetch(`/api/users/${user.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updateData)
                    });

                    const responseData = await response.json();
                    console.log('Server response:', responseData);

                    if (!response.ok) {
                        throw new Error(responseData.message || 'שגיאה בעדכון הפרטים');
                    }

                    // עדכון נתוני המשתמש בלוקל סטורג'
                    const updatedUser = {
                        ...user,
                        ...updateData,
                        isAdmin: user.isAdmin
                    };

                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
                    
                    if (formData.get('newPassword')) {
                        localStorage.setItem('userPassword', formData.get('newPassword'));
                    }

                    // עדכון פקודה לפתיחת פרטים אישיים אחרי הרענון
                    localStorage.setItem('openProfileAfterRefresh', 'true');

                    isEditing = false;
                    content.innerHTML = createProfileContent();
                    alert('הפרטים עודכנו בהצלחה');
                    window.location.reload();
                } catch (error) {
                    console.error('Update error:', error);
                    alert(error.message || 'שגיאה בעדכון הפרטים');
                }
            };
        }
    };
}

async function handleOrders() {
    const user = JSON.parse(localStorage.getItem('user')) || 
                JSON.parse(localStorage.getItem('currentUser')) || 
                JSON.parse(localStorage.getItem('loggedInUser'));

    if (!user || !user.id) {
        alert('נא להתחבר תחילה');
        return;
    }

    let purchases = [];
    try {
        const response = await fetch(`/api/users/${user.id}`);
        if (!response.ok) throw new Error('שגיאה בטעינת פרטי משתמש');
        const userData = await response.json();
        
        if (userData.purchases) {
            purchases = typeof userData.purchases === 'string' ? 
                JSON.parse(userData.purchases) : 
                userData.purchases;
        }
        console.log('פרטי הרכישות:', purchases);
    } catch (error) {
        console.error('שגיאה בטעינת היסטוריית הזמנות:', error);
    }

    const content = document.createElement('div');
    content.innerHTML = `
        <div style="text-align: right;">
            ${purchases.length > 0 ? `
                <div class="orders-list" style="max-height: 70vh; overflow-y: auto; padding-left: 10px;">
                    ${purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map(order => {
                        const parsedItems = typeof order.items === 'string' ? 
                            JSON.parse(order.items) : order.items;
                        return `
                        <div class="order-card" style="
                            border: 1px solid #e2e8f0;
                            border-radius: 16px;
                            margin-bottom: 20px;
                            background: white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.03);
                            transition: all 0.3s ease;
                            overflow: hidden;
                        "
                        onmouseover="this.style.transform='translateY(-5px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)'"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.03)'">
                            <div style="
                                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                                padding: 16px;
                                border-bottom: 1px solid #e2e8f0;
                            ">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 10px;
                                ">
                                    <div style="display: flex; align-items: center;">
                                        <i class="bi bi-calendar3" style="color: #64748b; margin-left: 8px;"></i>
                                        <span style="color: #64748b;">${new Date(order.date).toLocaleDateString('he-IL')}</span>
                                    </div>
                                    <span style="
                                        padding: 6px 12px;
                                        border-radius: 20px;
                                        font-size: 0.85rem;
                                        ${order.status === 'אושרה' ? 
                                            'background: linear-gradient(135deg, #86efac, #4ade80); color: white;' : 
                                            'background: linear-gradient(135deg, #fca5a5, #f87171); color: white;'
                                        }
                                    ">
                                        <i class="bi ${order.status === 'אושרה' ? 'bi-check-circle' : 'bi-clock'}" style="margin-left: 4px;"></i>
                                        ${order.status === 'אושרה' ? 'אושרה' : 'בטיפול'}
                                    </span>
                                </div>
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                ">
                                    <span style="color: #64748b;">מספר פריטים: ${parsedItems.length}</span>
                                    <span style="
                                        font-weight: bold;
                                        color: #1e293b;
                                        font-size: 1.1rem;
                                    ">₪${order.total}</span>
                                </div>
                            </div>
                            
                            <div style="padding: 16px;">
                                <div style="
                                    display: grid;
                                    gap: 12px;
                                ">
                                    ${parsedItems.map(item => `
                                        <div style="
                                            background: #f8fafc;
                                            border-radius: 12px;
                                            padding: 12px;
                                            display: grid;
                                            grid-template-columns: 1fr auto;
                                            gap: 12px;
                                            align-items: center;
                                        ">
                                            <div>
                                                <div style="
                                                    font-weight: 500;
                                                    color: #1e293b;
                                                    margin-bottom: 4px;
                                                ">${item.name}</div>
                                                <div style="
                                                    color: #64748b;
                                                    font-size: 0.9rem;
                                                ">${item.description || 'אין תיאור'} | ${item.volume || 'N/A'}</div>
                                                <div style="
                                                    color: #64748b;
                                                    font-size: 0.9rem;
                                                    margin-top: 4px;
                                                ">
                                                    <span style="color: #3b82f6;">×${item.quantity}</span>
                                                </div>
                                            </div>
                                            <div style="
                                                font-weight: 500;
                                                color: #1e293b;
                                                text-align: left;
                                            ">₪${item.price * item.quantity}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div style="
                                    margin-top: 16px;
                                    padding-top: 16px;
                                    border-top: 1px solid #e2e8f0;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                ">
                                    <button onclick="duplicateOrder(${JSON.stringify(parsedItems).replace(/"/g, '&quot;')})" style="
                                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                                        color: white;
                                        border: none;
                                        padding: 8px 16px;
                                        border-radius: 8px;
                                        cursor: pointer;
                                        font-size: 0.9rem;
                                        transition: all 0.2s;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                    "
                                    onmouseover="this.style.transform='scale(1.05)'"
                                    onmouseout="this.style.transform='scale(1)'">
                                        <i class="bi bi-plus-circle"></i>
                                        שכפל הזמנה
                                    </button>
                                    <div style="text-align: left;">
                                        <div style="color: #64748b; font-size: 0.9rem;">סה"כ</div>
                                        <div style="
                                            font-weight: bold;
                                            color: #1e293b;
                                            font-size: 1.2rem;
                                        ">₪${order.total}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            ` : `
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    background: #f8fafc;
                    border-radius: 16px;
                    color: #94a3b8;
                ">
                    <i class="bi bi-bag-x" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i>
                    <p style="margin: 0;">אין הזמנות קודמות</p>
                </div>
            `}
        </div>
    `;

    createModal('ההזמנות שלי', content);
}

function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userPassword');
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

// פונקציה להחלפת מצב הצגת הסיסמה
window.togglePassword = function(inputName, icon) {
    const input = document.querySelector(`[name="${inputName}"], #${inputName}`);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    }
}; 
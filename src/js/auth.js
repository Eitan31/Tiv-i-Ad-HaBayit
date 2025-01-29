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
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        margin: 20vh auto 0;
        position: relative;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
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
            const response = await fetch('http://localhost:3000/api/users/login', {
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
                    const adminResponse = await fetch('http://localhost:3000/api/admins');
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
                e.target.closest('.modal-overlay').remove();
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
            <label style="display: block; margin-bottom: 0.5rem;">אימייל:</label>
            <input type="email" id="registerEmail" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
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
    
    form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            alert('הסיסמאות אינן תואמות');
            return;
        }
        
        // כאן תהיה השמירה בשרת
        const userData = {
            name,
            email,
            isAdmin: false
        };
        localStorage.setItem('user', JSON.stringify(userData));
        isLoggedIn = true;
        isAdmin = false;
        showUserMenu();
        e.target.closest('.modal-overlay').remove();
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
        const formattedDate = user.joinDate ? new Date(user.joinDate).toLocaleDateString('he-IL') : 'לא צוין';
        const savedPassword = localStorage.getItem('userPassword');
        
        // המרת הערות למערך
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

        // יצירת תצוגת ההערות
        const notesDisplay = userNotes && userNotes.length > 0 
            ? userNotes.map(note => `<div style="margin-bottom: 8px;">• ${note}</div>`).join('')
            : '<div>אין הערות</div>';

        // יצירת עורך ההערות
        const notesEditor = userNotes.map((note, index) => `
            <div class="note-item" style="display: flex; gap: 10px; margin-bottom: 8px;">
                <input type="text" name="note-${index}" value="${note}" style="flex: 1; min-width: 0; padding: 8px;">
                <button type="button" onclick="removeNote(${index})" style="
                    background: var(--color-danger);
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8em;
                    width: 50px;
                ">הסר</button>
            </div>
        `).join('');

        return `
            <div style="text-align: right; padding: 20px;">
                <div id="profileData" style="${isEditing ? 'display: none' : ''}">
                    <p><strong>שם:</strong> ${user.name || 'לא צוין'}</p>
                    <p><strong>טלפון:</strong> ${user.phone || 'לא צוין'}</p>
                    <p><strong>עיר:</strong> ${user.city || 'לא צוין'}</p>
                    <p><strong>כתובת:</strong> ${user.address || 'לא צוין'}</p>
                    <p><strong>חוב:</strong> ${user.debt || '0'} ₪</p>
                    <div style="margin-top: 1rem;">
                        <strong>הערות:</strong>
                        <div style="margin-top: 0.5rem; margin-right: 1rem;">
                            ${notesDisplay}
                        </div>
                    </div>
                    <div style="display: flex; margin-top: 1rem;">
                        <button onclick="toggleEdit()" style="
                            background: var(--color-primary);
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">עריכת פרטים</button>
                    </div>
                </div>
                <div id="editForm" style="${!isEditing ? 'display: none' : ''}">
                    <h3 style="margin-bottom: 1.5rem; text-align: center;">עריכת פרטים</h3>
                    <form id="profileEditForm">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">שם:</label>
                            <input type="text" name="name" value="${user.name || ''}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">טלפון:</label>
                            <input type="tel" name="phone" value="${user.phone || ''}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">עיר:</label>
                            <input type="text" name="city" value="${user.city || ''}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">כתובת:</label>
                            <input type="text" name="address" value="${user.address || ''}" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">סיסמה נוכחית:</label>
                            <div style="position: relative;">
                                <input type="password" name="currentPassword" value="${localStorage.getItem('userPassword')}" required style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                                <i class="bi bi-eye-slash" onclick="togglePassword('currentPassword', this)" style="
                                    position: absolute;
                                    left: 10px;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    cursor: pointer;
                                    color: #666;
                                "></i>
                            </div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">סיסמה חדשה (אופציונלי):</label>
                            <div style="position: relative;">
                                <input type="password" name="newPassword" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px;">
                                <i class="bi bi-eye-slash" onclick="togglePassword('newPassword', this)" style="
                                    position: absolute;
                                    left: 10px;
                                    top: 50%;
                                    transform: translateY(-50%);
                                    cursor: pointer;
                                    color: #666;
                                "></i>
                            </div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">הערות:</label>
                            <div id="notes-container" style="margin-top: 8px;">
                                ${notesEditor}
                            </div>
                            <button type="button" onclick="addNote()" style="
                                background: var(--color-success);
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                margin-top: 8px;
                            ">הוסף הערה</button>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.5rem;">
                            <button type="submit" style="
                                background: var(--color-success);
                                color: white;
                                border: none;
                                padding: 8px 24px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: bold;
                            ">שמור שינויים</button>
                            <button type="button" onclick="toggleEdit()" style="
                                background: var(--color-danger);
                                color: white;
                                border: none;
                                padding: 8px 24px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-weight: bold;
                            ">ביטול</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    content.innerHTML = createProfileContent();
    const modal = createModal('פרטים אישיים', content);

    // הוספת סטיילינג לחלונית
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.cssText += `
        max-width: 500px;
        margin: 0 auto;
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        max-height: calc(100vh - 100px);
        overflow-y: auto;
    `;

    // עיצוב כפתור סגירה
    const closeBtn = modal.querySelector('.modal-content > button');
    closeBtn.style.cssText += `
        background: var(--color-danger);
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        top: 10px;
        right: 10px;
        position: sticky;
        cursor: pointer;
        z-index: 1000;
    `;

    // פונקציית החלפה בין מצב תצוגה לעריכה
    window.toggleEdit = function() {
        isEditing = !isEditing;
        content.innerHTML = createProfileContent();
        if (!isEditing) {
            modal.remove();
        }
    };

    // פונקציה להוספת הערה חדשה
    window.addNote = function() {
        const notesContainer = document.getElementById('notes-container');
        const newIndex = notesContainer.children.length;
        const newNoteDiv = document.createElement('div');
        newNoteDiv.className = 'note-item';
        newNoteDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px;';
        newNoteDiv.innerHTML = `
            <input type="text" name="note-${newIndex}" style="flex: 1; min-width: 0; padding: 8px;">
            <button type="button" onclick="removeNote(${newIndex})" style="
                background: var(--color-danger);
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                width: 50px;
            ">הסר</button>
        `;
        notesContainer.appendChild(newNoteDiv);
    };

    // פונקציה להסרת הערה
    window.removeNote = function(index) {
        const noteElement = document.querySelector(`[name="note-${index}"]`).parentElement;
        noteElement.remove();
        // עדכון האינדקסים של שאר ההערות
        const notesContainer = document.getElementById('notes-container');
        Array.from(notesContainer.children).forEach((noteDiv, i) => {
            const input = noteDiv.querySelector('input');
            const button = noteDiv.querySelector('button');
            input.name = `note-${i}`;
            button.setAttribute('onclick', `removeNote(${i})`);
        });
    };

    // טיפול בשמירת השינויים בפרופיל
    modal.addEventListener('submit', async function(e) {
        if (e.target.id === 'profileEditForm') {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // איסוף כל ההערות
            const notes = [];
            const notesInputs = e.target.querySelectorAll('[name^="note-"]');
            notesInputs.forEach(input => {
                if (input.value.trim()) {
                    notes.push(input.value.trim());
                }
            });

            const updatedUser = {
                ...user,
                name: formData.get('name'),
                phone: formData.get('phone'),
                city: formData.get('city'),
                address: formData.get('address'),
                notes: notes,
                password: formData.get('currentPassword'),
                newPassword: formData.get('newPassword') || undefined
            };

            try {
                const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedUser)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'שגיאה בעדכון הפרטים');
                }

                const data = await response.json();
                console.log('Update response:', data);
                
                // עדכון נתוני המשתמש בלוקל סטורג'
                const newUserData = {
                    ...data,
                    joinDate: data.joinDate,
                    notes: data.notes,
                    debt: data.debt_balance || 0,
                    isAdmin: user.isAdmin,
                    password: formData.get('newPassword') || user.password
                };
                
                localStorage.setItem('user', JSON.stringify(newUserData));
                localStorage.setItem('currentUser', JSON.stringify(newUserData));
                localStorage.setItem('loggedInUser', JSON.stringify(newUserData));
                modal.remove();
                alert('הפרטים עודכנו בהצלחה');
            } catch (error) {
                console.error('Update error:', error);
                alert(error.message || 'שגיאה בעדכון הפרטים');
            }
        }
    });
}

function handleOrders() {
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="text-align: center;">
            <h3 style="margin-bottom: 1rem;">ההזמנות שלי</h3>
            <p>אין הזמנות קודמות</p>
            <button onclick="closeModal()" style="
                background: #8B5CF6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 1rem;
            ">סגור</button>
        </div>
    `;
    const modal = createModal('הזמנות', content);

    // הוספת סטיילינג לחלונית
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.cssText += `
        max-width: 500px;
        margin: 2vh auto;
    `;

    // עיצוב כפתור סגירה
    const closeBtn = modal.querySelector('.modal-content > button');
    closeBtn.style.cssText += `
        background: #8B5CF6;
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        top: 10px;
        right: 10px;
        position: absolute;
        cursor: pointer;
    `;

    // פונקציה לסגירת המודל
    window.closeModal = function() {
        modal.remove();
    };
}

function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loggedInUser');
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
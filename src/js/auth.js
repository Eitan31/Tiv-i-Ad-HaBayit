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
        margin: 0 auto;
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
            <label style="display: block; margin-bottom: 0.5rem;">אימייל:</label>
            <input type="email" id="loginEmail" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem;">סיסמה:</label>
            <input type="password" id="loginPassword" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
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
    
    form.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // כאן תהיה הבדיקה מול השרת
        // לצורך הדוגמה נשתמש בערכים קבועים
        if (email === 'admin@example.com' && password === 'admin123') {
            const userData = {
                email,
                name: 'מנהל',
                isAdmin: true
            };
            localStorage.setItem('user', JSON.stringify(userData));
            isLoggedIn = true;
            isAdmin = true;
            showUserMenu();
            e.target.closest('.modal-overlay').remove();
        } else if (email === 'user@example.com' && password === 'user123') {
            const userData = {
                email,
                name: 'משתמש',
                isAdmin: false
            };
            localStorage.setItem('user', JSON.stringify(userData));
            isLoggedIn = true;
            isAdmin = false;
            showUserMenu();
            e.target.closest('.modal-overlay').remove();
        } else {
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
            <input type="password" id="registerPassword" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem;">אימות סיסמה:</label>
            <input type="password" id="registerPasswordConfirm" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
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
    adminBtn.style.display = isAdmin ? 'block' : 'none';
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
    content.innerHTML = `
        <div style="text-align: center;">
            <h3 style="margin-bottom: 1rem;">פרטי המשתמש</h3>
            <p>שם: ${user.name}</p>
            <p>אימייל: ${user.email}</p>
            <p>סוג משתמש: ${user.isAdmin ? 'מנהל' : 'משתמש רגיל'}</p>
        </div>
    `;
    createModal('פרטים אישיים', content);
}

function handleOrders() {
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="text-align: center;">
            <h3 style="margin-bottom: 1rem;">ההזמנות שלי</h3>
            <p>אין הזמנות קודמות</p>
        </div>
    `;
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
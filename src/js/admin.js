// קבועים למערכת
const CONFIG = {
    PRODUCT: {
        DEFAULT_IMAGE: '/images/default-product.png'
    },
    USERS: {
        CITIES: ['להבים', 'עומר', 'מיתר', 'כרמים', 'באר שבע']
    },
    VIEWS: {
        USERS: 'users',
        PRODUCTS: 'products',
        ORDERS: 'orders'
    }
};

// פונקציות להצגת הודעות
const showSuccessMessage = (message) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
};

const showErrorMessage = (message) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
};

// מטמון משתמשים
const UsersCache = {
    data: null,
    lastFetch: null,
    expirationTime: 5 * 60 * 1000, // 5 דקות
    
    async get() {
        const now = Date.now();
        if (this.data && this.lastFetch && (now - this.lastFetch < this.expirationTime)) {
            return this.data;
        }
        
        try {
            const response = await fetch('/api/users');
            this.data = await response.json();
            this.lastFetch = now;
            return this.data;
        } catch (error) {
            console.error('שגיאה בטעינת משתמשים:', error);
            throw error;
        }
    },
    
    clear() {
        this.data = null;
        this.lastFetch = null;
    }
};

// פונקציות עזר למשתמשים
const UsersHelpers = {
    formatPhone(phone) {
        if (!phone) return 'לא צוין';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
        }
        return phone;
    },

    filterUsers(users, { cityFilter, showOnlyNew }) {
        return users.filter(user => {
            if (showOnlyNew && !this.isNewUser(user)) return false;
            if (cityFilter === 'all') return true;
            if (cityFilter === 'אחר') return !CONFIG.USERS.CITIES.includes(user.city);
            return user.city === cityFilter;
        });
    },

    groupUsersByCity(users) {
        const cities = [...CONFIG.USERS.CITIES, 'אחר'];
        const usersByCity = Object.fromEntries(cities.map(city => [city, []]));
        
        users.forEach(user => {
            const targetCity = CONFIG.USERS.CITIES.includes(user.city) ? user.city : 'אחר';
            usersByCity[targetCity].push(user);
        });
        
        return usersByCity;
    },

    isNewUser(user) {
        if (!user || !user.joinDate) return false;
        const joinDate = new Date(user.joinDate);
        const now = new Date();
        const diffTime = Math.abs(now - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }
};

// פונקציה לבדיקה אם המשתמש הנוכחי הוא מנהל
async function isCurrentUserAdmin() {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return false;

    try {
        // בדיקה מול השרת אם המשתמש הוא מנהל
        const response = await fetch(`/api/users/${currentUserId}`);
        if (!response.ok) return false;
        
        const user = await response.json();
        return user.is_admin === 1 || user.is_admin === true;
    } catch (error) {
        console.error('שגיאה בבדיקת הרשאות מנהל:', error);
        return false;
    }
}

// פונקציות עזר גלובליות
function renderUserNotes(user) {
    let notesHtml = '';

    // המרת notes למערך אם הוא מגיע כמחרוזת JSON
    let userNotes = [];
    try {
        userNotes = typeof user.notes === 'string' ? JSON.parse(user.notes) : (user.notes || []);
    } catch (e) {
        userNotes = [];
    }

    // המרת admin_notes למערך אם הוא מגיע כמחרוזת JSON
    let adminNotes = [];
    try {
        adminNotes = typeof user.admin_notes === 'string' ? JSON.parse(user.admin_notes) : (user.admin_notes || []);
    } catch (e) {
        adminNotes = [];
    }

    // רינדור הערות רגילות
    if (userNotes.length > 0) {
        notesHtml += `
            <div class="user-notes">
                <ul style="list-style-type: none; padding: 0; margin: 0;">
                    ${userNotes.map(note => `
                        <li style="padding: 4px 8px; background-color: #f3f4f6; margin-bottom: 4px; border-radius: 4px;">
                            ${note}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // רינדור הערות מנהל רק אם יש הערות ויש תוכן בהערות
    if (adminNotes.length > 0 && adminNotes.some(note => note.trim() !== '')) {
        notesHtml += `
            <div class="admin-notes" style="margin-top: ${userNotes.length > 0 ? '8px' : '0'};">
                ${adminNotes
                    .filter(note => note.trim() !== '')
                    .map(note => `
                        <div class="admin-note" style="
                            font-size: 0.75em;
                            background-color: #fef9c3;
                            padding: 4px 6px;
                            border-radius: 4px;
                            border: 1px solid #f59e0b;
                            margin-top: 4px;
                            margin-bottom: 2px;
                            line-height: 1.2;
                        ">
                            ${note}
                        </div>
                    `).join('')}
            </div>
        `;
    }

    return notesHtml;
}

function renderUserActions(user) {
    return `
        <div class="user-actions">
            <button onclick="editUser('${user.id}')" class="edit-button">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteUser('${user.id}')" class="delete-button">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// פונקציה לרינדור משתמש
function renderUser(user) {
    // המרת admin_notes למערך אם הוא מגיע כמחרוזת JSON
    let adminNotes = [];
    try {
        adminNotes = typeof user.admin_notes === 'string' ? JSON.parse(user.admin_notes) : (user.admin_notes || []);
        if (!Array.isArray(adminNotes)) adminNotes = [];
    } catch (e) {
        console.warn('שגיאה בפענוח הערות מנהל:', e);
        adminNotes = [];
    }

    const hasAdminNotes = adminNotes.length > 0;
    const isAdmin = isCurrentUserAdmin();

    const userHeader = `
        <div class="user-header">
            <h3>${user.name}</h3>
            ${user.position ? `<span class="user-position-circle">${user.position}</span>` : ''}
            ${user.debt_balance > 0 ? `<span class="user-debt" style="color: #ffffff; font-weight: bold; background-color: #9333ea; padding: 4px 8px; border-radius: 4px; display: inline-block;">${user.debt_balance}₪</span>` : ''}
            ${ADMIN_IDS.includes(user.id) ? `
                <div class="admin-badge" style="position: absolute; top: -15px; left: 5px; background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-weight: bold; display: flex; align-items: center; gap: 4px; pointer-events: none; user-select: none;">
                    <i class="fas fa-crown"></i> מנהל
                </div>
            ` : ''}
        </div>
    `;

    const userDetails = `
        <div class="user-details">
            <p><i class="fas fa-phone"></i> ${UsersHelpers.formatPhone(user.phone)}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${user.address}</p>
            <p><i class="fas fa-city"></i> ${user.city || 'לא צוין'}</p>
        </div>
    `;

    const locationLinks = `
        <div class="location-links" style="display: flex; gap: 10px; margin-top: 10px;">
            ${user.maps ? `<a href="${user.maps}" target="_blank" class="location-link" style="display: flex; align-items: center; gap: 5px; text-decoration: none; color: white; background: #10b981; padding: 4px 8px; border-radius: 4px; z-index: 1;"><i class="fas fa-map"></i> Google Maps</a>` : ''}
            ${user.waze ? `<a href="${user.waze}" target="_blank" class="location-link" style="display: flex; align-items: center; gap: 5px; text-decoration: none; color: white; background: #3b82f6; padding: 4px 8px; border-radius: 4px; z-index: 1;"><i class="fas fa-location-arrow"></i> Waze</a>` : ''}
        </div>
    `;
    
    const userNotes = renderUserNotes(user);

    const userActions = `
        <div class="user-actions">
            <button onclick="editUser('${user.id}')" class="edit-button">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteUser('${user.id}')" class="delete-button">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return `
        <div class="user-card" style="position: relative; border: 2px solid ${ADMIN_IDS.includes(user.id) ? '#93c5fd' : hasAdminNotes && isAdmin ? '#fcd34d' : UsersHelpers.isNewUser(user) ? '#fcd34d' : 'transparent'}; border-radius: 8px; padding: 16px;">
            <div class="card-content" style="position: relative; z-index: 1;">
                ${userHeader}
                ${userDetails}
                ${locationLinks}
                ${userNotes}
                ${userActions}
            </div>
        </div>
    `;
}

// פונקציה לטעינת משתמשים
async function loadUsers(cityFilter = 'all', showOnlyNew = false) {
    try {
        isAdminsView = false; // מעדכנים את המצב לתצוגה רגילה
        const users = await UsersCache.get();
        
        // סידור הערים לפי הסדר הרצוי
        const cityOrder = ['להבים', 'עומר', 'מיתר', 'כרמים', 'באר שבע', 'אחר'];
        let usersByCity = {};
        cityOrder.forEach(city => usersByCity[city] = []);
        
        // מיון המשתמשים לפי ערים
        users.forEach(user => {
            const city = CONFIG.USERS.CITIES.includes(user.city) ? user.city : 'אחר';
            if (usersByCity[city]) {
                usersByCity[city].push(user);
            }
        });
        
        // מיון המשתמשים בכל עיר לפי position
        Object.keys(usersByCity).forEach(city => {
            usersByCity[city].sort((a, b) => (a.position || 0) - (b.position || 0));
        });
        
        // סינון לפי עיר אם נדרש
        if (cityFilter !== 'all') {
            const filteredUsers = {};
            filteredUsers[cityFilter] = usersByCity[cityFilter] || [];
            usersByCity = filteredUsers;
        }
        
        // סינון משתמשים חדשים אם נדרש
        if (showOnlyNew) {
            Object.keys(usersByCity).forEach(city => {
                usersByCity[city] = usersByCity[city].filter(user => {
                    if (!user.joinDate) return false;
                    const joinDate = new Date(user.joinDate);
                    const now = new Date();
                    const diffTime = Math.abs(now - joinDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 7;
                });
            });
        }
        
        const usersList = document.getElementById('userList');
        if (!usersList) {
            console.error('לא נמצא אלמנט עם ID userList');
            return;
        }
        
        usersList.innerHTML = '';
        
        // יצירת סקציות לכל עיר
        cityOrder.forEach(city => {
            if (usersByCity[city] && usersByCity[city].length > 0) {
                const section = document.createElement('div');
                section.className = 'city-section';
                section.innerHTML = `<h3>${city}</h3>`;
                
                const usersGrid = document.createElement('div');
                usersGrid.className = 'users-grid';
                
                usersByCity[city].forEach(user => {
                    const userCard = document.createElement('div');
                    userCard.className = 'user-item';
                    userCard.dataset.userId = user.id;
                    userCard.dataset.position = user.position || 0;
                    userCard.innerHTML = renderUser(user);
                    usersGrid.appendChild(userCard);
                });
                
                section.appendChild(usersGrid);
                usersList.appendChild(section);
            }
        });
        
        // עדכון סטטיסטיקות
        await loadUserStats();
        
    } catch (error) {
        console.error('שגיאה בטעינת משתמשים:', error);
        alert('שגיאה בטעינת רשימת המשתמשים');
    }
}

// פונקציה לטעינת סטטיסטיקות משתמשים
async function loadUserStats() {
    try {
        const response = await fetch('/api/users/stats');
        const stats = await response.json();
        
        // עדכון סטטיסטיקות כלליות
        document.getElementById('totalUsers').textContent = stats.total;
        document.getElementById('newUsers').textContent = stats.newUsers;
        
        // עדכון סטטיסטיקות לפי ערים
        const cityStatsContainer = document.getElementById('cityStatsContainer');
        if (cityStatsContainer) {
            // חישוב האחוזים
            const totalUsers = stats.byCity.reduce((sum, city) => sum + city.count, 0);
            
            cityStatsContainer.innerHTML = stats.byCity.map(cityStat => {
                const percentage = ((cityStat.count / totalUsers) * 100).toFixed(1);
                return `
                    <div class="city-stat-card" style="
                        border-radius: 8px;
                        padding: 12px;
                        margin: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        position: relative;
                        overflow: hidden;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #1f2937;">${cityStat.city}</h4>
                            <span style="background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">
                                ${percentage}%
                            </span>
                        </div>
                        <div style="font-size: 1.2em; font-weight: bold; color: #374151;">
                            ${cityStat.count} משתמשים
                        </div>
                        <div style="
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            width: 100%;
                            height: 4px;
                            background: #f3f4f6;
                        ">
                            <div style="
                                width: ${percentage}%;
                                height: 100%;
                                background: #10b981;
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                    </div>
                `;
            }).join('');

            // הוספת סגנון לקונטיינר
            cityStatsContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                padding: 16px;
                background: #f9fafb;
                border-radius: 12px;
                margin-bottom: 24px;
            `;
        }
    } catch (error) {
        console.error('שגיאה בטעינת סטטיסטיקות:', error);
    }
}

// פונקציית מעבר בין תצוגות
async function switchView(view) {
    
    // הסרת סטייל פעיל מכל הכפתורים
    document.querySelectorAll('.main-nav-button, .side-nav-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.classList.contains('main-nav-button')) {
            btn.style.backgroundColor = '#3b82f6';
        }
    });
    
    // הוספת סטייל פעיל לכפתורים המתאימים
    document.querySelectorAll(`.main-nav-button[data-view="${view}"], .side-nav-button[data-view="${view}"]`).forEach(button => {
        button.classList.add('active');
        if (button.classList.contains('main-nav-button')) {
            button.style.backgroundColor = '#10b981';
        }
    });
    
    // הסתרת כל התצוגות והאלמנטים הקשורים
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // הסתרת אלמנטים ספציפיים לתצוגת משתמשים כשלא נמצאים בה
    const userElements = ['.user-stats', '#cityStatsContainer', '.controls-row'];
    userElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = view === 'users' ? '' : 'none';
        }
    });
    
    // הצגת התצוגה הנבחרת
    const activeView = document.getElementById(`${view}View`);
    if (activeView) {
        activeView.style.display = 'block';
        
        // טעינת תוכן בהתאם לתצוגה
        try {
            switch(view) {
                case 'users':
                    await loadUsers();
                    break;
                case 'products':
                    if (typeof loadProducts === 'function') {
                        await loadProducts();
                    } else {
                        activeView.innerHTML = '<h2>מערכת ניהול מוצרים תהיה זמינה בקרוב</h2>';
                    }
                    break;
                case 'orders':
                    if (typeof loadOrders === 'function') {
                        await loadOrders();
                    } else {
                        activeView.innerHTML = '<h2>מערכת ניהול הזמנות תהיה זמינה בקרוב</h2>';
                    }
                    break;
            }
        } catch (error) {
            console.error('שגיאה בטעינת התצוגה:', error);
            activeView.innerHTML = '<h2>שגיאה בטעינת התוכן</h2>';
        }
    }
}

// עדכון פונקציית אתחול הדף
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // טעינת רשימת מנהלים
        await loadAdminIds();
        
        // הגדרת חיפוש
        setupSearch();

        // יצירת כפתורי ניווט בצד
        createSideNavigation();

        // הגדרת הכפתורים הראשיים
        const mainNav = document.querySelector('.main-nav');
        if (mainNav) {
            mainNav.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                padding: 1rem;
                display: flex;
                justify-content: center;
                gap: 1rem;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                z-index: 1000;
            `;
        }

        const mainNavButtons = document.querySelectorAll('.main-nav-button');
        mainNavButtons.forEach(button => {
            button.style.cssText = `
                padding: 1rem 2rem;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                background-color: #ffc2d1;
                color: white;
                width: 33.33%;
            `;
            
            button.addEventListener('click', (e) => {
                const view = e.target.closest('.main-nav-button').dataset.view;
                switchView(view);
            });
        });
        
        // הגדרת סינון לפי עיר
        const cityFilter = document.getElementById('cityFilter');
        if (cityFilter) {
            cityFilter.addEventListener('change', async (e) => {
                const selectedCity = e.target.value;
                await loadUsers(selectedCity);
            });
        }
        
        // הגדרת כפתורי הסינון
        const filterButtons = document.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.style.cssText = `
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                color: white;
            `;

            if (button.classList.contains('green')) {
                button.style.backgroundColor = '#10b981';
            } else if (button.classList.contains('gold')) {
                button.style.backgroundColor = '#f59e0b';
            } else if (button.classList.contains('blue')) {
                button.style.backgroundColor = '#3b82f6';
            } else if (button.classList.contains('purple')) {
                button.style.backgroundColor = '#9333ea';
            } else if (button.classList.contains('black')) {
                button.style.backgroundColor = '#1f2937';
            }
        });
        
        // טעינת תצוגת ברירת מחדל (משתמשים)
        await switchView('users');

    } catch (error) {
        console.error('שגיאה באתחול הדף:', error);
        alert('שגיאה בטעינת הדף');
    }
});

// פונקציות עריכה ומחיקה
function editUser(userId) {
    // פתיחת טופס עריכה
    showEditUserForm(userId);
}

// עדכון פונקציית מחיקת משתמש
async function deleteUser(userId) {
    if (!userId) {
        console.error('לא סופק מזהה משתמש למחיקה');
        return;
    }
    
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;
    
    try {
        // קבלת פרטי המשתמש לפני המחיקה
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) throw new Error('שגיאה בטעינת פרטי המשתמש');
        const user = await userResponse.json();
        const userCity = user.city;
        const userPosition = user.position || 0;
        
        // מחיקת המשתמש
        const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('שגיאה במחיקת המשתמש');

        // הסרת הכרטיסייה מהתצוגה
        const userCard = document.querySelector(`[data-user-id="${userId}"]`);
        if (userCard) {
            userCard.remove();
        }

        // רק אם המיקום גדול מ-0, נעדכן את המיקומים של המשתמשים האחרים
        if (userPosition > 0) {
            // קבלת כל המשתמשים
            const allUsersResponse = await fetch('/api/users');
            if (!allUsersResponse.ok) throw new Error('שגיאה בטעינת משתמשים');
            const allUsers = await allUsersResponse.json();
            
            // מיון המשתמשים לפי מיקום ועדכון המיקומים
            const usersToUpdate = allUsers
                .filter(u => u.city === userCity && u.id !== userId && (u.position || 0) > userPosition)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            // עדכון המיקומים בצורה סדרתית
            for (const userToUpdate of usersToUpdate) {
                const newPosition = (userToUpdate.position || 0) - 1;
                if (newPosition > 0) {
                    const updateResponse = await fetch(`/api/users/${userToUpdate.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...userToUpdate,
                            position: newPosition
                        })
                    });

                    if (updateResponse.ok) {
                        // עדכון המיקום בכרטיסייה
                        const card = document.querySelector(`[data-user-id="${userToUpdate.id}"]`);
                        if (card) {
                            const positionCircle = card.querySelector('.user-position-circle');
                            if (positionCircle) {
                                positionCircle.textContent = newPosition;
                            }
                            card.dataset.position = newPosition;
                        }
                    }
                }
            }
        }

        // ניקוי המטמון
        UsersCache.clear();
        
        // הצגת הודעת הצלחה
        showSuccessMessage('המשתמש נמחק בהצלחה');
        
    } catch (error) {
        console.error('שגיאה במחיקת המשתמש:', error);
        alert('שגיאה במחיקת המשתמש');
    }
}

// פונקציה להצגת טופס עריכת משתמש
function showEditUserForm(userId) {
    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(user => showUserForm(user))
        .catch(error => {
            console.error('שגיאה בטעינת פרטי המשתמש:', error);
            alert('שגיאה בטעינת פרטי המשתמש');
        });
}

// פונקציה להצגת הטופס
async function showUserForm(user = null) {
    const isEdit = !!user;
    
    // המרת notes למערך אם הוא מגיע כמחרוזת JSON
    if (user && typeof user.notes === 'string') {
        try {
            user.notes = JSON.parse(user.notes);
        } catch (e) {
            user.notes = [];
        }
    }

    // המרת admin_notes למערך אם הוא מגיע כמחרוזת JSON
    if (user && typeof user.admin_notes === 'string') {
        try {
            user.admin_notes = JSON.parse(user.admin_notes);
        } catch (e) {
            user.admin_notes = [];
        }
    }
    
    // בדיקה אם כבר קיים מודל פתוח
    const existingModal = document.querySelector('.edit-user-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'edit-user-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // הוספת שדה הערות מנהל
    const adminNotesHtml = `
        <div class="form-group">
            <label>הערות מנהל</label>
            <div id="adminNotesContainer">
                ${(user?.admin_notes || []).length > 0 ? 
                    (user?.admin_notes || []).map((admin_note, index) => `
                        <div class="note-row" style="
                            margin-bottom: 8px;
                            display: flex;
                            gap: 8px;
                            background-color: #fef9c3;
                            padding: 8px;
                            border-radius: 4px;
                            border: 1px solid #f59e0b;
                        ">
                            <input type="text" name="admin_notes[]" value="${admin_note}" style="flex: 1;">
                            <button type="button" onclick="removeAdminNote(this)" class="remove-note" style="
                                background-color: #ef4444;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                padding: 4px 8px;
                                cursor: pointer;
                            ">-</button>
                        </div>
                    `).join('') : 
                    `<div class="note-row" style="
                        margin-bottom: 8px;
                        display: flex;
                        gap: 8px;
                        background-color: #fef9c3;
                        padding: 8px;
                        border-radius: 4px;
                        border: 1px solid #f59e0b;
                    ">
                        <input type="text" name="admin_notes[]" style="flex: 1;">
                        <button type="button" onclick="removeAdminNote(this)" class="remove-note" style="
                            background-color: #ef4444;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            padding: 4px 8px;
                            cursor: pointer;
                        ">-</button>
                    </div>`
                }
            </div>
            <button type="button" onclick="addAdminNote()" class="add-note" style="
                background-color: #22c55e;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px;
                width: 100%;
                margin-top: 8px;
                cursor: pointer;
            ">+ הוסף הערת מנהל</button>
        </div>
    `;

    modal.innerHTML = `
        <div class="edit-user-modal-content" style="
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            width: 100%;
            max-width: 400px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
            <div class="edit-user-modal-header">
                <h2>${isEdit ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</h2>
            </div>
            <form class="user-form">
                <div class="form-group required">
                    <label>שם</label>
                    <input type="text" name="name" required value="${user?.name || ''}">
                </div>
                <div class="form-group required">
                    <label>טלפון</label>
                    <input type="tel" name="phone" required value="${user?.phone || ''}">
                </div>
                <div class="form-group required">
                    <label>כתובת</label>
                    <input type="text" name="address" required value="${user?.address || ''}">
                </div>
                <div class="form-group required">
                    <label>עיר</label>
                    <select name="city" required id="citySelect" onchange="toggleOtherCityInput(this)">
                        <option value="" ${!user?.city ? 'selected' : ''}>בחר עיר</option>
                        <option value="להבים" ${user?.city === 'להבים' ? 'selected' : ''}>להבים</option>
                        <option value="עומר" ${user?.city === 'עומר' ? 'selected' : ''}>עומר</option>
                        <option value="מיתר" ${user?.city === 'מיתר' ? 'selected' : ''}>מיתר</option>
                        <option value="כרמים" ${user?.city === 'כרמים' ? 'selected' : ''}>כרמים</option>
                        <option value="באר שבע" ${user?.city === 'באר שבע' ? 'selected' : ''}>באר שבע</option>
                        <option value="אחר" ${user?.city && !['להבים', 'עומר', 'מיתר', 'כרמים', 'באר שבע'].includes(user?.city) ? 'selected' : ''}>אחר</option>
                    </select>
                    <input type="text" id="otherCityInput" name="otherCity" style="display: none; margin-top: 0.5rem;" placeholder="הכנס עיר">
                </div>
                <div class="form-group">
                    <label>מיקום</label>
                    <div class="position-controls">
                        <input type="number" name="position" value="${user?.position || 0}">
                        <button type="button" onclick="moveUserPosition(this, 'before')" class="position-btn">הזז לפני</button>
                        <button type="button" onclick="moveUserPosition(this, 'after')" class="position-btn">הזז אחרי</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>סיסמה</label>
                    <input type="text" name="password" value="${user?.password || ''}">
                </div>
                <div class="form-group">
                    <label>קוד</label>
                    <input type="text" name="code" value="${user?.code || ''}">
                </div>
                <div class="form-group">
                    <label>חוב</label>
                    <input type="number" name="debt_balance" value="${user?.debt_balance || 0}">
                </div>
                <div class="form-group">
                    <label>הערות</label>
                    <div id="notesContainer">
                        ${(user?.notes || []).length > 0 ? 
                            (user?.notes || []).map((note, index) => `
                                <div class="note-row" style="margin-bottom: 8px; display: flex; gap: 8px;">
                                    <input type="text" name="notes[]" value="${note}" style="flex: 1;">
                                    <button type="button" onclick="removeNote(this)" class="remove-note" style="
                                        background-color: #ef4444;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        padding: 4px 8px;
                                        cursor: pointer;
                                    ">-</button>
                                </div>
                            `).join('') : 
                            `<div class="note-row" style="margin-bottom: 8px; display: flex; gap: 8px;">
                                <input type="text" name="notes[]" style="flex: 1;">
                                <button type="button" onclick="removeNote(this)" class="remove-note" style="
                                    background-color: #ef4444;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    padding: 4px 8px;
                                    cursor: pointer;
                                ">-</button>
                            </div>`
                        }
                    </div>
                    <button type="button" onclick="addNote()" class="add-note" style="
                        background-color: #22c55e;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 8px;
                        width: 100%;
                        margin-top: 8px;
                        cursor: pointer;
                    ">+ הוסף הערה</button>
                </div>
                <div class="form-group">
                    <label>הערות מנהל</label>
                    <div id="adminNotesContainer">
                        ${(user?.admin_notes || []).length > 0 ? 
                            (user?.admin_notes || []).map((admin_note, index) => `
                                <div class="note-row" style="
                                    margin-bottom: 8px;
                                    display: flex;
                                    gap: 8px;
                                    background-color: #fef9c3;
                                    padding: 8px;
                                    border-radius: 4px;
                                    border: 1px solid #f59e0b;
                                ">
                                    <input type="text" name="admin_notes[]" value="${admin_note}" style="flex: 1;">
                                    <button type="button" onclick="removeAdminNote(this)" class="remove-note" style="
                                        background-color: #ef4444;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        padding: 4px 8px;
                                        cursor: pointer;
                                    ">-</button>
                                </div>
                            `).join('') : 
                            `<div class="note-row">
                                <input type="text" name="admin_notes[]">
                                <button type="button" onclick="removeAdminNote(this)" class="remove-note">-</button>
                            </div>`
                        }
                    </div>
                    <button type="button" onclick="addAdminNote()" class="add-note" style="width: 100%;">+ הוסף הערת מנהל</button>
                </div>
                <div class="form-group">
                    <label>קישור ל-Google Maps</label>
                    <input type="text" name="maps" value="${user?.maps || ''}">
                </div>
                <div class="form-group">
                    <label>קישור ל-Waze</label>
                    <input type="text" name="waze" value="${user?.waze || ''}">
                </div>

                <div class="edit-user-form-actions">
                    <button type="submit" class="edit-user-save-button">${isEdit ? 'שמור' : 'הוסף'}</button>
                    <button type="button" class="edit-user-cancel-button" onclick="closeModal(this)">ביטול</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // הוספת מאזין לטופס
    const form = modal.querySelector('form');
    const phoneInput = form.querySelector('input[name="phone"]');
    const passwordInput = form.querySelector('input[name="password"]');

    // מאזין לשינויים בשדה הטלפון
    if (!isEdit) {
        phoneInput.addEventListener('input', (e) => {
            // אם אין סיסמה או שהסיסמה זהה למספר הטלפון הקודם המנוקה
            if (!passwordInput.value || passwordInput.value === e.target.value.replace(/\D/g, '')) {
                // עדכון הסיסמה למספר הטלפון החדש המנוקה
                passwordInput.value = e.target.value.replace(/\D/g, '');
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        // איסוף כל ההערות
        const notes = Array.from(form.querySelectorAll('input[name="notes[]"]'))
            .map(input => input.value)
            .filter(note => note.trim() !== '');

        // איסוף הערות מנהל
        const adminNotes = Array.from(form.querySelectorAll('input[name="admin_notes[]"]'))
            .map(input => input.value)
            .filter(note => note.trim() !== '');
        
        // ניקוי מספר הטלפון מתווים מיוחדים
        const phone = formData.get('phone').replace(/\D/g, '');
        
        const position = parseInt(formData.get('position')) || 0;
        
        const userData = {
            ...(user?.id && { id: user.id }),
            name: formData.get('name'),
            phone: phone,
            address: formData.get('address'),
            city: formData.get('city') === 'אחר' ? formData.get('otherCity') : formData.get('city'),
            position: position,
            password: formData.get('password') || phone,
            code: formData.get('code') || '',
            notes: notes,  // שינוי: שליחת המערך ישירות
            admin_notes: adminNotes,  // שינוי: שליחת המערך ישירות
            debt_balance: parseFloat(formData.get('debt_balance')) || 0,
            maps: formData.get('maps') || '',
            waze: formData.get('waze') || ''
        };

        console.log('Saving user data:', userData); // לוג לבדיקה

        try {
            let response;
            if (isEdit) {
                response = await fetch(`/api/users/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
            } else {
                response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error saving user');
            }

            const savedUser = await response.json();
            console.log('Saved user:', savedUser); // לוג לבדיקה

            // סגירת המודל והצגת הודעת הצלחה
            modal.remove();
            showSuccessMessage(isEdit ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוסף בהצלחה');
            
            // ניקוי המטמון וטעינה מחדש של הרשימה
            UsersCache.clear();
            await loadUsers();

        } catch (error) {
            console.error('Error saving user:', error);
            alert('אירעה שגיאה בשמירת המשתמש');
        }
    });

    // הצגת/הסתרת שדה עיר אחרת בהתאם לבחירה הנוכחית
    const citySelect = modal.querySelector('#citySelect');
    if (citySelect) {
        toggleOtherCityInput(citySelect);
    }
}

// פונקציות חדשות לטיפול בהערות מנהל
window.addAdminNote = function() {
    const container = document.getElementById('adminNotesContainer');
    const noteRow = document.createElement('div');
    noteRow.className = 'note-row';
    noteRow.style.cssText = `
        margin-bottom: 8px;
        display: flex;
        gap: 8px;
        background-color: #fef9c3;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #f59e0b;
    `;
    noteRow.innerHTML = `
        <input type="text" name="admin_notes[]" style="flex: 1;">
        <button type="button" onclick="removeAdminNote(this)" class="remove-note" style="
            background-color: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
        ">-</button>
    `;
    container.appendChild(noteRow);
}

window.removeAdminNote = function(button) {
    const noteRow = button.closest('.note-row');
    if (noteRow) {
        noteRow.remove();
    }
}

// פונקציה להזזת משתמש לפני/אחרי משתמש אחר
window.moveUserPosition = async function(button, direction) {
    const form = button.closest('form');
    const citySelect = form.querySelector('#citySelect');
    const selectedCity = citySelect.value;
    
    if (selectedCity === '' || selectedCity === 'אחר') {
        alert('יש לבחור עיר תחילה');
        return;
    }

    try {
        // קבלת רשימת המשתמשים מאותה עיר
        const response = await fetch('/api/users');
        const users = await response.json();
        const cityUsers = users
            .filter(u => u.city === selectedCity)
            .sort((a, b) => (a.position || 0) - (b.position || 0));

        if (!cityUsers.length) {
            alert('אין משתמשים נוספים בעיר זו');
            return;
        }

        // יצירת חלונית בחירת משתמש
        const selectModal = document.createElement('div');
        selectModal.className = 'position-select-modal-overlay';
        selectModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        selectModal.innerHTML = `
            <div class="edit-user-modal-content" style="max-width: 300px; margin: auto; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                <div class="edit-user-modal-header">
                    <h2>בחר משתמש להזזה ${direction === 'before' ? 'לפניו' : 'אחריו'}</h2>
                </div>
                <div class="users-list">
                    ${cityUsers.map(u => `
                        <div class="user-select-item" onclick="updatePosition(${u.position || 0}, '${direction}', '${u.id}')" 
                             style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee; transition: background-color 0.2s;"
                             onmouseover="this.style.backgroundColor='#f3f4f6'" 
                             onmouseout="this.style.backgroundColor='transparent'">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="user-name" style="font-weight: bold;">${u.name}</span>
                                    <span style="color: #666; font-size: 0.9em;">${u.address.split(',')[0]}</span>
                                </div>
                                <span class="user-position" style="background: #f97316; color: white; font-weight: bold; font-size: 0.9em; padding: 4px 8px; border-radius: 4px;">
                                    ${u.position || 0}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="edit-user-form-actions" style="margin-top: 1rem; text-align: center;">
                    <button type="button" onclick="this.closest('.position-select-modal-overlay').remove()" style="background: #e5e7eb; color: #374151; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">ביטול</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(selectModal);

    } catch (error) {
        console.error('Error:', error);
        alert('אירעה שגיאה בטעינת המשתמשים');
    }
}

// פונקציה לעדכון המיקום בטופס
window.updatePosition = function(targetPosition, direction, userId) {
    const form = document.querySelector('.user-form');
    if (!form) return;
    
    const positionInput = form.querySelector('input[name="position"]');
    if (!positionInput) return;
    
    // חישוב המיקום החדש
    const newPosition = direction === 'before' ? targetPosition : targetPosition + 1;
    
    // עדכון המיקום בטופס
    positionInput.value = newPosition;
    
    // סגירת חלונית הבחירה
    const selectModal = document.querySelector('.position-select-modal-overlay');
    if (selectModal) {
        selectModal.remove();
    }
}

// הוספת הפונקציות לחלון הגלובלי
window.showEditUserForm = showEditUserForm;
window.showUserForm = showUserForm;
window.toggleOtherCityInput = function(select) {
    const otherCityInput = document.getElementById('otherCityInput');
    if (select.value === 'אחר') {
        otherCityInput.style.display = 'block';
        otherCityInput.required = true;
    } else {
        otherCityInput.style.display = 'none';
        otherCityInput.required = false;
    }
}

window.closeModal = function(element) {
    const modalOverlay = element.closest('.modal-overlay, .edit-user-modal-overlay, .position-select-modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
    }
}

window.addNote = function() {
    const container = document.getElementById('notesContainer');
    const noteRow = document.createElement('div');
    noteRow.className = 'note-row';
    noteRow.style.cssText = 'margin-bottom: 8px; display: flex; gap: 8px;';
    noteRow.innerHTML = `
        <input type="text" name="notes[]" style="flex: 1;">
        <button type="button" onclick="removeNote(this)" class="remove-note" style="
            background-color: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
        ">-</button>
    `;
    container.appendChild(noteRow);
}

window.removeNote = function(button) {
    const noteRow = button.closest('.note-row');
    if (noteRow) {
        noteRow.remove();
    }
}

// פונקציה לשמירת משתמש חדש
async function saveUser(userData) {
    try {
        // איסוף הערות מהטופס
        const form = document.querySelector('.user-form');
        if (!form) throw new Error('הטופס לא נמצא');

        const notes = Array.from(form.querySelectorAll('input[name="notes[]"]'))
            .map(input => input.value)
            .filter(note => note.trim() !== '');
            
        const adminNotes = Array.from(form.querySelectorAll('input[name="admin_notes[]"]'))
            .map(input => input.value)
            .filter(note => note.trim() !== '');

        // הוספת ההערות לנתוני המשתמש
        const updatedUserData = {
            ...userData,
            notes: JSON.stringify(notes || []),
            admin_notes: JSON.stringify(adminNotes || [])
        };

        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUserData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בשמירת המשתמש');
        }

        return await response.json();
    } catch (error) {
        console.error('שגיאה בשמירת המשתמש:', error);
        throw error;
    }
}

// פונקציה לעדכון משתמש קיים
async function updateUser(userData) {
    try {
        // טיפול בהערות לפני העדכון
        if (Array.isArray(userData.notes)) {
            userData.notes = JSON.stringify(userData.notes.filter(note => note.trim() !== ''));
        }
        if (Array.isArray(userData.admin_notes)) {
            userData.admin_notes = JSON.stringify(userData.admin_notes.filter(note => note.trim() !== ''));
        }

        const response = await fetch(`/api/users/${userData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'שגיאה בעדכון המשתמש');
        }

        return await response.json();
    } catch (error) {
        console.error('שגיאה בעדכון המשתמש:', error);
        throw error;
    }
}

// פונקציה להצגת רשימת מנהלים
window.showAdmins = async function() {
    try {
        isAdminsView = true; // מעדכנים את המצב לתצוגת מנהלים
        const users = await UsersCache.get();
        const admins = users.filter(user => ADMIN_IDS.includes(user.id));
        
        const usersList = document.getElementById('userList');
        if (!usersList) {
            console.error('לא נמצא אלמנט עם ID userList');
            return;
        }
        
        usersList.innerHTML = '';
        
        if (admins.length === 0) {
            usersList.innerHTML = '<div class="no-results">אין מנהלים במערכת</div>';
            return;
        }

        // יצירת סקציה למנהלים
        const section = document.createElement('div');
        section.className = 'city-section';
        section.innerHTML = `<h3>מנהלי המערכת (${admins.length})</h3>`;
        
        const usersGrid = document.createElement('div');
        usersGrid.className = 'users-grid';
        
        admins.forEach(admin => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';
            userCard.dataset.userId = admin.id;
            userCard.dataset.position = admin.position || 0;
            userCard.innerHTML = renderUser(admin);
            usersGrid.appendChild(userCard);
        });
        
        section.appendChild(usersGrid);
        usersList.appendChild(section);
        
        // עדכון כפתורי הסינון
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        });
        
    } catch (error) {
        console.error('שגיאה בטעינת מנהלים:', error);
        alert('שגיאה בטעינת רשימת המנהלים');
    }
};

// פונקציה להסרת מנהל
window.removeAdmin = function(userId, userName) {
    if (confirm(`האם אתה בטוח שברצונך להסיר את ${userName} מרשימת המנהלים?`)) {
        const index = ADMIN_IDS.indexOf(userId);
        if (index > -1) {
            ADMIN_IDS.splice(index, 1);
            showSuccessMessage(`${userName} הוסר מרשימת המנהלים`);
            // רענון תצוגת המנהלים
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                modalOverlay.remove();
            }
            showAdmins();
        }
    }
};

// קבוע למנהלי המערכת - נעביר אותו לתחילת הקובץ
const ADMIN_IDS = ['1', '2', '3']; // רשימת מזהים של מנהלים

// מצב בחירת מנהלים
let isAdminSelectionMode = false;

// פונקציה להפעלת/כיבוי מצב בחירת מנהלים
window.toggleAdminMode = async function() {
    isAdminSelectionMode = !isAdminSelectionMode;
    
    // עדכון כפתורי הסינון
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    });

    const adminButton = document.querySelector('.filter-button.black');
    if (adminButton) {
        adminButton.classList.add('active');
        adminButton.style.backgroundColor = '#1f2937';
        if (isAdminSelectionMode) {
            adminButton.innerHTML = '<i class="fas fa-times"></i> סיים בחירה';
            showSuccessMessage('בחר משתמשים להוספה לרשימת המנהלים');
        } else {
            adminButton.innerHTML = '<i class="fas fa-user-plus"></i> בחר מנהל';
        }
    }
    
    // טעינה מחדש של המשתמשים כדי לעדכן את התצוגה
    await loadUsers();
}

// פונקציה לטיפול בשינוי סטטוס מנהל
window.toggleUserAdmin = async function(userId, isAdmin) {
    const user = await fetch(`/api/users/${userId}`).then(res => res.json());
    
    if (isAdmin && !ADMIN_IDS.includes(userId)) {
        // הוספת מנהל חדש
        ADMIN_IDS.push(userId);
        await saveAdminIds();
        showSuccessMessage(`${user.name} הפך למנהל`);
    } else if (!isAdmin && ADMIN_IDS.includes(userId)) {
        // הסרת מנהל קיים
        const index = ADMIN_IDS.indexOf(userId);
        if (index > -1) {
            ADMIN_IDS.splice(index, 1);
            await saveAdminIds();
            showSuccessMessage(`${user.name} הוסר מרשימת המנהלים`);
        }
    }
    
    // רענון התצוגה בהתאם למצב הנוכחי
    if (isAdminSelectionMode) {
        await loadUsers();
    } else {
        await showAdmins();
    }
}

// פונקציה להצגת משתמשים עם חוב
window.showUsersWithDebt = async function() {
    try {
        const users = await UsersCache.get();
        const usersWithDebt = users.filter(user => user.debt_balance > 0);
        
        // מיון לפי גודל החוב (מהגדול לקטן)
        usersWithDebt.sort((a, b) => b.debt_balance - a.debt_balance);
        
        const usersList = document.getElementById('userList');
        if (!usersList) {
            console.error('לא נמצא אלמנט עם ID userList');
            return;
        }
        
        usersList.innerHTML = '';
        
        if (usersWithDebt.length === 0) {
            usersList.innerHTML = '<div class="no-results">אין משתמשים עם חוב</div>';
            return;
        }

        // יצירת סקציה אחת עם כל המשתמשים עם חוב
        const section = document.createElement('div');
        section.className = 'city-section';
        section.innerHTML = `<h3 style="color: #9333ea;">משתמשים עם חוב (${usersWithDebt.length})</h3>`;
        
        const usersGrid = document.createElement('div');
        usersGrid.className = 'users-grid';
        
        usersWithDebt.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';
            userCard.dataset.userId = user.id;
            userCard.dataset.position = user.position || 0;
            userCard.innerHTML = renderUser(user);
            usersGrid.appendChild(userCard);
        });
        
        section.appendChild(usersGrid);
        usersList.appendChild(section);
        
        // עדכון כפתורי הסינון
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        });

        const debtButton = document.querySelector('.filter-button.purple');
        if (debtButton) {
            debtButton.classList.add('active');
            debtButton.style.backgroundColor = '#9333ea';
            debtButton.style.borderColor = '#9333ea';
            debtButton.style.color = '#ffffff';
        }
        
    } catch (error) {
        console.error('שגיאה בטעינת משתמשים עם חוב:', error);
        alert('שגיאה בטעינת רשימת המשתמשים עם חוב');
    }
}

// פונקציה לתיקון קישורי Dropbox
function fixDropboxImageUrl(url) {
    if (!url || !url.includes('dropbox.com')) return url;
    return url.replace('?dl=0', '?raw=1')
              .replace('&dl=0', '&raw=1')
              .replace('www.dropbox', 'dl.dropboxusercontent');
}

// פונקציה לטעינת מוצרים
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const productsView = document.getElementById('productsView');
        if (!productsView) return;
        
        productsView.innerHTML = `
            <div class="products-container">
                <div class="products-header">
                    <input type="text" class="products-search" placeholder="חיפוש מוצר..." onkeyup="filterProducts(this.value)">
                    <button class="add-product-btn" onclick="showProductForm()">
                        <i class="fas fa-plus"></i>
                        הוסף מוצר
                    </button>
                </div>
                <div class="products-grid" id="productsGrid"></div>
            </div>
        `;
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${fixDropboxImageUrl(product.image) || '/images/default-product.png'}" alt="${product.name}" class="product-image">
                <div class="product-name">${product.name}</div>
                <div class="product-price">₪${product.price}</div>
                <div class="product-category">${product.category || 'ללא קטגוריה'}</div>
                <div class="product-details">
                    <div>נפח: ${product.volume || 'לא צוין'}</div>
                    <div>אחסון: ${product.storage || 'לא צוין'}</div>
                    <div>חיי מדף: ${product.shelfLife || 'לא צוין'}</div>
                </div>
                <div class="product-actions">
                    <button class="product-edit-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                        ערוך
                    </button>
                    <button class="product-delete-btn" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                        מחק
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('שגיאה בטעינת מוצרים:', error);
        showErrorMessage('שגיאה בטעינת המוצרים');
    }
}

// פונקציה להצגת טופס עריכה/הוספת מוצר
async function showProductForm(product = null) {
    const isEdit = !!product;
    
    // אם זה מוצר חדש, נחשב את ה-ID הבא
    let nextId = null;
    if (!isEdit) {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            // מציאת ה-ID הגבוה ביותר והוספת 1
            nextId = Math.max(0, ...products.map(p => p.id || 0)) + 1;
        } catch (error) {
            console.error('שגיאה בחישוב ID הבא:', error);
            nextId = 1; // ברירת מחדל אם יש שגיאה
        }
    }
    
    // תיקון URL התמונה אם קיים
    if (product?.image) {
        product.image = fixDropboxImageUrl(product.image);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${isEdit ? 'עריכת מוצר' : 'הוספת מוצר חדש'}</h2>
            </div>
            <form class="product-form-container" id="productForm">
                ${!isEdit ? `
                <div class="product-form-group">
                    <label>מספר מזהה</label>
                    <input type="number" name="id" value="${nextId}" readonly style="background-color: #f3f4f6;">
                </div>
                ` : ''}
                <div class="product-form-group">
                    <label>שם המוצר</label>
                    <input type="text" name="name" required value="${product?.name || ''}">
                </div>
                <div class="product-form-group">
                    <label>מחיר</label>
                    <input type="number" step="0.01" name="price" required value="${product?.price || ''}">
                </div>
                <div class="product-form-group">
                    <label>תמונה (URL)</label>
                    <input type="text" name="image" value="${product?.image || ''}" oninput="this.value = fixDropboxImageUrl(this.value)">
                </div>
                <div class="product-form-group">
                    <label>תיאור</label>
                    <textarea name="description">${product?.description || ''}</textarea>
                </div>
                <div class="product-form-group">
                    <label>קטגוריה</label>
                    <input type="text" name="category" value="${product?.category || ''}">
                </div>
                <div class="product-form-group">
                    <label>נפח</label>
                    <input type="text" name="volume" value="${product?.volume || ''}">
                </div>
                <div class="product-form-group">
                    <label>אחסון</label>
                    <input type="text" name="storage" value="${product?.storage || ''}">
                </div>
                <div class="product-form-group">
                    <label>חיי מדף</label>
                    <input type="text" name="shelfLife" value="${product?.shelfLife || ''}">
                </div>
                <div class="form-actions">
                    <button type="submit" class="save-button">שמור</button>
                    <button type="button" class="cancel-button" onclick="closeModal(this)">ביטול</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const form = modal.querySelector('#productForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(form);
            
            const productData = {
                ...(nextId && { id: parseInt(nextId) }), // הוספת ה-ID רק אם זה מוצר חדש
                ...(product?.id && { id: product.id }), // שמירה על ה-ID הקיים אם זה עריכה
                name: formData.get('name').trim(),
                price: parseFloat(formData.get('price')),
                image: fixDropboxImageUrl(formData.get('image')),
                description: formData.get('description')?.trim() || '',
                category: formData.get('category')?.trim() || '',
                volume: formData.get('volume')?.trim() || '',
                storage: formData.get('storage')?.trim() || '',
                shelfLife: formData.get('shelfLife')?.trim() || ''
            };

            // בדיקת שדות חובה
            if (!productData.name) {
                throw new Error('יש להזין שם מוצר');
            }


            const response = await fetch(isEdit ? `/api/products/${product.id}` : '/api/products', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'שגיאה בשמירת המוצר');
            }

            const savedProduct = await response.json();

            modal.remove();
            showSuccessMessage(isEdit ? 'המוצר עודכן בהצלחה' : 'המוצר נוסף בהצלחה');
            loadProducts();

        } catch (error) {
            console.error('שגיאה:', error);
            showErrorMessage(error.message || 'שגיאה בשמירת המוצר');
        }
    });
}

// פונקציה לעריכת מוצר
async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('שגיאה בטעינת פרטי המוצר');
        
        const product = await response.json();
        showProductForm(product);
    } catch (error) {
        console.error('שגיאה:', error);
        showErrorMessage('שגיאה בטעינת פרטי המוצר');
    }
}

// פונקציה למחיקת מוצר
async function deleteProduct(productId) {
    if (!confirm('האם אתה בטוח שברצונך למחוק מוצר זה?')) return;
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('שגיאה במחיקת המוצר');

        showSuccessMessage('המוצר נמחק בהצלחה');
        loadProducts();
    } catch (error) {
        console.error('שגיאה:', error);
        showErrorMessage('שגיאה במחיקת המוצר');
    }
}

// פונקציה לסינון מוצרים
function filterProducts(searchTerm) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    const cards = productsGrid.getElementsByClassName('product-card');
    const term = searchTerm.toLowerCase();
    
    Array.from(cards).forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? '' : 'none';
    });
}

// הוספת הפונקציות לחלון הגלובלי
window.loadProducts = loadProducts;
window.showProductForm = showProductForm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
window.fixDropboxImageUrl = fixDropboxImageUrl;

// פונקציית חיפוש
function setupSearch() {
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const userCards = document.querySelectorAll('.user-item');
            let totalCount = 0;
            
            userCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                const isVisible = text.includes(searchTerm);
                card.style.display = isVisible ? 'block' : 'none';
                if (isVisible) totalCount++;
            });
            
            // עדכון ספירת תוצאות
            let resultsSpan = document.getElementById('searchResults');
            if (!resultsSpan) {
                resultsSpan = document.createElement('span');
                resultsSpan.id = 'searchResults';
                resultsSpan.className = 'search-results-count';
                userSearch.parentNode.appendChild(resultsSpan);
            }
            resultsSpan.textContent = `נמצאו ${totalCount} תוצאות`;
        });
    }
}

// פונקציה לעדכון תוצאות הסינון
function updateFilterResults(count) {
    let resultsSpan = document.getElementById('filterResults');
    if (!resultsSpan) {
        resultsSpan = document.createElement('span');
        resultsSpan.id = 'filterResults';
        resultsSpan.className = 'filter-results-count';
        const filterSelect = document.getElementById('cityFilter');
        if (filterSelect) {
            filterSelect.parentNode.appendChild(resultsSpan);
        }
    }
    resultsSpan.textContent = `נמצאו ${count} משתמשים`;
}

// טעינת רשימת מנהלים בטעינת הדף
async function loadAdminIds() {
    try {
        const response = await fetch('/api/admins');
        const ids = await response.json();
        ADMIN_IDS.length = 0; // ניקוי המערך הקיים
        ADMIN_IDS.push(...ids);
    } catch (error) {
        console.error('שגיאה בטעינת רשימת מנהלים:', error);
    }
}

// שמירת רשימת מנהלים בשרת
async function saveAdminIds() {
    try {
        await fetch('/api/admins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adminIds: ADMIN_IDS })
        });
    } catch (error) {
        console.error('שגיאה בשמירת רשימת מנהלים:', error);
    }
}

// נוסיף משתנה גלובלי חדש לציון מצב תצוגת מנהלים
let isAdminsView = false;

// פונקציה ליצירת כפתורי ניווט קבועים בצד שמאל
function createSideNavigation() {
    const sideNav = document.createElement('div');
    sideNav.className = 'side-nav';
    sideNav.innerHTML = `
        <button onclick="switchView('${CONFIG.VIEWS.USERS}')" class="side-nav-button" data-view="${CONFIG.VIEWS.USERS}">
            <i class="fas fa-users"></i>
        </button>
        <button onclick="switchView('${CONFIG.VIEWS.PRODUCTS}')" class="side-nav-button" data-view="${CONFIG.VIEWS.PRODUCTS}">
            <i class="fas fa-box"></i>
        </button>
        <button onclick="switchView('${CONFIG.VIEWS.ORDERS}')" class="side-nav-button" data-view="${CONFIG.VIEWS.ORDERS}">
            <i class="fas fa-shopping-cart"></i>
        </button>
    `;
    document.body.appendChild(sideNav);
}

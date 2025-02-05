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
    },
    async refresh() {
        await this.get();
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
async function editUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('שגיאה בטעינת פרטי המשתמש');
        }
        const user = await response.json();
        
        // המרת שדות JSON למערכים
        try {
            user.notes = typeof user.notes === 'string' ? JSON.parse(user.notes) : (user.notes || []);
            user.admin_notes = typeof user.admin_notes === 'string' ? JSON.parse(user.admin_notes) : (user.admin_notes || []);
            user.cart = typeof user.cart === 'string' ? JSON.parse(user.cart) : (user.cart || []);
            user.purchases = typeof user.purchases === 'string' ? JSON.parse(user.purchases) : (user.purchases || []);
        } catch (e) {
            console.error('Error parsing JSON fields:', e);
        }

        // וידוא שכל השדות קיימים
        user.debt_balance = user.debt_balance || 0;
        user.password = user.password || user.phone;
        user.code = user.code || '';
        
        console.log('Loaded user data:', user);
        await showUserForm(user);
    } catch (error) {
        console.error('Error loading user:', error);
        showErrorMessage('שגיאה בטעינת פרטי המשתמש');
    }
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
                    const updateResponse = await fetch(`http://localhost:3001/api/users/${userToUpdate.id}`, {
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
    const modal = document.createElement('div');
    modal.className = 'modal';
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
        z-index: 9999;
        padding: 20px;
        direction: rtl;
    `;

    modal.innerHTML = `
        <div class="edit-user-modal-content" style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            width: 100%;
            max-width: 500px;
            max-height: 85vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        ">
            <button onclick="closeModal(this, false)" style="
                position: absolute;
                top: 1rem;
                left: 1rem;
                background: #ef4444;
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            ">×</button>
            
            <div class="edit-user-modal-header" style="
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #f3f4f6;
            ">
                <h2 style="
                    color: #1f2937;
                    font-size: 1.5rem;
                    margin: 0;
                    font-weight: bold;
                ">${isEdit ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</h2>
            </div>

            <form class="user-form" style="
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            ">
                ${isEdit ? `<input type="hidden" name="id" value="${user.id}">` : ''}
                
                <!-- שם מלא -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">שם מלא *</label>
                    <input type="text" name="name" value="${user?.name || ''}" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>
                
                <!-- טלפון -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">טלפון *</label>
                    <input type="tel" name="phone" value="${user?.phone || ''}" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>

                <!-- עיר -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">עיר *</label>
                    <select name="city" onchange="toggleOtherCityInput(this)" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                        background-color: white;
                    ">
                        <option value="להבים" selected>להבים</option>
                        ${CONFIG.USERS.CITIES.filter(city => city !== 'להבים').map(city => 
                            `<option value="${city}" ${user?.city === city ? 'selected' : ''}>${city}</option>`
                        ).join('')}
                        <option value="אחר" ${user && !CONFIG.USERS.CITIES.includes(user?.city) ? 'selected' : ''}>אחר</option>
                    </select>
                    <input type="text" id="otherCityInput" name="otherCity" 
                           style="
                               display: ${user && !CONFIG.USERS.CITIES.includes(user?.city) ? 'block' : 'none'};
                               width: 100%;
                               padding: 0.75rem;
                               border: 1px solid #d1d5db;
                               border-radius: 8px;
                               font-size: 1rem;
                               margin-top: 0.5rem;
                               transition: border-color 0.2s;
                           "
                           value="${user && !CONFIG.USERS.CITIES.includes(user?.city) ? user?.city || '' : ''}"
                           ${user && !CONFIG.USERS.CITIES.includes(user?.city) ? 'required' : ''}>
                </div>

                <!-- כתובת -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">כתובת *</label>
                    <input type="text" name="address" value="${user?.address || ''}" required style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>

                <!-- מיקום -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">מיקום</label>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <input type="number" name="position" value="${user?.position || 0}" min="0" style="
                            width: 100px;
                            padding: 0.75rem;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: border-color 0.2s;
                        ">
                        <button type="button" onclick="showPositionSelector(this, 'before')" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 0.75rem 1rem;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">הזז לפני משתמש</button>
                        <button type="button" onclick="showPositionSelector(this, 'after')" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 0.75rem 1rem;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">הזז אחרי משתמש</button>
                    </div>
                </div>

                <!-- סיסמה -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">סיסמה</label>
                    <input type="text" name="password" value="${user?.password || ''}" style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>

                <!-- קוד -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">קוד</label>
                    <input type="text" name="code" value="${user?.code || ''}" style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>

                <!-- הערות -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">הערות</label>
                    <div id="notesContainer" style="
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    ">
                        ${(user?.notes || []).map(note => `
                            <div class="note-row" style="
                                display: flex;
                                gap: 0.5rem;
                                align-items: center;
                            ">
                                <input type="text" name="notes[]" value="${note}" style="
                                    flex: 1;
                                    padding: 0.75rem;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 1rem;
                                ">
                                <button type="button" onclick="removeNote(this)" class="remove-note" style="
                                    background-color: #ef4444;
                                    color: white;
                                    border: none;
                                    border-radius: 8px;
                                    width: 36px;
                                    height: 36px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 1.2rem;
                                ">-</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" onclick="addNote()" style="
                        background-color: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 0.5rem 1rem;
                        margin-top: 0.5rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.9rem;
                    "><i class="fas fa-plus"></i> הוסף הערה</button>
                </div>

                <!-- הערות מנהל -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">הערות מנהל</label>
                    <div id="adminNotesContainer" style="
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    ">
                        ${(user?.admin_notes || []).map(note => `
                            <div class="note-row" style="
                                display: flex;
                                gap: 0.5rem;
                                align-items: center;
                            ">
                                <input type="text" name="admin_notes[]" value="${note}" style="
                                    flex: 1;
                                    padding: 0.75rem;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 1rem;
                                ">
                                <button type="button" onclick="removeNote(this)" class="remove-note" style="
                                    background-color: #ef4444;
                                    color: white;
                                    border: none;
                                    border-radius: 8px;
                                    width: 36px;
                                    height: 36px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 1.2rem;
                                ">-</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" onclick="addAdminNote()" style="
                        background-color: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 0.5rem 1rem;
                        margin-top: 0.5rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.9rem;
                    "><i class="fas fa-plus"></i> הוסף הערת מנהל</button>
                </div>

                <!-- חוב -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">חוב</label>
                    <input type="number" name="debt_balance" value="${user?.debt_balance || 0}" step="0.01" style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: border-color 0.2s;
                    ">
                </div>

                <div class="edit-user-form-actions" style="
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 2px solid #f3f4f6;
                ">
                    <button type="submit" style="
                        background-color: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 0.75rem 1.5rem;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    "><i class="fas fa-save"></i> שמור</button>
                    <button type="button" onclick="closeModal(this, false)" style="
                        background-color: #e5e7eb;
                        color: #374151;
                        border: none;
                        border-radius: 8px;
                        padding: 0.75rem 1.5rem;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    "><i class="fas fa-times"></i> ביטול</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // הוספת מאזין אירועים לטופס
    const form = modal.querySelector('.user-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(form);
            const phone = formData.get('phone');
            const password = formData.get('password');
            
            const userData = {
                name: formData.get('name'),
                phone: phone,
                password: password || phone.replace(/[^0-9]/g, ''), // אם אין סיסמה, משתמשים במספר הטלפון ללא תווים מיוחדים
                code: formData.get('code'),
                city: formData.get('city') === 'אחר' ? formData.get('otherCity') : formData.get('city'),
                address: formData.get('address'),
                debt_balance: parseFloat(formData.get('debt_balance')) || 0,
                position: parseInt(formData.get('position')) || 0,
                maps: formData.get('maps'),
                waze: formData.get('waze'),
                notes: Array.from(form.querySelectorAll('input[name="notes[]"]'))
                    .map(input => input.value)
                    .filter(note => note.trim() !== ''),
                admin_notes: Array.from(form.querySelectorAll('input[name="admin_notes[]"]'))
                    .map(input => input.value)
                    .filter(note => note.trim() !== '')
            };

            if (isEdit) {
                userData.id = formData.get('id');
                await updateUser(userData);
            } else {
                await saveUser(userData);
            }

            // סגירת המודל עם רענון
            closeModal(modal, true);
            
            // רענון רשימת המשתמשים
            await UsersCache.refresh();
            await loadUsers();
            
            // הצגת הודעת הצלחה
            showSuccessMessage(isEdit ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוסף בהצלחה');
            
        } catch (error) {
            console.error('שגיאה בשמירת המשתמש:', error);
            showErrorMessage('שגיאה בשמירת המשתמש');
        }
    });
}

// פונקציה להוספת הערת מנהל
window.addAdminNote = function() {
    const container = document.getElementById('adminNotesContainer');
    const noteRow = document.createElement('div');
    noteRow.className = 'note-row';
    noteRow.style.cssText = 'margin-bottom: 8px; display: flex; gap: 8px;';
    noteRow.innerHTML = `
        <input type="text" name="admin_notes[]" style="flex: 1;">
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

// פונקציה לעדכון המיקום בטופס
window.updatePosition = function(targetPosition, direction, targetUserId) {
    const positionInput = document.querySelector('input[name="position"]');
    const newPosition = direction === 'before' ? targetPosition : targetPosition + 1;
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

// פונקציה לסגירת החלונית
window.closeModal = function(element, shouldRefresh = false) {
    const modal = element.closest('.modal, .modal-overlay, .edit-user-modal-overlay, .position-select-modal-overlay');
    if (modal) {
        modal.remove();
        if (shouldRefresh) {
            window.location.reload();
        }
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

        const data = await response.json();
        if (data.success) {
            await loadUsers();
            closeModal(document.querySelector('.modal'));
            showSuccessMessage('המשתמש נוסף בהצלחה');
        } else {
            throw new Error(data.message || 'שגיאה בשמירת המשתמש');
        }
    } catch (error) {
        console.error('שגיאה בשמירת המשתמש:', error);
        showErrorMessage(error.message);
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

        const response = await fetch(`http://localhost:3001/api/users/${userData.id}`, {
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

// ... existing code ...
async function loadOrders() {
    try {
        const users = await UsersCache.get();
        const ordersList = document.getElementById('ordersList');
        
        // איסוף כל ההזמנות מכל המשתמשים
        let allOrders = [];
        users.forEach(user => {
            try {
                const purchases = typeof user.purchases === 'string' ? 
                    JSON.parse(user.purchases) : 
                    (Array.isArray(user.purchases) ? user.purchases : []);
                
                purchases.forEach(order => {
                    allOrders.push({
                        ...order,
                        userName: user.name,
                        userId: user.id,
                        userPhone: user.phone,
                        userAddress: user.address,
                        userCity: user.city
                    });
                });
            } catch (e) {
                console.warn('שגיאה בפירוס purchases עבור משתמש:', user.id);
            }
        });

        // מיון לפי תאריך ולקיחת 10 ההזמנות האחרונות
        allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestOrders = allOrders.slice(0, 10);

        if (latestOrders.length === 0) {
            ordersList.innerHTML = '<p class="no-orders">אין הזמנות במערכת</p>';
            return;
        }

        let ordersHTML = `
            <div class="view-controls">
                <button onclick="loadLatestOrders()" class="active">הזמנות אחרונות</button>
                <button onclick="loadAllOrders()">כל ההזמנות</button>
                <button onclick="showUserOrdersList()">הזמנות לפי משתמשים</button>
            </div>
            <div class="orders-container">
        `;

        latestOrders.forEach((order, index) => {
            ordersHTML += `
                <div class="order-card" data-status="${order.status || 'בטיפול'}">
                    <div class="order-header">
                        <div class="order-top-row">
                            <div class="order-right-details">
                                <span class="customer-name">${order.userName}</span>
                            </div>
                            <div class="order-center-details">
                                <span class="order-id">הזמנה מס׳ ${index + 1}</span>
                                <span class="order-date">${new Date(order.date).toLocaleDateString('he-IL')}</span>
                                <span class="order-status">סטטוס: ${order.status || 'בטיפול'}</span>
                            </div>
                        </div>
                        <div class="order-bottom-row">
                            <div class="customer-details">
                                <div class="customer-phone">${order.userPhone}</div>
                                <div class="customer-address">${order.userCity}, ${order.userAddress}</div>
                            </div>
                            <div class="order-total">סה"כ לתשלום: ₪${order.total}</div>
                        </div>
                    </div>
                    <div class="order-items">
                        <div class="items-grid">
                            ${order.items.map(item => `
                                <div class="item-card" data-product="${item.name}">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">
                                        <span class="item-quantity">כמות: ${item.quantity}</span>
                                        <span class="item-price">₪${item.price} ליחידה</span>
                                    </div>
                                    <div class="item-total">סה"כ: ₪${item.price * item.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-actions">
                            <button onclick="editOrder('${order.userId}', ${order.orderId})" class="edit-btn">
                                ערוך הזמנה
                            </button>
                            <button onclick="cancelOrder('${order.userId}', ${order.orderId})" class="cancel-btn">
                                מחק הזמנה
                            </button>
                            ${order.status !== 'אושרה' ? `
                                <button onclick="approveOrder('${order.userId}', ${order.orderId})" class="approve-btn">
                                    אשר הזמנה
                                </button>
                            ` : ''}
                            <div class="total-summary">
                                <span class="total-amount">סה"כ לתשלום: ₪${order.total}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersHTML += '</div>';
        ordersList.innerHTML = ordersHTML;
    } catch (error) {
        console.error('שגיאה בטעינת ההזמנות:', error);
        document.getElementById('ordersList').innerHTML = '<p class="error">שגיאה בטעינת ההזמנות</p>';
    }
}

// פונקציה לטעינת כל ההזמנות
async function loadAllOrders() {
    try {
        // נביא את כל ההזמנות
        const ordersResponse = await fetch('/api/orders?sort=desc');
        const orders = await ordersResponse.json();
        
        // נביא את כל המשתמשים
        const usersResponse = await fetch('/api/users');
        const users = await usersResponse.json();
        const usersMap = new Map(users.map(user => [user.id, user]));

        // נביא את כל המוצרים
        const productsResponse = await fetch('/api/products');
        const products = await productsResponse.json();
        const productsMap = new Map(products.map(product => [product.id, product]));
        
        const ordersList = document.getElementById('ordersList');
        
        if (!Array.isArray(orders) || orders.length === 0) {
            ordersList.innerHTML = '<p class="no-orders">אין הזמנות במערכת</p>';
            return;
        }

        let ordersHTML = `
            <div class="view-controls">
                <button onclick="loadLatestOrders()">הזמנות אחרונות</button>
                <button onclick="loadAllOrders()" class="active">כל ההזמנות</button>
                <button onclick="showUserOrdersList()">הזמנות לפי משתמשים</button>
            </div>
            <div class="orders-container">
        `;

        // מיון ההזמנות לפי מספר הזמנה (מהגבוה לנמוך)
        orders.sort((a, b) => b.id - a.id);

        orders.forEach(order => {
            const user = usersMap.get(order.customerId);
            if (!user) {
                console.warn(`לא נמצא משתמש עבור הזמנה ${order.id}`);
                return;
            }

            // בדיקה אם items הוא כבר אובייקט או שצריך לפרסר אותו
            let orderItems;
            try {
                orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            } catch (e) {
                console.warn('שגיאה בפירוס items עבור הזמנה:', order.id);
                orderItems = [];
            }

            // הוספת פרטי המוצרים מהמוצרים המלאים
            const items = orderItems.map(item => {
                const product = productsMap.get(item.productId);
                if (!product) {
                    console.warn(`לא נמצא מוצר ${item.productId} בהזמנה ${order.id}`);
                    return null;
                }
                return {
                    ...item,
                    name: product.name,
                    price: product.price
                };
            }).filter(item => item !== null);

            ordersHTML += `
                <div class="order-card" data-status="${order.status}">
                    <div class="order-header">
                        <div class="order-top-row">
                            <div class="order-right-details">
                                <span class="customer-name">${user.name}</span>
                            </div>
                            <div class="order-center-details">
                                <span class="order-id">הזמנה מס׳ ${order.id}</span>
                                <span class="order-date">${new Date(order.orderDate).toLocaleDateString('he-IL')}</span>
                                <span class="order-status">סטטוס: ${order.status}</span>
                            </div>
                        </div>
                        <div class="order-bottom-row">
                            <div class="customer-details">
                                <div class="customer-phone">${user.phone}</div>
                                <div class="customer-address">${user.city}, ${user.address}</div>
                            </div>
                            <div class="order-total">סה"כ לתשלום: ₪${order.totalAmount}</div>
                        </div>
                    </div>
                    <div class="order-items">
                        <div class="items-grid">
                            ${items.map(item => `
                                <div class="item-card" data-product="${item.name}">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">
                                        <span class="item-quantity">כמות: ${item.quantity}</span>
                                        <span class="item-price">₪${item.price} ליחידה</span>
                                    </div>
                                    <div class="item-total">סה"כ: ₪${item.price * item.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-actions">
                            <button onclick="editOrder(${order.id})" class="edit-btn">
                                ערוך הזמנה
                            </button>
                            <button onclick="cancelOrder(${order.id})" class="cancel-btn">
                                מחק הזמנה
                            </button>
                            ${order.status !== 'אושרה' ? `
                                <button onclick="approveOrder(${order.id})" class="approve-btn">
                                    אשר הזמנה
                                </button>
                            ` : ''}
                            <div class="total-summary">
                                <span class="total-amount">סה"כ לתשלום: ₪${order.totalAmount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersHTML += '</div>';
        ordersList.innerHTML = ordersHTML;
    } catch (error) {
        console.error('שגיאה בטעינת ההזמנות:', error);
        document.getElementById('ordersList').innerHTML = '<p class="error">שגיאה בטעינת ההזמנות</p>';
    }
}

// הוספת הפונקציות לחלון הגלובלי
Object.assign(window, {
    loadOrders,
    loadAllOrders
});

// פונקציה לעדכון סטטוס הזמנה
async function updateOrderStatus(userId, orderId, newStatus) {
    try {
        const user = await getUserById(userId);
        if (!user) throw new Error('משתמש לא נמצא');

        // בדיקה אם purchases הוא מחרוזת או אובייקט
        const purchases = typeof user.purchases === 'string' ? 
            JSON.parse(user.purchases) : 
            (Array.isArray(user.purchases) ? user.purchases : []);

        const orderIndex = purchases.findIndex(order => order.orderId === orderId);
        
        if (orderIndex === -1) throw new Error('הזמנה לא נמצאה');

        purchases[orderIndex].status = newStatus;

        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                purchases: JSON.stringify(purchases)
            })
        });

        if (!response.ok) throw new Error('שגיאה בעדכון סטטוס ההזמנה');

        // רענון התצוגה
        loadOrders();
    } catch (error) {
        console.error('שגיאה בעדכון סטטוס ההזמנה:', error);
        alert('שגיאה בעדכון סטטוס ההזמנה');
    }
}

// הוספת הפונקציות לחלון הגלובלי
window.updateOrderStatus = updateOrderStatus;

// ... existing code ...

document.addEventListener('DOMContentLoaded', () => {
    // טעינת נתונים ראשונית
    loadLatestOrders(); // טעינת 10 ההזמנות האחרונות
    
    // הוספת מאזיני אירועים לכפתורי הניווט
    document.querySelectorAll('.main-nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const viewType = button.dataset.view;
            
            // הסרת הקלאס active מכל הכפתורים
            document.querySelectorAll('.main-nav-button').forEach(btn => 
                btn.classList.remove('active')
            );
            
            // הוספת הקלאס active לכפתור שנלחץ
            button.classList.add('active');
            
            // טעינת התוכן המתאים
            if (viewType === 'orders') {
                loadLatestOrders();
            }
        });
    });
});

// ... existing code ...

// פונקציה לקבלת המספר הבא בתור להזמנה
async function getNextOrderNumber() {
    try {
        const users = await UsersCache.get();
        let maxOrderId = 0;

        // עוברים על כל המשתמשים וההזמנות שלהם
        users.forEach(user => {
            try {
                const purchases = typeof user.purchases === 'string' ? 
                    JSON.parse(user.purchases) : 
                    (Array.isArray(user.purchases) ? user.purchases : []);
                
                purchases.forEach(order => {
                    const orderId = parseInt(order.orderId);
                    if (!isNaN(orderId) && orderId > maxOrderId) {
                        maxOrderId = orderId;
                    }
                });
            } catch (e) {
                console.warn('שגיאה בפירוס purchases עבור משתמש:', user.id);
            }
        });

        // מחזירים את המספר הבא
        return maxOrderId + 1;
    } catch (error) {
        console.error('שגיאה בקבלת מספר הזמנה הבא:', error);
        throw error;
    }
}

// פונקציה ליצירת הזמנה חדשה
async function createNewOrder(userId, items) {
    try {
        // נביא את המשתמש
        const userResponse = await fetch(`/api/users/${userId}`);
        const user = await userResponse.json();
        if (!user) throw new Error('משתמש לא נמצא');

        // נביא את כל ההזמנות כדי למצוא את המספר הבא
        const ordersResponse = await fetch('/api/orders');
        const orders = await ordersResponse.json();
        const nextOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;

        // חישוב הסכום הכולל
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // יצירת אובייקט ההזמנה
        const newOrder = {
            id: nextOrderId,
            customerId: userId,
            items: items.map(item => ({
                productId: item.id,
                quantity: item.quantity
            })),
            totalAmount: totalAmount,
            status: 'בטיפול',
            orderDate: new Date().toISOString()
        };

        // שמירת ההזמנה
        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newOrder)
        });

        if (!orderResponse.ok) throw new Error('שגיאה בשמירת ההזמנה');

        // עדכון החוב של המשתמש
        const newDebt = parseFloat(user.debt_balance || '0') + totalAmount;
        
        // עדכון המשתמש
        const userUpdateResponse = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                debt_balance: newDebt.toString()
            })
        });

        if (!userUpdateResponse.ok) throw new Error('שגיאה בעדכון חוב המשתמש');

        // רענון המטמון
        await UsersCache.refresh();

        return newOrder;
    } catch (error) {
        console.error('שגיאה ביצירת הזמנה חדשה:', error);
        throw error;
    }
}

// הוספת הפונקציות לחלון הגלובלי
Object.assign(window, {
    getNextOrderNumber,
    createNewOrder
});

// ... existing code ...

// פונקציה לקבלת המספר הבא בתור להזמנה
function getNextOrderNumber(allOrders) {
    if (!allOrders || allOrders.length === 0) return 1;
    const maxOrderId = Math.max(...allOrders.map(order => order.orderId || 0));
    return maxOrderId + 1;
}

// פונקציה לטעינת ההזמנות האחרונות
async function loadLatestOrders() {
    try {
        // נביא את 10 ההזמנות האחרונות
        const ordersResponse = await fetch('/api/orders?limit=10&sort=desc');
        const orders = await ordersResponse.json();
        
        // נביא את כל המשתמשים מהמטמון
        const users = await UsersCache.get();
        // יצירת מפה לפי שם משתמש
        const usersByName = new Map(users.map(user => [user.name, user]));
        // יצירת מפה לפי ID
        const usersById = new Map(users.map(user => [user.id.toString(), user]));

        // נביא את כל המוצרים
        const productsResponse = await fetch('/api/products');
        const products = await productsResponse.json();
        const productsMap = new Map(products.map(product => [(product.id || product.product_id).toString(), product]));
        
        const ordersList = document.getElementById('ordersList');
        if (!ordersList) {
            console.error('לא נמצא אלמנט להצגת ההזמנות');
            return;
        }
        
        if (!Array.isArray(orders) || orders.length === 0) {
            ordersList.innerHTML = '<p class="no-orders">אין הזמנות במערכת</p>';
            return;
        }

        let ordersHTML = `
            <div class="view-controls">
                <button onclick="loadLatestOrders()" class="active">הזמנות אחרונות</button>
                <button onclick="loadAllOrders()">כל ההזמנות</button>
                <button onclick="showUserOrdersList()">הזמנות לפי משתמשים</button>
            </div>
            <div class="orders-container">
        `;

        // מיון ההזמנות לפי מספר הזמנה (מהגבוה לנמוך)
        orders.sort((a, b) => b.id - a.id);

        orders.forEach(order => {
            if (!order) {
                console.warn('נמצאה הזמנה לא תקינה:', order);
                return;
            }

            // מציאת המשתמש לפי ID או לפי שם
            let user;
            if (order.customerId) {
                user = usersById.get(order.customerId.toString());
            } else if (order.customerName) {
                user = usersByName.get(order.customerName);
            }

            if (!user) {
                console.warn(`לא נמצא משתמש עבור הזמנה ${order.id} (שם: ${order.customerName}, ID: ${order.customerId})`);
                return;
            }

            // בדיקה אם items הוא כבר אובייקט או שצריך לפרסר אותו
            let orderItems;
            try {
                orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                if (!Array.isArray(orderItems)) {
                    console.warn('פורמט לא תקין של פריטים בהזמנה:', order.id, orderItems);
                    orderItems = [];
                }
            } catch (e) {
                console.warn('שגיאה בפירוס items עבור הזמנה:', order.id, e);
                orderItems = [];
            }

            // הוספת פרטי המוצרים מהמוצרים המלאים
            const items = orderItems.map(item => {
                if (!item) {
                    console.warn('נמצא פריט לא תקין בהזמנה:', order.id);
                    return null;
                }

                // המרה למחרוזת כדי להבטיח התאמה
                const productId = (item.productId || item.id || '').toString();
                if (!productId) {
                    console.warn('לא נמצא מזהה מוצר בפריט:', item, 'בהזמנה:', order.id);
                    return null;
                }

                const product = productsMap.get(productId);
                if (!product) {
                    console.warn(`לא נמצא מוצר ${productId} בהזמנה ${order.id}`);
                    return null;
                }

                return {
                    ...item,
                    name: product.name,
                    price: product.price
                };
            }).filter(item => item !== null);

            ordersHTML += `
                <div class="order-card" data-status="${order.status || 'בטיפול'}">
                    <div class="order-header">
                        <div class="order-top-row">
                            <div class="order-right-details">
                                <span class="customer-name">${user.name}</span>
                            </div>
                            <div class="order-center-details">
                                <span class="order-id">הזמנה מס׳ ${order.id}</span>
                                <span class="order-date">${new Date(order.orderDate).toLocaleDateString('he-IL')}</span>
                                <span class="order-status">סטטוס: ${order.status || 'בטיפול'}</span>
                            </div>
                        </div>
                        <div class="order-bottom-row">
                            <div class="customer-details">
                                <div class="customer-phone">${user.phone}</div>
                                <div class="customer-address">${user.city}, ${user.address}</div>
                            </div>
                            <div class="order-total">סה"כ לתשלום: ₪${order.totalAmount || 0}</div>
                        </div>
                    </div>
                    <div class="order-items">
                        <div class="items-grid">
                            ${items.map(item => `
                                <div class="item-card" data-product="${item.name}">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">
                                        <span class="item-quantity">כמות: ${item.quantity}</span>
                                        <span class="item-price">₪${item.price} ליחידה</span>
                                    </div>
                                    <div class="item-total">סה"כ: ₪${item.price * item.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-actions">
                            <button onclick="editOrder(${order.id})" class="edit-btn">
                                ערוך הזמנה
                            </button>
                            <button onclick="cancelOrder(${order.id})" class="cancel-btn">
                                מחק הזמנה
                            </button>
                            ${order.status !== 'אושרה' ? `
                                <button onclick="approveOrder(${order.id})" class="approve-btn">
                                    אשר הזמנה
                                </button>
                            ` : ''}
                            <div class="total-summary">
                                <span class="total-amount">סה"כ לתשלום: ₪${order.totalAmount || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersHTML += '</div>';
        ordersList.innerHTML = ordersHTML;
    } catch (error) {
        console.error('שגיאה בטעינת ההזמנות:', error);
        const ordersList = document.getElementById('ordersList');
        if (ordersList) {
            ordersList.innerHTML = '<p class="error">שגיאה בטעינת ההזמנות</p>';
        }
    }
}

// הוספת הפונקציות לחלון הגלובלי
window.loadLatestOrders = loadLatestOrders;

// ... existing code ...

// פונקציה להצגת הזמנות לפי משתמשים
async function showUserOrdersList() {
    try {
        const users = await UsersCache.get();
        const ordersResponse = await fetch('/api/orders');
        const orders = await ordersResponse.json();
        
        const ordersList = document.getElementById('ordersList');
        
        // קיבוץ הזמנות לפי משתמשים
        const userOrders = {};
        orders.forEach(order => {
            if (!userOrders[order.customerId]) {
                userOrders[order.customerId] = [];
            }
            userOrders[order.customerId].push(order);
        });
        
        let usersHTML = `
            <div class="view-controls">
                <button onclick="loadLatestOrders()">הזמנות אחרונות</button>
                <button onclick="loadAllOrders()">כל ההזמנות</button>
                <button onclick="showUserOrdersList()" class="active">הזמנות לפי משתמשים</button>
            </div>
            <div class="users-list">
        `;

        users.forEach(user => {
            const userOrdersCount = (userOrders[user.id] || []).length;
            if (userOrdersCount > 0) {
                usersHTML += `
                    <div class="user-row">
                        <div class="user-info">
                            <span>${user.name}</span>
                            <span>${user.phone}</span>
                            <span>מספר הזמנות: ${userOrdersCount}</span>
                        </div>
                        <button onclick="showUserOrders('${user.id}')" class="show-orders-btn">
                            הצג הזמנות
                        </button>
                    </div>
                `;
            }
        });

        usersHTML += '</div>';
        ordersList.innerHTML = usersHTML;
    } catch (error) {
        console.error('שגיאה בטעינת רשימת המשתמשים:', error);
        alert('שגיאה בטעינת רשימת המשתמשים: ' + error.message);
    }
}

// פונקציה לאישור הזמנה
async function approveOrder(orderId) {
    try {
        // נביא את המשתמש והזמנותיו
        const user = await getUserById(orderId);
        if (!user) throw new Error('משתמש לא נמצא');

        const purchases = typeof user.purchases === 'string' ? 
            JSON.parse(user.purchases) : 
            (Array.isArray(user.purchases) ? user.purchases : []);

        // מציאת ההזמנה
        const order = purchases.find(o => o.orderId === orderId);
        if (!order) throw new Error('הזמנה לא נמצאה');

        // עדכון סטטוס ההזמנה בטבלת orders
        const orderResponse = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...order,
                status: 'אושרה'
            })
        });

        if (!orderResponse.ok) {
            // אם אין טבלת orders, נעדכן רק את המשתמש
            console.warn('לא ניתן לעדכן את טבלת orders, מעדכן רק את המשתמש');
        }

        // עדכון סטטוס ההזמנה אצל המשתמש
        order.status = 'אושרה';
        
        // עדכון המשתמש
        const userResponse = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                purchases: JSON.stringify(purchases)
            })
        });

        if (!userResponse.ok) throw new Error('שגיאה בעדכון נתוני המשתמש');

        // רענון המטמון
        await UsersCache.refresh();
        
        // רענון התצוגה
        window.location.href = '/admin.html?view=orders';
    } catch (error) {
        console.error('שגיאה באישור ההזמנה:', error);
        alert('שגיאה באישור ההזמנה: ' + error.message);
    }
}

// פונקציה למחיקת הזמנה
async function cancelOrder(orderId) {
    try {
        if (!confirm('האם אתה בטוח שברצונך למחוק את ההזמנה?')) {
            return;
        }

        // נביא את ההזמנה
        const orderResponse = await fetch(`/api/orders/${orderId}`);
        const order = await orderResponse.json();
        if (!order) throw new Error('הזמנה לא נמצאה');

        // מחיקת ההזמנה
        const deleteResponse = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) throw new Error('שגיאה במחיקת ההזמנה');

        // רענון התצוגה
        await loadLatestOrders();
    } catch (error) {
        console.error('שגיאה במחיקת ההזמנה:', error);
        alert('שגיאה במחיקת ההזמנה: ' + error.message);
    }
}

// פונקציה לעריכת הזמנה
async function editOrder(orderId) {
    try {
        // נביא את המשתמש והזמנותיו
        const user = await getUserById(orderId);
        if (!user) throw new Error('משתמש לא נמצא');

        const purchases = typeof user.purchases === 'string' ? 
            JSON.parse(user.purchases) : 
            (Array.isArray(user.purchases) ? user.purchases : []);

        // מציאת ההזמנה
        const order = purchases.find(o => o.orderId === orderId);
        if (!order) throw new Error('הזמנה לא נמצאה');

        try {
            // ניסיון להביא את ההזמנה מטבלת orders
            const orderResponse = await fetch(`/api/orders/${orderId}`);
            if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                // אם יש הזמנה בטבלת orders, נשתמש בה
                order.items = orderData.items;
                order.total = orderData.totalAmount;
            }
        } catch (e) {
            // אם אין טבלת orders, נמשיך עם הנתונים מהמשתמש
            console.warn('לא ניתן להביא נתונים מטבלת orders, משתמש בנתונים מהמשתמש');
        }

        // נביא את רשימת המוצרים
        const productsResponse = await fetch('/api/products');
        if (!productsResponse.ok) throw new Error('שגיאה בטעינת המוצרים');
        const products = await productsResponse.json();

        // יצירת חלון מודאלי לעריכת ההזמנה
        const modal = document.createElement('div');
        modal.className = 'edit-order-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button onclick="closeEditModal()" class="close-btn">×</button>
                <h3>עריכת הזמנה #${orderId}</h3>
                
                <div class="current-items">
                    <h4>פריטים בהזמנה</h4>
                    ${order.items.map(item => `
                        <div class="item-row" data-item-id="${item.id}">
                            <span class="item-name">${item.name}</span>
                            <input type="number" value="${item.quantity}" min="1" 
                                   class="quantity-input"
                                   onchange="updateTempItemQuantity(this, '${item.id}')">
                            <button onclick="removeItemFromOrder(${orderId}, '${item.id}')"
                                    class="remove-btn">
                                הסר
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="add-items">
                    <h4>הוספת פריט חדש</h4>
                    <select id="newItemSelect">
                        <option value="" disabled selected>בחר פריט להוספה</option>
                        ${products.map(product => `
                            <option value="${product.id || product.product_id}">${product.name} - ₪${product.price}</option>
                        `).join('')}
                    </select>
                    <input type="number" id="newItemQuantity" value="1" min="1" placeholder="כמות">
                    <button onclick="addItemToOrder(${orderId})" class="add-btn">
                        הוסף פריט
                    </button>
                </div>

                <div class="modal-footer">
                    <button onclick="saveOrderChanges(${orderId})" class="save-btn">
                        שמור שינויים
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // שמירת המוצרים והמידע הזמני בחלון הגלובלי
        window.shopItems = products;
        window.tempOrderData = {
            items: [...order.items],
            total: order.total,
            userId: user.id
        };

    } catch (error) {
        console.error('שגיאה בעריכת ההזמנה:', error);
        alert('שגיאה בעריכת ההזמנה: ' + error.message);
    }
}

// פונקציה לעדכון זמני של כמות פריט
function updateTempItemQuantity(input, productId) {
    try {
        const quantity = parseInt(input.value);
        if (quantity < 1) {
            input.value = 1;
            return;
        }
        
        const itemIndex = window.tempOrderData.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (itemIndex !== -1) {
            window.tempOrderData.items[itemIndex].quantity = quantity;
            // עדכון הסכום הכולל
            window.tempOrderData.totalAmount = calculateOrderTotal(window.tempOrderData.items);
            
            // עדכון הצגת הסכום הכולל
            const totalElement = document.querySelector('.total-amount');
            if (totalElement) {
                totalElement.textContent = `סה"כ לתשלום: ₪${window.tempOrderData.totalAmount}`;
            }
        }
    } catch (error) {
        console.error('שגיאה בעדכון כמות:', error);
        alert('שגיאה בעדכון כמות: ' + error.message);
    }
}

// פונקציה לחישוב סכום ההזמנה
function calculateOrderTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// פונקציה לשמירת שינויים בהזמנה
async function saveOrderChanges(orderId) {
    try {
        const user = await getUserById(window.tempOrderData.userId);
        if (!user) throw new Error('משתמש לא נמצא');

        const purchases = typeof user.purchases === 'string' ? 
            JSON.parse(user.purchases) : 
            (Array.isArray(user.purchases) ? user.purchases : []);

        // מציאת ההזמנה
        const orderIndex = purchases.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) throw new Error('הזמנה לא נמצאה');

        // חישוב ההפרש בסכום
        const oldTotal = parseFloat(purchases[orderIndex].total);
        const newTotal = window.tempOrderData.total;
        const priceDifference = newTotal - oldTotal;

        // עדכון ההזמנה
        purchases[orderIndex].items = window.tempOrderData.items;
        purchases[orderIndex].total = newTotal;

        try {
            // ניסיון לעדכן בטבלת orders
            await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...purchases[orderIndex],
                    totalAmount: newTotal
                })
            });
        } catch (e) {
            // אם אין טבלת orders, נמשיך בלעדיה
            console.warn('לא ניתן לעדכן בטבלת orders, ממשיך עם עדכון המשתמש');
        }

        // עדכון החוב של המשתמש
        const currentDebt = parseFloat(user.debt_balance || '0');
        const newDebt = Math.max(0, currentDebt + priceDifference);

        // עדכון המשתמש
        const userResponse = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user,
                purchases: JSON.stringify(purchases),
                debt_balance: newDebt.toString()
            })
        });

        if (!userResponse.ok) throw new Error('שגיאה בעדכון נתוני המשתמש');

        // סגירת החלון ורענון התצוגה
        closeEditModal();
        
        // רענון המטמון
        await UsersCache.refresh();
        
        // מעבר לדף ההזמנות
        window.location.href = '/admin.html?view=orders';

    } catch (error) {
        console.error('שגיאה בשמירת השינויים:', error);
        alert('שגיאה בשמירת השינויים: ' + error.message);
    }
}

// פונקציה להסרת פריט מההזמנה
async function removeItemFromOrder(orderId, productId) {
    try {
        const itemIndex = window.tempOrderData.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (itemIndex === -1) throw new Error(`פריט לא נמצא (ID: ${productId})`);

        // הסרת הפריט מהנתונים הזמניים
        window.tempOrderData.items.splice(itemIndex, 1);
        
        // עדכון הסכום הכולל
        window.tempOrderData.totalAmount = calculateOrderTotal(window.tempOrderData.items);

        // רענון התצוגה של כל הפריטים
        const currentItems = document.querySelector('.current-items');
        currentItems.innerHTML = `
            <h4>פריטים בהזמנה</h4>
            ${window.tempOrderData.items.map(item => `
                <div class="item-row" data-item-id="${item.productId}">
                    <span class="item-name">${item.name}</span>
                    <input type="number" value="${item.quantity}" min="1" 
                           class="quantity-input"
                           onchange="updateTempItemQuantity(this, '${item.productId}')">
                    <button onclick="removeItemFromOrder(${orderId}, '${item.productId}')"
                            class="remove-btn">
                        הסר
                    </button>
                </div>
            `).join('')}
        `;

        // הצגת הסכום המעודכן
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) {
            totalElement.textContent = `סה"כ לתשלום: ₪${window.tempOrderData.totalAmount}`;
        }

    } catch (error) {
        console.error('שגיאה בהסרת פריט מההזמנה:', error);
        alert('שגיאה בהסרת פריט מההזמנה: ' + error.message);
    }
}

// פונקציה להוספת פריט להזמנה
async function addItemToOrder(orderId) {
    try {
        const itemSelect = document.getElementById('newItemSelect');
        const quantityInput = document.getElementById('newItemQuantity');
        
        if (!itemSelect.value) throw new Error('נא לבחור פריט');

        const selectedItem = window.shopItems.find(item => 
            (item.id && item.id.toString() === itemSelect.value) || 
            (item.product_id && item.product_id.toString() === itemSelect.value)
        );

        if (!selectedItem) throw new Error(`פריט לא נמצא (מזהה: ${itemSelect.value})`);

        const quantity = parseInt(quantityInput.value);
        if (isNaN(quantity) || quantity < 1) throw new Error('כמות לא תקינה');

        // בדיקה אם הפריט כבר קיים
        const existingItemIndex = window.tempOrderData.items.findIndex(item => 
            item.productId.toString() === (selectedItem.id || selectedItem.product_id).toString()
        );

        if (existingItemIndex !== -1) {
            // עדכון כמות אם הפריט כבר קיים
            window.tempOrderData.items[existingItemIndex].quantity += quantity;
        } else {
            // הוספת פריט חדש
            window.tempOrderData.items.push({
                productId: selectedItem.id || selectedItem.product_id,
                name: selectedItem.name,
                price: selectedItem.price,
                quantity: quantity
            });
        }

        // עדכון הסכום הכולל
        window.tempOrderData.totalAmount = calculateOrderTotal(window.tempOrderData.items);

        // רענון התצוגה של הפריטים
        const currentItems = document.querySelector('.current-items');
        currentItems.innerHTML = `
            <h4>פריטים בהזמנה</h4>
            ${window.tempOrderData.items.map(item => `
                <div class="item-row" data-item-id="${item.productId}">
                    <span class="item-name">${item.name}</span>
                    <input type="number" value="${item.quantity}" min="1" 
                           class="quantity-input"
                           onchange="updateTempItemQuantity(this, '${item.productId}')">
                    <button onclick="removeItemFromOrder(${orderId}, '${item.productId}')"
                            class="remove-btn">
                        הסר
                    </button>
                </div>
            `).join('')}
        `;

        // עדכון הצגת הסכום הכולל
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) {
            totalElement.textContent = `סה"כ לתשלום: ₪${window.tempOrderData.totalAmount}`;
        }

        // איפוס השדות
        itemSelect.value = '';
        quantityInput.value = '1';

    } catch (error) {
        console.error('שגיאה בהוספת פריט להזמנה:', error);
        alert('שגיאה בהוספת פריט להזמנה: ' + error.message);
    }
}

// פונקציה לעדכון כמות פריט
async function updateItemQuantity(input, itemId) {
    const quantity = parseInt(input.value);
    if (quantity < 1) {
        input.value = 1;
        return;
    }
    
    // הלוגיקה של עדכון הכמות תתבצע בעת שמירת השינויים
}

// הוספת הפונקציות החדשות לחלון הגלובלי
Object.assign(window, {
    getUserById,
    showUserOrders,
    removeItemFromOrder,
    addItemToOrder,
    updateItemQuantity
});

// ... existing code ...

// פונקציה לקבלת פרטי משתמש לפי ID
async function getUserById(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('שגיאה בקבלת פרטי משתמש');
        }
        return await response.json();
    } catch (error) {
        console.error('שגיאה בקבלת פרטי משתמש:', error);
        throw error;
    }
}

// פונקציה לסגירת חלון העריכה
function closeEditModal() {
    const modal = document.querySelector('.edit-order-modal');
    if (modal) modal.remove();
}

// הוספת הפונקציות לחלון הגלובלי
Object.assign(window, {
    getUserById,
    closeEditModal,
    editOrder,
    addItemToOrder,
    removeItemFromOrder,
    updateTempItemQuantity,
    saveOrderChanges,
    calculateOrderTotal
});

// ... existing code ...

// פונקציה להצגת הזמנות של משתמש ספציפי
async function showUserOrders(userId) {
    try {
        const ordersResponse = await fetch(`/api/orders?customerId=${userId}`);
        const orders = await ordersResponse.json();
        
        const user = await getUserById(userId);
        if (!user) throw new Error('משתמש לא נמצא');

        const ordersList = document.getElementById('ordersList');

        let ordersHTML = `
            <div class="view-controls">
                <button onclick="loadLatestOrders()">הזמנות אחרונות</button>
                <button onclick="loadAllOrders()">כל ההזמנות</button>
                <button onclick="showUserOrdersList()">הזמנות לפי משתמשים</button>
            </div>
            <div class="user-details-header">
                <h3>הזמנות של ${user.name}</h3>
                <div class="user-contact">
                    <span>טלפון: ${user.phone}</span>
                    <span>כתובת: ${user.city}, ${user.address}</span>
                    <span>חוב נוכחי: ₪${user.debt_balance || '0'}</span>
                </div>
            </div>
            <div class="orders-container">
        `;

        if (!Array.isArray(orders) || orders.length === 0) {
            ordersHTML += '<p class="no-orders">אין הזמנות למשתמש זה</p></div>';
            ordersList.innerHTML = ordersHTML;
            return;
        }

        // מיון ההזמנות לפי מספר הזמנה (מהגבוה לנמוך)
        orders.sort((a, b) => b.id - a.id);

        orders.forEach(order => {
            // בדיקה אם items הוא כבר אובייקט או שצריך לפרסר אותו
            let items;
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            } catch (e) {
                console.warn('שגיאה בפירוס items עבור הזמנה:', order.id);
                items = [];
            }

            ordersHTML += `
                <div class="order-card" data-status="${order.status}">
                    <div class="order-header">
                        <div class="order-top-row">
                            <div class="order-center-details">
                                <span class="order-id">הזמנה מס׳ ${order.id}</span>
                                <span class="order-date">${new Date(order.orderDate).toLocaleDateString('he-IL')}</span>
                                <span class="order-status">סטטוס: ${order.status}</span>
                            </div>
                        </div>
                    </div>
                    <div class="order-items">
                        <div class="items-grid">
                            ${items.map(item => `
                                <div class="item-card" data-product="${item.name}">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-details">
                                        <span class="item-quantity">כמות: ${item.quantity}</span>
                                        <span class="item-price">₪${item.price} ליחידה</span>
                                    </div>
                                    <div class="item-total">סה"כ: ₪${item.price * item.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="order-footer">
                        <div class="order-actions">
                            <button onclick="editOrder(${order.id})" class="edit-btn">
                                ערוך הזמנה
                            </button>
                            <button onclick="cancelOrder(${order.id})" class="cancel-btn">
                                מחק הזמנה
                            </button>
                            ${order.status !== 'אושרה' ? `
                                <button onclick="approveOrder(${order.id})" class="approve-btn">
                                    אשר הזמנה
                                </button>
                            ` : ''}
                            <div class="total-summary">
                                <span class="total-amount">סה"כ לתשלום: ₪${order.totalAmount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        ordersHTML += '</div>';
        ordersList.innerHTML = ordersHTML;
    } catch (error) {
        console.error('שגיאה בטעינת הזמנות המשתמש:', error);
        alert('שגיאה בטעינת הזמנות המשתמש: ' + error.message);
    }
}

// הוספת הפונקציות לחלון הגלובלי
Object.assign(window, {
    showUserOrdersList,
    showUserOrders
});

// פונקציה להצגת חלונית בחירת מיקום
window.showPositionSelector = async function(button, direction) {
    const city = document.querySelector('select[name="city"]').value;
    if (!city) {
        showErrorMessage('יש לבחור עיר תחילה');
        return;
    }

    try {
        const users = await UsersCache.get();
        // מיון המשתמשים לפי מיקום מהנמוך לגבוה
        const cityUsers = users
            .filter(u => u.city === city)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        
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
            z-index: 10000;
            padding: 20px;
            direction: rtl;
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

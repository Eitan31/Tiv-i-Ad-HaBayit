import { Product, shopItems } from "./product.js";

// פונקציה להוספת כפתורי ניווט - משותפת לכל הדפים
export function addNavigationButtons() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // הסרת כפתורי ניווט קיימים אם יש
    const existingNavButtons = navbar.querySelector('.nav-buttons');
    if (existingNavButtons) {
        existingNavButtons.remove();
    }

    // הסרת כפתורי התחברות ישנים אם קיימים
    const existingAuthButtons = navbar.querySelector('.auth-buttons');
    if (existingAuthButtons) {
        existingAuthButtons.remove();
    }

    // בדיקה אם המשתמש מחובר
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    
    const navButtons = document.createElement('div');
    navButtons.className = 'nav-buttons';

    if (!loggedInUser) {
        // כפתורי התחברות והרשמה
        const loginBtn = document.createElement('button');
        loginBtn.className = 'auth-btn login-btn';
        loginBtn.textContent = 'התחברות';
        loginBtn.addEventListener('click', () => window.location.href = 'login.html');

        const registerBtn = document.createElement('button');
        registerBtn.className = 'auth-btn register-btn';
        registerBtn.textContent = 'הרשמה';
        registerBtn.addEventListener('click', () => window.location.href = 'register.html');

        navButtons.appendChild(loginBtn);
        navButtons.appendChild(registerBtn);
    } else {
        // תפריט משתמש מחובר
        const userMenuBtn = document.createElement('div');
        userMenuBtn.className = 'user-menu-dropdown';
        
        const userBtn = document.createElement('button');
        userBtn.className = 'user-menu-btn';
        userBtn.textContent = `שלום ${loggedInUser.name}`;
        
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'dropdown-content';

        // הוספת פרטי המשתמש
        const userDetails = document.createElement('div');
        userDetails.className = 'user-details';
        userDetails.innerHTML = `
            <div class="user-info">
                <p><strong>שם:</strong> ${loggedInUser.name}</p>
                <p><strong>טלפון:</strong> ${loggedInUser.phone}</p>
                <p><strong>כתובת:</strong> ${loggedInUser.address}</p>
            </div>
            <button class="edit-details-btn">ערוך פרטים</button>
        `;

        // הוספת טופס עריכה (מוסתר כברירת מחדל)
        const editForm = document.createElement('form');
        editForm.className = 'edit-user-form hidden';
        editForm.innerHTML = `
            <div class="form-group">
                <label for="name">שם:</label>
                <input type="text" id="name" name="name" value="${loggedInUser.name || ''}" required>
            </div>
            <div class="form-group">
                <label for="phone">טלפון:</label>
                <input type="tel" id="phone" name="phone" value="${loggedInUser.phone || ''}" required>
            </div>
            <div class="form-group">
                <label for="address">כתובת:</label>
                <input type="text" id="address" name="address" value="${loggedInUser.address || ''}" required>
            </div>
            <div class="form-group">
                <label for="password">סיסמה חדשה:</label>
                <input type="password" id="password" name="password">
            </div>
            <div class="form-actions">
                <button type="submit" class="save-btn">שמור</button>
                <button type="button" class="cancel-btn">ביטול</button>
            </div>
        `;

        // הוספת אירועים לטופס
        editForm.addEventListener('submit', handleUserEditFormSubmit);
        userDetails.querySelector('.edit-details-btn').addEventListener('click', () => {
            userDetails.classList.add('hidden');
            editForm.classList.remove('hidden');
        });
        editForm.querySelector('.cancel-btn').addEventListener('click', () => {
            editForm.classList.add('hidden');
            userDetails.classList.remove('hidden');
        });

        dropdownContent.appendChild(userDetails);
        dropdownContent.appendChild(editForm);
        
        // כפתור היסטוריית הזמנות
        const ordersBtn = document.createElement('button');
        ordersBtn.className = 'dropdown-item';
        ordersBtn.textContent = 'היסטוריית הזמנות';
        ordersBtn.addEventListener('click', () => window.location.href = 'orders.html');
        
        // הוספת כפתור ניהול רק למנהלים
        if (loggedInUser.isAdmin) {
            const manageBtn = document.createElement('button');
            manageBtn.className = 'dropdown-item';
            manageBtn.textContent = 'ניהול';
            manageBtn.addEventListener('click', () => window.location.href = 'admin.html');
            dropdownContent.appendChild(manageBtn);
        }
        
        // כפתור התנתקות
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'dropdown-item';
        logoutBtn.textContent = 'התנתק';
        logoutBtn.addEventListener('click', handleLogout);
        
        dropdownContent.appendChild(ordersBtn);
        dropdownContent.appendChild(logoutBtn);
        
        userMenuBtn.appendChild(userBtn);
        userMenuBtn.appendChild(dropdownContent);
        navButtons.appendChild(userMenuBtn);
    }

    // הוספת הכפתורים לנאבבר
    const logoAndAuth = navbar.querySelector('.logo-and-auth');
    if (logoAndAuth) {
        logoAndAuth.insertAdjacentElement('afterend', navButtons);
    }
}

// פונקציית התנתקות גלובלית
window.handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('currentUser');
    // הסתרת כפתורי הניווט
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons) {
        navButtons.remove();
    }
    // הצגת כפתורי ההתחברות
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.style.display = 'flex';
    }
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', function() {
  let shop = document.getElementById('shop');
  let basket = JSON.parse(localStorage.getItem("data")) || [];
  const basketMap = new Map(basket.map(item => [item.id, item]));
  let isLoading = false;

  // הוספת מטמון למוצרים
  const CACHE_KEY = 'products_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 דקות

  // פונקציות עדכון הסל
  window.increment = (id) => {
    id = id.toString();
    let selectedItem = basketMap.get(id);

    if (!selectedItem) {
      selectedItem = { id, item: 1 };
      basketMap.set(id, selectedItem);
      basket.push(selectedItem);
    } else {
      selectedItem.item += 1;
    }

    updateBasket();
  };

  window.decrement = (id) => {
    id = id.toString();
    let selectedItem = basketMap.get(id);

    if (!selectedItem || selectedItem.item === 0) {
      basketMap.delete(id);
      basket = basket.filter(x => x.id !== id);
      updateBasket();
      return;
    }

    selectedItem.item -= 1;
    if (selectedItem.item === 0) {
      basketMap.delete(id);
      basket = basket.filter(x => x.id !== id);
    }

    updateBasket();
  };

  function updateBasket() {
    localStorage.setItem("data", JSON.stringify(basket));
    updateQuantityDisplay();
  }

  function updateQuantityDisplay() {
    // קודם נאפס את כל התצוגות
    document.querySelectorAll('.quantity').forEach(display => {
      display.textContent = '0';
    });

    // עכשיו נעדכן רק את המוצרים שבסל
    basketMap.forEach((item, id) => {
      const quantityDisplay = document.getElementById(id);
      if (quantityDisplay) {
        quantityDisplay.textContent = item.item;
      }
    });
    calculation();
  }

  function calculation() {
    const cartIcon = document.getElementById("cartAmount");
    if (cartIcon) {
      const total = Array.from(basketMap.values())
        .reduce((sum, item) => sum + item.item, 0);
      cartIcon.textContent = total;
    }
  }

  // פונקציה לטעינת מוצרים עם debounce
  async function fetchProducts() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { timestamp, products } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return products;
      }
    }

    try {
      const products = await Product.fetchProductsFromServer();
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        products
      }));
      return products;
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  }

  const debouncedFetch = debounce(async () => {
    if (isLoading) return;
    isLoading = true;

    try {
      const products = await fetchProducts();
      shopItems.length = 0;
      products.forEach(product => Product.addProductToShopItems(product));
      if (shop) {
        await generateShop();
        updateQuantityDisplay();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      isLoading = false;
    }
  }, 300);

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async function generateShop() {
    if (!shop) return;

    const fragment = document.createDocumentFragment();
    
    shopItems.forEach((x) => {
      const { id, name, price, description, img, shelfLife, storage, volume } = x;
      const search = basketMap.get(id) || { item: 0 };
      
      const itemDiv = document.createElement('div');
      itemDiv.id = `product-id-${id}`;
      itemDiv.className = 'item';
      itemDiv.style.position = 'relative';
      
      itemDiv.innerHTML = `
        <img width="235" src="${img || '/images/default.jpg'}" alt="${name}">
        <div class="info-icon" data-id="${id}" style="text-align: center; margin: 10px 0;">
          <i class="bi bi-info-circle"></i>
          <div class="info-content">
            <p><strong>תוקף:</strong> ${shelfLife || '-'}</p>
            <p><strong>אחסון:</strong> ${storage || '-'}</p>
            <p><strong>כמות:</strong> ${volume || '-'}</p>
          </div>
        </div>
        <div class="details">
          <h3>${name}</h3>
          <p>${description || 'אין תיאור זמין'}</p>
          <div class="price">
            <h2>${price}₪</h2>
            <div class="buttons">
              <i class="bi bi-plus-lg increment" data-id="${id}"></i>
              <div id="${id}" class="quantity">${search.item}</div>
              <i class="bi bi-dash-lg decrement" data-id="${id}"></i>
            </div>
          </div>
        </div>
      `;
      
      fragment.appendChild(itemDiv);
    });

    shop.innerHTML = '';
    shop.appendChild(fragment);
  updateQuantityDisplay();
  }

  // Event Delegation משופר
  shop?.addEventListener('click', (e) => {
    const target = e.target;
    
    if (target.classList.contains('increment')) {
      increment(target.dataset.id);
    } else if (target.classList.contains('decrement')) {
      decrement(target.dataset.id);
    } else if (target.closest('.info-icon')) {
      const content = target.closest('.info-icon').querySelector('.info-content');
      if (content) {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      }
    }
  });

  // אתחול ראשוני
  debouncedFetch();
  calculation(); // עדכון ראשוני של כמות בעגלה

  addNavigationButtons(); // קריאה לפונקציה בטעינת הדף
});

// פונקציות עריכת משתמש
function showUserEditForm() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) return;

    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    
    const form = document.createElement('form');
    form.className = 'edit-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="name">שם:</label>
            <input type="text" id="name" name="name" value="${loggedInUser.name || ''}" required>
        </div>
        <div class="form-group">
            <label for="phone">טלפון:</label>
            <input type="tel" id="phone" name="phone" value="${loggedInUser.phone || ''}" required>
        </div>
        
        <div class="form-group">
            <label for="address">כתובת:</label>
            <input type="text" id="address" name="address" value="${loggedInUser.address || ''}" required>
        </div>

        <div class="form-group">
            <label for="password">סיסמה חדשה:</label>
            <input type="password" id="password" name="password">
        </div>
        <div class="form-actions">
            <button type="submit" class="save-button">שמור שינויים</button>
            <button type="button" class="cancel-button">ביטול</button>
        </div>
    `;

    modal.appendChild(form);

    // הוספת אירועים
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUserEditFormSubmit(form);
    });

    form.querySelector('.cancel-button').addEventListener('click', () => {
        modal.remove();
    });

    document.body.appendChild(modal);
}

async function handleUserEditFormSubmit(form) {
    try {
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

        // אם לא הוזנה סיסמה חדשה, נשתמש בסיסמה הקיימת
        if (!userData.password) {
            delete userData.password;
        }

        const response = await fetch(`/api/users/${loggedInUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('שגיאה בעדכון פרטי משתמש');
        }

        const updatedUser = await response.json();
        
        // עדכון המשתמש בלוקל סטורג'
        localStorage.setItem('loggedInUser', JSON.stringify({
            ...loggedInUser,
            ...updatedUser
        }));

        // סגירת המודל
        const modal = document.querySelector('.edit-modal');
        if (modal) {
            modal.remove();
        }

        // הצגת הודעת הצלחה
        showSuccessMessage('הפרטים עודכנו בהצלחה');
    } catch (error) {
        console.error('שגיאה בשמירת פרטי משתמש:', error);
        showErrorMessage('שגיאה בעדכון הפרטים');
    }
}

function showSuccessMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

function showErrorMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'error-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

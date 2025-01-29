import { Product, shopItems } from "./product.js";

// פונקציה להוספת כפתורי ניווט - משותפת לכל הדפים
export function addNavigationButtons() {
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return; // אם אין כפתורי ניווט, נצא מהפונקציה
    
    const loggedInUser = JSON.parse(localStorage.getItem('user')) || 
                        JSON.parse(localStorage.getItem('currentUser')) || 
                        JSON.parse(localStorage.getItem('loggedInUser'));
    
    // הסרת כפתורים קיימים
    navButtons.innerHTML = '';
    
    if (loggedInUser) {
        // כפתורים למשתמש מחובר
        navButtons.innerHTML = `
            <button class="profile-btn">פרופיל</button>
            <button class="orders-btn">הזמנות</button>
            <button class="logout-btn">התנתק</button>
        `;
        
        // הוספת מאזיני אירועים לכפתורים
        const profileBtn = navButtons.querySelector('.profile-btn');
        const ordersBtn = navButtons.querySelector('.orders-btn');
        const logoutBtn = navButtons.querySelector('.logout-btn');
        
        if (profileBtn) profileBtn.addEventListener('click', handleProfile);
        if (ordersBtn) ordersBtn.addEventListener('click', handleOrders);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        // אם המשתמש הוא מנהל, נוסיף כפתור אדמין
        if (loggedInUser.isAdmin) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'admin-btn';
            adminBtn.textContent = 'ניהול';
            adminBtn.style.background = '#000000';
            adminBtn.addEventListener('click', () => window.location.href = 'admin.html');
            navButtons.appendChild(adminBtn);
        }
    } else {
        // כפתורים לאורח
        navButtons.innerHTML = `
            <button class="login-btn">התחבר</button>
            <button class="register-btn">הרשם</button>
        `;
        
        // הוספת מאזיני אירועים לכפתורים
        const loginBtn = navButtons.querySelector('.login-btn');
        const registerBtn = navButtons.querySelector('.register-btn');
        
        if (loginBtn) loginBtn.addEventListener('click', handleLogin);
        if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    }
}

// פונקציית התנתקות גלובלית
window.handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loggedInUser');
    // הוספת כפתורי ניווט מחדש
    addNavigationButtons();
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

  // עדכון basket ו-localStorage
  let updateCart = async () => {
    console.log('מתחיל updateCart עם העגלה:', basket);
    localStorage.setItem("data", JSON.stringify(basket));
    
    // עדכון התצוגה מיד
    calculation();
    
    // בדיקת משתמש מחובר (בודק גם user וגם currentUser וגם loggedInUser)
    const userData = localStorage.getItem("user");
    const currentUserData = localStorage.getItem("currentUser");
    const loggedInUserData = localStorage.getItem("loggedInUser");
    
    console.log('נתוני משתמש מ-localStorage:', { user: userData, currentUser: currentUserData, loggedInUser: loggedInUserData });
    
    let loggedInUser;
    try {
        if (userData) {
            loggedInUser = JSON.parse(userData);
        } else if (currentUserData) {
            const parsedData = JSON.parse(currentUserData);
            loggedInUser = parsedData.user || parsedData;
        } else if (loggedInUserData) {
            const parsedData = JSON.parse(loggedInUserData);
            loggedInUser = parsedData.user || parsedData;
        }
        
        if (!loggedInUser) {
            console.log('לא נמצא משתמש מחובר');
            return;
        }
        
        console.log('משתמש מחובר:', loggedInUser);
        
        if (!loggedInUser.id) {
            console.log('למשתמש אין ID');
            return;
        }
        
        console.log('מנסה לעדכן עגלה עבור משתמש:', loggedInUser.id);
        
        const response = await fetch(`/api/users/${loggedInUser.id}`);
        if (!response.ok) throw new Error('שגיאה בקבלת פרטי משתמש');
        const user = await response.json();
        console.log('פרטי משתמש נוכחיים:', user);
        
        // שליחת העדכון לשרת
        const updateData = {
            name: user.name,
            phone: user.phone,
            address: user.address,
            city: user.city,
            position: user.position,
            notes: user.notes,
            admin_notes: user.admin_notes,
            password: user.password,
            code: user.code,
            debt_balance: user.debt_balance,
            cart: basket
        };
        
        console.log('שולח לשרת:', updateData);
        
        const updateResponse = await fetch(`/api/users/${loggedInUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('שגיאה מהשרת:', errorData);
            throw new Error(errorData.message || 'שגיאה בעדכון העגלה');
        }

        const updatedUserResponse = await updateResponse.json();
        console.log('תשובה מהשרת אחרי עדכון:', updatedUserResponse);
        
        // עדכון פרטי המשתמש בכל המקומות
        const updatedUserData = {
            ...loggedInUser,
            cart: basket
        };
        
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        localStorage.setItem("currentUser", JSON.stringify(updatedUserData));
        localStorage.setItem("loggedInUser", JSON.stringify(updatedUserData));
        console.log('עדכון local storage הושלם');
        
    } catch (error) {
        console.error('שגיאה בעדכון העגלה:', error);
    }
    
    // עדכון סופי של התצוגה
    calculation();
  };

  // Increment item quantity
  let increment = async (id) => {
    console.log('מתחיל increment עבור מוצר:', id);
    id = id.toString();
    let item = basketMap.get(id);
    
    if (!item) {
        item = { id, item: 1 };
        basketMap.set(id, item);
        basket.push(item);
        console.log('הוספת מוצר חדש לעגלה:', item);
    } else {
        item.item++;
        console.log('עדכון כמות למוצר קיים:', item);
    }
    
    // עדכון התצוגה מיד
    const quantityDisplay = document.getElementById(id);
    if (quantityDisplay) {
        quantityDisplay.textContent = item.item;
    }
    
    console.log('מצב העגלה לפני updateCart:', basket);
    await updateCart();
    
    // עדכון נוסף של התצוגה אחרי העדכון בשרת
    updateQuantityDisplay();
  };

  // Decrement item quantity
  let decrement = async (id) => {
    console.log('מתחיל decrement עבור מוצר:', id);
    id = id.toString();
    let item = basketMap.get(id);
    
    if (!item || item.item === 0) return;
    
    item.item--;
    console.log('הפחתת כמות למוצר:', item);
    
    // עדכון התצוגה מיד
    const quantityDisplay = document.getElementById(id);
    if (quantityDisplay) {
        quantityDisplay.textContent = item.item;
    }
    
    if (item.item === 0) {
        basketMap.delete(id);
        basket = basket.filter(x => x.id !== id);
        console.log('הסרת מוצר מהעגלה:', id);
    }
    
    console.log('מצב העגלה לפני updateCart:', basket);
    await updateCart();
    
    // עדכון נוסף של התצוגה אחרי העדכון בשרת
    updateQuantityDisplay();
  };

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

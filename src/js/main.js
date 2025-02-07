import { Product, shopItems } from "./product.js";

// משתנים גלובליים
window.basket = JSON.parse(localStorage.getItem("data")) || [];
let shop = document.getElementById('shop');
let isLoading = false;

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

// פונקציה לעדכון המחיר הכולל
function updateTotalPrice() {
    const totalPrice = window.basket.reduce((total, item) => {
        const product = shopItems.find(p => p.id === item.id);
        return total + (product ? product.price * item.item : 0);
    }, 0);

    const label = document.getElementById("label");
    if (!label) return;

    // בדיקה אם יש כבר את המבנה הנדרש
    let priceElement = label.querySelector('.total-price');
    let buttonsElement = label.querySelector('.checkout-buttons');

    // אם אין מבנה, ניצור אותו
    if (!priceElement || !buttonsElement) {
        label.innerHTML = `
            <h2 class="total-price">מחיר כולל: ${totalPrice}₪</h2>
            <div class="checkout-buttons">
                <button class="checkout" onclick="window.checkout()">בצע הזמנה</button>
                <button onclick="clearCart()" class="removeAll">הסרת כל הפריטים</button>
            </div>
        `;
    } else {
        // אם יש מבנה, נעדכן רק את המחיר
        priceElement.textContent = `מחיר כולל: ${totalPrice}₪`;
    }
}

// עדכון פונקציית calculation
function calculation() {
    const cartIcon = document.getElementById("cartAmount");
    if (cartIcon) {
        const total = window.basket.reduce((sum, item) => sum + (item.item || 0), 0);
        cartIcon.textContent = total;
    }
    updateTotalPrice();
}

document.addEventListener('DOMContentLoaded', function() {
  let shop = document.getElementById('shop');
  if (!shop) {
    console.log('לא נמצא אלמנט shop בדף הנוכחי');
    addNavigationButtons();
    return;
  }
  
  let basket = JSON.parse(localStorage.getItem("data")) || [];
  const basketMap = new Map(basket.map(item => [item.id, item]));
  let isLoading = false;

  // הוספת מטמון למוצרים
  const CACHE_KEY = 'products_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 דקות

  // עדכון העגלה
  let updateCart = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(localStorage.getItem('currentUser')) || 
                    JSON.parse(localStorage.getItem('loggedInUser'));
                    
        if (!user || !user.id) {
            console.log('לא נמצא משתמש מחובר');
            return;
        }

        console.log('מתחיל updateCart עם העגלה:', window.basket);
        
        // עדכון localStorage
        localStorage.setItem("data", JSON.stringify(window.basket));
        
        // הכנת העגלה לשליחה - וידוא שכל פריט מכיל את השדות הנדרשים
        const cartItems = window.basket.map(item => ({
            id: item.id,
            item: item.item || 1
        }));

        console.log('שולח לשרת:', cartItems);
        
        // עדכון העגלה בשרת
        const updateResponse = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: cartItems
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('שגיאה מהשרת:', errorData);
            throw new Error(errorData.error || 'שגיאה בעדכון העגלה');
        }

        const updatedUser = await updateResponse.json();
        console.log('תשובה מהשרת אחרי עדכון:', updatedUser);
        
        // עדכון ה-localStorage עם הנתונים החדשים
        const updatedUserData = {
            ...user,
            cart: cartItems
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUserData));
        
    } catch (error) {
        console.error('שגיאה בעדכון העגלה:', error);
        alert('אירעה שגיאה בעדכון העגלה. אנא נסה שוב מאוחר יותר.');
    }
};

  // Increment item quantity
  window.increment = async (id) => {
    console.log('מתחיל increment עבור מוצר:', id);
    id = id.toString();
    
    // מציאת המוצר בעגלה
    let itemIndex = window.basket.findIndex(x => x.id === id);
    
    if (itemIndex === -1) {
        // אם המוצר לא קיים בעגלה, נוסיף אותו
        window.basket.push({
            id: id,
            item: 1
        });
    } else {
        // אם המוצר קיים, נעדכן את הכמות
        window.basket[itemIndex].item += 1;
    }
    
    console.log('מצב העגלה אחרי increment:', window.basket);
    await updateCart();
    update(id);
  };

  // Decrement item quantity
  window.decrement = async (id) => {
    console.log('מתחיל decrement עבור מוצר:', id);
    id = id.toString();
    
    // מציאת המוצר בעגלה
    let itemIndex = window.basket.findIndex(x => x.id === id);
    
    if (itemIndex === -1) return; // אם המוצר לא קיים בעגלה, נצא
    
    // אם הכמות היא 1, נסיר את המוצר מהעגלה
    if (window.basket[itemIndex].item === 1) {
        window.basket = window.basket.filter(x => x.id !== id);
    } else {
        // אחרת, נפחית את הכמות ב-1
        window.basket[itemIndex].item -= 1;
    }
    
    console.log('מצב העגלה אחרי decrement:', window.basket);
    await updateCart();
    update(id);
  };

  // Update item quantity display
  window.update = (id) => {
    let search = window.basket.find((x) => x.id === id);
    const quantityElement = document.getElementById(id);
    if (quantityElement) {
        quantityElement.textContent = search ? search.item : 0;
    }

    // עדכון רק של המחיר הכולל בלי לגעת בכפתורים
    const totalPrice = window.basket.reduce((total, item) => {
        const product = shopItems.find(p => p.id === item.id);
        return total + (product ? product.price * item.item : 0);
    }, 0);

    const label = document.getElementById("label");
    if (label) {
        const priceElement = label.querySelector('h2');
        if (priceElement) {
            priceElement.textContent = `מחיר כולל: ${totalPrice}₪`;
        }
    }

    // עדכון כמות בסמל העגלה
    const cartIcon = document.getElementById("cartAmount");
    if (cartIcon) {
        const total = window.basket.reduce((sum, item) => sum + (item.item || 0), 0);
        cartIcon.textContent = total;
    }
};

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
      const response = await fetch("http://localhost:3000/api/products");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const products = await response.json();
      console.log('מוצרים מהשרת:', products);

      // שמירה במטמון
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
      products.forEach(product => {
        const item = {
          id: product.id.toString(),
          name: product.name,
          price: product.price,
          description: product.description || '',
          img: product.image || imgPath,
          category: product.category || "לא מסווג",
          volume: product.volume || "N/A",
          shelfLife: product.shelfLife || "לא ידוע",
          storage: product.storage || "N/A",
        };
        shopItems.push(item);
      });
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
        const search = window.basket.find(item => item.id === id) || { item: 0 };
        
        const itemDiv = document.createElement('div');
        itemDiv.id = `product-id-${id}`;
        itemDiv.className = 'item';
        itemDiv.style.position = 'relative';
        
        itemDiv.innerHTML = `
            <img width="235" src="${img || 'https://www.dropbox.com/scl/fi/2g3fexz0my5hraoo0qvnq/house.png?rlkey=4tr7zrib6i9o3uglvot4hcswt&raw=1'}" alt="${name}">
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
    updateTotalPrice();
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
  calculation();
  addNavigationButtons();
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

// פונקציה לעדכון תצוגת הכמויות
function updateQuantityDisplay() {
    // קודם נאפס את כל התצוגות
    document.querySelectorAll('.quantity').forEach(display => {
        display.textContent = '0';
    });

    // עכשיו נעדכן רק את המוצרים שבסל
    window.basket.forEach(item => {
        const quantityDisplay = document.getElementById(item.id);
        if (quantityDisplay) {
            quantityDisplay.textContent = item.item;
        }
    });
    calculation();
}

import { shopItems } from "./product.js";

let label = document.getElementById("label");
let shoppingCart = document.getElementById("shopping-cart");
// Load cart and user data from localStorage
let basket = JSON.parse(localStorage.getItem("data")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let imgPath = 'https://www.dropbox.com/scl/fi/2g3fexz0my5hraoo0qvnq/house.png?rlkey=4tr7zrib6i9o3uglvot4hcswt&raw=1';
let shopItemsMap = new Map();
let basketMap = new Map();

// הגדרת פונקציית checkout בתחילת הקובץ
window.checkout = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(localStorage.getItem('currentUser')) || 
                    JSON.parse(localStorage.getItem('loggedInUser'));
        
        if (!user || !user.id) {
            alert('נא להתחבר לפני ביצוע ההזמנה');
            return;
        }

        // יצירת אובייקט ההזמנה
        const orderData = {
            user_id: user.id,
            items: basket.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            })),
            total_amount: calculateTotal(),
            status: 'pending',
            customer_name: user.name,
            phone: user.phone,
            address: user.address
        };

        console.log('שולח הזמנה:', orderData);

        // שליחת ההזמנה לשרת
        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.text();
            console.error('תשובת שגיאה מהשרת:', errorData);
            throw new Error('שגיאה בשמירת ההזמנה בטבלת orders: ' + errorData);
        }

        const orderResult = await orderResponse.json();
        console.log('תשובה מהשרת:', orderResult); // לוג לבדיקה

        // קבלת פרטי המשתמש העדכניים
        const userResponse = await fetch(`/api/users/${user.id}`);
        if (!userResponse.ok) throw new Error('שגיאה בקבלת פרטי משתמש');
        const currentUser = await userResponse.json();
        console.log('פרטי משתמש נוכחיים:', currentUser);

        // הכנת ההזמנה להיסטוריית הרכישות של המשתמש
        let purchases = [];
        try {
            // אם purchases הוא string, ננסה לפענח אותו
            if (typeof currentUser.purchases === 'string' && currentUser.purchases) {
                purchases = JSON.parse(currentUser.purchases);
            } 
            // אם purchases הוא array, נשתמש בו ישירות
            else if (Array.isArray(currentUser.purchases)) {
                purchases = currentUser.purchases;
            }
        } catch (e) {
            console.log('שגיאה בפענוח purchases:', e);
            purchases = [];
        }

        console.log('purchases לפני הוספת ההזמנה החדשה:', purchases);

        // יצירת אובייקט ההזמנה החדשה
        const newPurchase = {
            orderId: orderResult.id,
            date: new Date().toISOString(),
            items: orderItems,
            totalAmount: totalAmount,
            status: 'חדשה',
            customerName: user.name,
            phone: user.phone,
            address: user.address
        };

        // הוספת ההזמנה החדשה למערך הרכישות
        if (!Array.isArray(purchases)) {
            purchases = [];
        }
        purchases.push(newPurchase);

        console.log('purchases אחרי הוספת ההזמנה החדשה:', purchases);

        // עדכון פרטי המשתמש עם הרכישה החדשה
        const updateData = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            address: user.address,
            city: user.city || '',
            position: user.position || '',
            notes: user.notes || '',
            admin_notes: user.admin_notes || '',
            password: user.password,
            code: user.code || '',
            debt_balance: user.debt_balance || 0,
            maps: user.maps || '',
            isAdmin: user.isAdmin || false,
            purchases: JSON.stringify(purchases)  // המרה ל-JSON string
        };

        console.log('מעדכן פרטי משתמש:', updateData);
        console.log('תוכן ה-purchases שנשלח:', purchases);

        const updateResponse = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.text();  // שינוי ל-text() כדי לראות את השגיאה המלאה
            console.error('תשובת שגיאה מהשרת בעדכון משתמש:', errorData);
            throw new Error('שגיאה בעדכון פרטי המשתמש: ' + errorData);
        }

        const updatedUser = await updateResponse.json();
        console.log('פרטי משתמש עודכנו:', updatedUser);

        // עדכון ה-localStorage
        const updatedUserData = {
            ...updatedUser,
            purchases: purchases,  // שמירת purchases כמערך ב-localStorage
            isAdmin: user.isAdmin  // שמירה על סטטוס המנהל
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUserData));

        // ניקוי העגלה
        basket = [];
        localStorage.setItem('basket', JSON.stringify(basket));
        localStorage.setItem('data', JSON.stringify([]));  // ניקוי גם של data
        
        // עדכון התצוגה
        displayCart();
        alert('ההזמנה בוצעה בהצלחה!');
        window.location.href = "index.html";  // מעבר לדף הבית אחרי ההזמנה

    } catch (error) {
        console.error('שגיאה בביצוע ההזמנה:', error);
        alert('אירעה שגיאה בביצוע ההזמנה. אנא נסה שוב מאוחר יותר.');
    }
};

// Update cart icon quantity
let calculation = () => {
    const cartIcon = document.getElementById("cartAmount");
    if (!cartIcon) return;
    
    const total = basket.reduce((sum, item) => sum + item.item, 0);
    cartIcon.textContent = total;
};

// Load products from JSON
async function loadProducts() {
    try {
        const response = await fetch("http://localhost:3000/api/products");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const products = await response.json();

        // ניקוי והכנת המפות
        shopItems.length = 0;
        shopItemsMap.clear();
        basketMap = new Map(basket.map(item => [item.id.toString(), item]));

        // עיבוד מוצרים בפעם אחת
        products.forEach(product => {
            const item = {
                id: product.id.toString(),
                name: product.name,
                price: product.price,
                desc: product.description || "תיאור חסר",
                img: product.image || imgPath,
                category: product.category || "לא מסווג",
                volume: product.volume || "N/A",
                shelfLife: product.shelfLife || "לא ידוע",
                storage: product.storage || "N/A",
            };
            shopItems.push(item);
            shopItemsMap.set(item.id, item);
        });

        generateCartItems();
        totalAmount();
        calculation();
    } catch (err) {
        console.error("Error loading products:", err);
    }
}

// Generate cart items UI
let generateCartItems = () => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const cartTitle = loggedInUser ? `סל הקניות של ${loggedInUser.name}` : 'סל הקניות';

    // יצירת כותרת בלבד
    label.innerHTML = `<div class="cart-title">${cartTitle}</div>`;

    if (basketMap.size === 0) {
        shoppingCart.innerHTML = "";
        label.innerHTML = `
            <h2>הסל ריק</h2>
            <a href="index.html">
                <button class="HomeBtn">חזרה למסך הבית</button>
            </a>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    
    for (const [id, basketItem] of basketMap) {
        const product = shopItemsMap.get(id);
        if (!product) continue;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="title-price-x">
                <h4 class="title-price">
                    <p>${product.name}</p>
                    <p class="cart-item-price">${product.price}₪</p>
                </h4>
                <img width="100" src="${product.img}" alt="${product.name}" />
                <div class="details">
                    <i onclick="removeItem('${id}')" class="bi bi-x-lg"></i>
                    <div class="buttons">
                        <i onclick="increment('${id}')" class="bi bi-plus-lg"></i>
                        <div id="${id}" class="quantity">${basketItem.item}</div>
                        <i onclick="decrement('${id}')" class="bi bi-dash-lg"></i>
                    </div>
                </div>
            </div>
            <div class="info-icon-cart" id="info-${id}">
                <i onclick="toggleProductInfo('${id}')" class="bi bi-info-circle"></i>
                <div class="info-content-cart" id="content-${id}">
                    <p><strong>תוקף:</strong> ${product.shelfLife}</p>
                    <p><strong>אחסון:</strong> ${product.storage}</p>
                    <p><strong>כמות:</strong> ${product.volume}</p>
                </div>
            </div>
            <div class="cart-item-total">
                <h3 data-id="${id}">${basketItem.item * product.price}₪</h3>
            </div>
        `;
        
        fragment.appendChild(cartItem);
    }

    shoppingCart.innerHTML = '';
    shoppingCart.appendChild(fragment);
};

// Attach event listeners to dynamic elements
let attachEventListeners = () => {
    document.querySelectorAll(".increment").forEach((btn) =>
        btn.addEventListener("click", (e) => increment(e.target.dataset.id))
    );

    document.querySelectorAll(".decrement").forEach((btn) =>
        btn.addEventListener("click", (e) => decrement(e.target.dataset.id))
    );

    document.querySelectorAll(".bi-x-lg").forEach((btn) =>
        btn.addEventListener("click", (e) => removeItem(e.target.dataset.id))
    );

    document.querySelectorAll(".bi-info-circle").forEach((btn) =>
        btn.addEventListener("click", (e) => toggleProductInfo(e.target.dataset.id))
    );
};

// Toggle product info
let toggleProductInfo = (id) => {
    let content = document.getElementById(`content-${id}`);
    if (content) {
        content.style.display = content.style.display === "block" ? "none" : "block";
    }
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
    
    console.log('מצב העגלה לפני updateCart:', basket);
    await updateCart();
};

// Decrement item quantity
let decrement = async (id) => {
    console.log('מתחיל decrement עבור מוצר:', id);
    id = id.toString();
    let item = basketMap.get(id);
    
    if (!item || item.item === 0) return;
    
    item.item--;
    console.log('הפחתת כמות למוצר:', item);
    
    if (item.item === 0) {
        basketMap.delete(id);
        basket = basket.filter(x => x.id !== id);
        console.log('הסרת מוצר מהעגלה:', id);
    }
    
    console.log('מצב העגלה לפני updateCart:', basket);
    await updateCart();
};

// Update quantity and UI       
// עדכון basket ו-localStorage
let updateCart = async () => {
    console.log('מתחיל updateCart עם העגלה:', basket);
    localStorage.setItem("data", JSON.stringify(basket));
    
    // בדיקת משתמש מחובר (בודק גם currentUser וגם loggedInUser)
    const currentUserData = localStorage.getItem("currentUser");
    const loggedInUserData = localStorage.getItem("loggedInUser");
    
    console.log('נתוני משתמש מ-localStorage:', { currentUser: currentUserData, loggedInUser: loggedInUserData });
    
    let loggedInUser;
    try {
        if (currentUserData) {
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
        console.log('תשובה מהשרת אחרי עדכון משתמש:', updatedUserResponse);
        
        // עדכון פרטי המשתמש בשני המקומות
        const updatedUserData = {
            ...loggedInUser,
            cart: basket
        };
        
        localStorage.setItem("currentUser", JSON.stringify(updatedUserData));
        localStorage.setItem("loggedInUser", JSON.stringify(updatedUserData));
        console.log('עדכון local storage הושלם');
        
    } catch (error) {
        console.error('שגיאה בעדכון העגלה:', error);
    }
    
    generateCartItems();
    calculation();
    totalAmount();
};

// Remove item
let removeItem = async (id) => {
    id = id.toString();
    basketMap.delete(id);
    basket = basket.filter(x => x.id !== id);
    await updateCart();
};

// Clear cart
let clearCart = async () => {
    basket = [];
    basketMap.clear();
    await updateCart();
};

// Calculate total amount
let totalAmount = () => {
    if (basketMap.size === 0) {
        // עדכון המחיר הצף כשהסל ריק
        const floatingPrice = document.getElementById('totalPriceFloating');
        if (floatingPrice) {
            floatingPrice.textContent = 'סה"כ: ₪0';
        }
        return;
    }

    const amount = Array.from(basketMap.entries()).reduce((total, [id, item]) => {
        const product = shopItemsMap.get(id);
        return total + (item.item * (product?.price || 0));
    }, 0);

    // עדכון המחיר הצף
    const floatingPrice = document.getElementById('totalPriceFloating');
    if (floatingPrice) {
        floatingPrice.textContent = `סה"כ: ₪${amount}`;
    }

    label.innerHTML += `
        <h2>מחיר כולל: ${amount}₪</h2>
        <div class="buttons-container">
            <button class="checkout" onclick="window.checkout()">בצע הזמנה</button>
            <button onclick="clearCart()" class="removeAll">הסרת כל הפריטים</button>
        </div>
    `;
};

// Export functions to window object
Object.assign(window, {
    increment,
    decrement,
    totalAmount,
    removeItem,
    checkout,
    calculation
});

// אתחול
loadProducts();

// קריאה לחישוב בטעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    calculation(); // חישוב ראשוני של כמות הפריטים
    addNavigationButtons(); // הוספת כפתורי ניווט
});

// פונקציית התנתקות
const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loggedInUser');
    // הוספת כפתורי ניווט מחדש
    addNavigationButtons();
    window.location.href = "index.html";
};

// הוספת כפתורי ניווט
function addNavigationButtons() {
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return; // אם אין כפתורי ניווט, נצא מהפונקציה
    
    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    
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

async function placeOrder() {
    try {
        const user = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(localStorage.getItem('currentUser')) || 
                    JSON.parse(localStorage.getItem('loggedInUser'));
        
        if (!user || !user.id) {
            alert('נא להתחבר לפני ביצוע ההזמנה');
            return;
        }

        // יצירת אובייקט ההזמנה
        const orderData = {
            user_id: user.id,
            items: basket.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            })),
            total_amount: calculateTotal(),
            status: 'pending',
            customer_name: user.name,
            phone: user.phone,
            address: user.address
        };

        console.log('שולח הזמנה:', orderData);

        // שליחת ההזמנה לשרת
        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.json();
            throw new Error(errorData.message || 'שגיאה בשמירת ההזמנה');
        }

        const order = await orderResponse.json();
        console.log('הזמנה נשמרה:', order);

        // עדכון פרטי המשתמש
        let purchases = user.purchases || [];
        if (typeof purchases === 'string') {
            try {
                purchases = JSON.parse(purchases);
            } catch (e) {
                purchases = [];
            }
        }
        if (!Array.isArray(purchases)) {
            purchases = [];
        }

        // הוספת ההזמנה לרשימת הרכישות
        purchases.push({
            orderId: order.id,
            date: new Date().toISOString(),
            items: orderData.items,
            total: orderData.total_amount,
            status: orderData.status
        });

        // עדכון פרטי המשתמש בשרת
        const updateData = {
            ...user,
            purchases: purchases,
            cart: []  // ניקוי העגלה
        };

        console.log('מעדכן פרטי משתמש:', updateData);

        const updateResponse = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

    cartHTML += `</div>
        <div class="cart-summary">
            <h3>סיכום הזמנה</h3>
            <p>סה"כ לתשלום: ₪${total}</p>
            <button onclick="checkout()" class="checkout-btn">לתשלום</button>
        </div>`;

    cartContainer.innerHTML = cartHTML;
}

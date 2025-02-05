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

        // עיבוד פריטי העגלה
        const orderItems = processCartItems(basket, shopItemsMap);
        if (orderItems.length === 0) {
            throw new Error('העגלה ריקה');
        }

        const totalAmount = calculateTotalAmount(orderItems);
        if (!totalAmount || totalAmount <= 0) {
            throw new Error('סכום ההזמנה אינו תקין');
        }

        const orderData = {
            customerId: user.id,
            items: orderItems,
            totalAmount: totalAmount
        };

        console.log('שולח הזמנה:', orderData);
        const response = await submitOrder(orderData);
        console.log('הזמנה נשמרה:', response);

        // ניקוי העגלה
        await clearCart();
        
        alert('ההזמנה בוצעה בהצלחה!');
        
        // נחכה 3 שניות לפני רענון הדף
        setTimeout(() => {
            window.location.reload();
        }, 3000);

    } catch (error) {
        console.error('שגיאה בביצוע ההזמנה:', error);
        alert('אירעה שגיאה בביצוע ההזמנה: ' + error.message);
    }
};

// פונקציה לעיבוד פריטי העגלה להזמנה
function processCartItems(basket, shopItemsMap) {
    return basket.map(item => {
        const product = shopItemsMap.get(item.id.toString());
        if (!product) {
            console.error('לא נמצא מוצר עם ID:', item.id);
            return null;
        }
        const quantity = item.item || item.quantity || 1;
        const total = product.price * quantity;
        
        return {
            id: item.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            total: total
        };
    }).filter(item => item !== null);
}

// פונקציה לחישוב סכום כולל של העגלה
function calculateTotalAmount(items) {
    return items.reduce((sum, item) => sum + item.total, 0);
}

// פונקציה לשליחת הזמנה לשרת
async function submitOrder(orderData) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'שגיאה בשמירת ההזמנה');
        }

        return await response.json();
    } catch (error) {
        console.error('שגיאה בשליחת ההזמנה:', error);
        throw error;
    }
}

// פונקציה לניקוי העגלה
async function clearCart() {
    try {
        basket = [];
        localStorage.setItem("data", JSON.stringify([]));
        
        const user = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(localStorage.getItem('currentUser')) || 
                    JSON.parse(localStorage.getItem('loggedInUser'));
                    
        if (user && user.id) {
            // עדכון העגלה בשרת
            const updateResponse = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart: []
                })
            });

            if (!updateResponse.ok) {
                throw new Error('שגיאה בניקוי העגלה בשרת');
            }

            // עדכון ה-localStorage
            const updatedUserData = {
                ...user,
                cart: []
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUserData));
            localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
            localStorage.setItem('loggedInUser', JSON.stringify(updatedUserData));
        }
        
        // עדכון התצוגה
        generateCartItems();
        calculation();
        totalAmount();
    } catch (error) {
        console.error('שגיאה בניקוי העגלה:', error);
        alert('אירעה שגיאה בניקוי העגלה. אנא נסה שוב מאוחר יותר.');
    }
}

// פונקציה לחישוב סה"כ העגלה
function calculateTotal() {
    let total = 0;
    for (let item of basket) {
        total += item.price * item.quantity;
    }
    return total;
}

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
        console.log('מוצרים מהשרת:', products);

        // ניקוי והכנת המפות
        shopItems.length = 0;
        shopItemsMap.clear();
        basketMap = new Map(basket.map(item => [item.id.toString(), item]));

        // עיבוד מוצרים בפעם אחת
        products.forEach(product => {
            console.log('מוצר גולמי מהשרת:', product);
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
            console.log('מוצר אחרי עיבוד עם תיאור:', item);
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

// פונקציה לעדכון תצוגת סל הקניות
function generateCartItems() {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const cartTitle = loggedInUser ? `סל הקניות של ${loggedInUser.name}` : 'סל הקניות';

    if (basket.length === 0) {
        shoppingCart.innerHTML = "";
        label.innerHTML = `
            <h2>הסל ריק</h2>
            <a href="index.html">
                <button class="HomeBtn">חזרה למסך הבית</button>
            </a>
        `;
        return;
    }

    // יצירת כותרת וכפתורים
    const totalPrice = basket.reduce((total, item) => {
        const product = shopItemsMap.get(item.id.toString());
        return total + (product ? product.price * item.item : 0);
    }, 0);

    label.innerHTML = `
        <div class="cart-title">${cartTitle}</div>
        <h2>מחיר כולל: ${totalPrice}₪</h2>
        <div class="checkout-buttons">
            <button class="checkout" onclick="window.checkout()">בצע הזמנה</button>
            <button onclick="clearCart()" class="removeAll">הסרת כל הפריטים</button>
        </div>
    `;

    // יצירת פריטי העגלה
    const fragment = document.createDocumentFragment();
    
    for (const item of basket) {
        const product = shopItemsMap.get(item.id.toString());
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
                    <i onclick="removeItem('${item.id}')" class="bi bi-x-lg"></i>
                    <div class="buttons">
                        <i onclick="increment('${item.id}')" class="bi bi-plus-lg"></i>
                        <div id="${item.id}" class="quantity">${item.item}</div>
                        <i onclick="decrement('${item.id}')" class="bi bi-dash-lg"></i>
                    </div>
                </div>
            </div>
            <div class="info-icon-cart" id="info-${item.id}">
                <i onclick="toggleProductInfo('${item.id}')" class="bi bi-info-circle"></i>
                <div class="info-content-cart" id="content-${item.id}">
                    <p><strong>תוקף:</strong> ${product.shelfLife}</p>
                    <p><strong>אחסון:</strong> ${product.storage}</p>
                    <p><strong>כמות:</strong> ${product.volume}</p>
                </div>
            </div>
            <div class="cart-item-total">
                <h3 data-id="${item.id}">${item.item * product.price}₪</h3>
            </div>
        `;
        
        fragment.appendChild(cartItem);
    }

    shoppingCart.innerHTML = '';
    shoppingCart.appendChild(fragment);

    // עדכון המחיר הכללי
    const totalPriceFloating = document.getElementById('totalPriceFloating');
    if (totalPriceFloating) {
        totalPriceFloating.textContent = `סה"כ: ₪${totalPrice}`;
    }
}

// Update quantity and UI
let update = (id) => {
    let search = basket.find((x) => x.id === id);
    document.getElementById(id).innerHTML = search ? search.item : 0;
    calculation();
    generateCartItems(); // קריאה לפונקציה המעודכנת
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
    
    // מציאת המוצר בעגלה
    let itemIndex = basket.findIndex(x => x.id === id);
    
    if (itemIndex === -1) {
        // אם המוצר לא קיים בעגלה, נוסיף אותו
        basket.push({
            id: id,
            item: 1
        });
    } else {
        // אם המוצר קיים, נעדכן את הכמות
        basket[itemIndex].item += 1;
    }
    
    console.log('מצב העגלה אחרי increment:', basket);
    await updateCart();
    generateCartItems();
    calculation();
};

// Decrement item quantity
let decrement = async (id) => {
    console.log('מתחיל decrement עבור מוצר:', id);
    id = id.toString();
    
    // מציאת המוצר בעגלה
    let itemIndex = basket.findIndex(x => x.id === id);
    
    if (itemIndex === -1) return; // אם המוצר לא קיים בעגלה, נצא
    
    // אם הכמות היא 1, נסיר את המוצר מהעגלה
    if (basket[itemIndex].item === 1) {
        basket = basket.filter(x => x.id !== id);
    } else {
        // אחרת, נפחית את הכמות ב-1
        basket[itemIndex].item -= 1;
    }
    
    console.log('מצב העגלה אחרי decrement:', basket);
    await updateCart();
    generateCartItems();
    calculation();
};

// Update quantity and UI       
// עדכון basket ו-localStorage
let updateCart = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(localStorage.getItem('currentUser')) || 
                    JSON.parse(localStorage.getItem('loggedInUser'));
                    
        if (!user || !user.id) {
            console.log('לא נמצא משתמש מחובר');
            return;
        }

        console.log('מתחיל updateCart עם העגלה:', basket);
        
        // עדכון localStorage
        localStorage.setItem("data", JSON.stringify(basket));
        
        // הכנת העגלה לשליחה - וידוא שכל פריט מכיל את השדות הנדרשים
        const cartItems = basket.map(item => ({
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
        
        // עדכון התצוגה
        generateCartItems();
        calculation();
        
    } catch (error) {
        console.error('שגיאה בעדכון העגלה:', error);
        alert('אירעה שגיאה בעדכון העגלה. אנא נסה שוב מאוחר יותר.');
    }
};

// Remove item
let removeItem = async (id) => {
    id = id.toString();
    basket = basket.filter(x => x.id !== id);
    localStorage.setItem("data", JSON.stringify(basket));
    generateCartItems();
    calculation();
    totalAmount();
};

// Calculate total amount
let totalAmount = () => {
    if (basket.length === 0) {
        // עדכון המחיר הצף כשהסל ריק
        const floatingPrice = document.getElementById('totalPriceFloating');
        if (floatingPrice) {
            floatingPrice.textContent = 'סה"כ: ₪0';
        }
        return;
    }

    const amount = basket.reduce((total, item) => {
        const product = shopItemsMap.get(item.id.toString());
        return total + (product ? product.price * item.item : 0);
    }, 0);

    // עדכון המחיר הצף
    const floatingPrice = document.getElementById('totalPriceFloating');
    if (floatingPrice) {
        floatingPrice.textContent = `סה"כ: ₪${amount}`;
    }
};

// Export functions to window object
Object.assign(window, {
    increment,
    decrement,
    totalAmount,
    removeItem,
    checkout,
    calculation,
    clearCart
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

// פונקציה להצגת העגלה
function displayCart() {
    const cartContainer = document.querySelector('.cart-container');
    if (!cartContainer) return;

    if (!basket || basket.length === 0) {
        cartContainer.innerHTML = '<p>העגלה ריקה</p>';
        return;
    }

    let total = 0;
    let cartHTML = '<div class="cart-items">';
    
    basket.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartHTML += `
            <div class="cart-item">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p>מחיר: ₪${item.price}</p>
                    <p>כמות: ${item.quantity}</p>
                    <p>סה"כ: ₪${itemTotal}</p>
                </div>
                <div class="item-actions">
                    <button onclick="removeFromCart(${item.id})">הסר</button>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                </div>
            </div>
        `;
    });

    cartHTML += `</div>
        <div class="cart-summary">
            <h3>סיכום הזמנה</h3>
            <p>סה"כ לתשלום: ₪${total}</p>
            <button onclick="checkout()" class="checkout-btn">לתשלום</button>
        </div>`;

    cartContainer.innerHTML = cartHTML;
}

// פונקציה להסרת פריט מהעגלה
window.removeFromCart = (id) => {
    const index = basket.findIndex(item => item.id === id);
    if (index !== -1) {
        basket.splice(index, 1);
        localStorage.setItem("data", JSON.stringify(basket));
        displayCart();
    }
};

// פונקציה לעדכון כמות של פריט
window.updateQuantity = (id, newQuantity) => {
    if (newQuantity < 0) return;
    
    const item = basket.find(item => item.id === id);
    if (item) {
        item.quantity = newQuantity;
        if (item.quantity === 0) {
            removeFromCart(id);
        } else {
            localStorage.setItem("data", JSON.stringify(basket));
            displayCart();
        }
    }
};

// קריאה ראשונית להצגת העגלה
displayCart();

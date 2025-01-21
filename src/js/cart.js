import { shopItems } from "./product.js";

let label = document.getElementById("label");
let shoppingCart = document.getElementById("shopping-cart");
// Load cart and user data from localStorage
let basket = JSON.parse(localStorage.getItem("data")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let imgPath = 'https://www.dropbox.com/scl/fi/2g3fexz0my5hraoo0qvnq/house.png?rlkey=4tr7zrib6i9o3uglvot4hcswt&raw=1';
let shopItemsMap = new Map();
let basketMap = new Map();

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
let increment = (id) => {
    id = id.toString();
    let item = basketMap.get(id);
    
    if (!item) {
        item = { id, item: 1 };
        basketMap.set(id, item);
        basket.push(item);
    } else {
        item.item++;
    }
    
    updateCart();
};

// Decrement item quantity
let decrement = (id) => {
    id = id.toString();
    let item = basketMap.get(id);
    
    if (!item || item.item === 0) return;
    
    item.item--;
    if (item.item === 0) {
        basketMap.delete(id);
        basket = basket.filter(x => x.id !== id);
    }
    
    updateCart();
};

// Update quantity and UI
// עדכון basket ו-localStorage
let updateCart = () => {
    localStorage.setItem("data", JSON.stringify(basket));
    generateCartItems();
    calculation();
    totalAmount();
};

// Remove item
let removeItem = (id) => {
    id = id.toString();
    basketMap.delete(id);
    basket = basket.filter(x => x.id !== id);
    updateCart();
};

// Clear cart
let clearCart = () => {
    basket = [];
    basketMap.clear();
    updateCart();
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
            <button onclick="checkout()" class="checkout">בצע הזמנה</button>
            <button onclick="clearCart()" class="removeAll">הסרת כל הפריטים</button>
        </div>
    `;
};

// הוספת הפונקציות לחלון הגלובלי
Object.assign(window, {
    increment,
    decrement,
    removeItem,
    clearCart: () => {
        basket = [];
        basketMap.clear();
        updateCart();
    }
});

// אתחול
loadProducts();

// קריאה לחישוב בטעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    calculation(); // חישוב ראשוני של כמות הפריטים
});

// פונקציית התנתקות
const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
};

// פונקציית ביצוע הזמנה
const checkout = () => {
    if (basketMap.size === 0) {
        alert("העגלה ריקה!");
        return;
    }
    
    // כאן תוכל להוסיף את הלוגיקה של ביצוע ההזמנה
    alert("ההזמנה בוצעה בהצלחה!");
    clearCart();
    window.location.href = "index.html";
};

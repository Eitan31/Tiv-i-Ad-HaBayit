import { Product, shopItems } from "./product.js";

let shop = document.getElementById('shop');
let basket = JSON.parse(localStorage.getItem("data")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

// פונקציה לשליפת מוצרים מהשרת
async function fetchProducts() {
  try {
    const response = await fetch('/api/getProducts');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    products.forEach(product => {
      const newProduct = new Product(
        product.product_id,
        product.name,
        product.price,
        product.image,
        product.description,
        product.category,
        product.volume,
        product.shelfLife,
        product.storage
      );
      newProduct.addToShopItems();
    });
    generateShop(); // קריאה לפונקציה ליצירת החנות לאחר שליפת המוצרים
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// קריאה לפונקציה לשליפת מוצרים
fetchProducts();

let generateShop = () => {
  shop.innerHTML = shopItems
    .map((x) => {
      let { product_id, name, price, description, image, shelfLife, storage, volume } = x;
      let search = basket.find((x) => x.id === product_id) || { item: 0 };
      console.log('Product:', product_id, 'Quantity:', search.item); // הדפסת כמות המוצר
      return `
        <div id="product-id-${product_id}" class="item">
          <img width="235" src="${image || ''}" alt="">
          <div class="details">
            <div class="info-icon" id="info-${product_id}">
              <i class="bi bi-info-circle"></i>
              <div class="info-content" id="content-${product_id}">
                ${shelfLife ? `<p><strong>תוקף:</strong> ${shelfLife}</p>` : `<p><strong>תוקף:</strong> -</p>`}
                ${storage ? `<p><strong>אחסון:</strong> ${storage}</p>` : `<p><strong>אחסון:</strong> -</p>`}
                ${volume ? `<p><strong>כמות:</strong> ${volume}</p>` : `<p><strong>נפח:</strong> -</p>`}
              </div>
            </div>
            <h3>${name}</h3>
            <p>${description}</p>
            <div class="price">
              <h2>${price}₪</h2>
              <div class="buttons">
                <i class="bi bi-plus-lg increment" data-id="${product_id}"></i>
                <div id="quantity-${product_id}" class="quantity">
                  ${search.item}
                </div>
                <i class="bi bi-dash-lg decrement" data-id="${product_id}"></i>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // חיבור מאזינים אחרי יצירת האלמנטים
  document.querySelectorAll('.increment').forEach((btn) => {
    btn.addEventListener('click', (e) => increment(e.target.dataset.id));
  });

  document.querySelectorAll('.decrement').forEach((btn) => {
    btn.addEventListener('click', (e) => decrement(e.target.dataset.id));
  });
};

// פונקציות increment ו-decrement
window.increment = (id) => {
  console.log('Increment clicked for product ID:', id); // הדפסת המוצר שנלחץ
  let selectedItem = basket.find((x) => x.id === id);

  // אם המוצר לא קיים בעגלה, נוסיף אותו עם כמות 1
  if (!selectedItem) {
    basket.push({
      id: id,
      item: 1,
    });
    console.log('Item added to basket:', id); // הדפסה כאשר המוצר מתווסף
  } else {
    // אם המוצר קיים, נעדכן את הכמות
    selectedItem.item += 1;
    console.log('Item quantity updated for ID:', id, 'New quantity:', selectedItem.item); // הדפסה לאחר עדכון הכמות
  }

  // עדכון הכמות בתצוגה
  updateQuantityDisplay(id);
  
  // שמירה ב-localStorage
  saveBasketToLocalStorage();
};

window.decrement = (id) => {
  console.log('Decrement clicked for product ID:', id); // הדפסת המוצר שנלחץ
  let selectedItem = basket.find((x) => x.id === id);

  // אם המוצר לא קיים בעגלה או אם הכמות 0, לא נעשה שום דבר
  if (!selectedItem || selectedItem.item <= 0) {
    console.log('Item not found or quantity is zero:', id); // הדפסת המוצר לא נמצא או כמות 0
    return;
  }

  // הפחתת כמות
  selectedItem.item -= 1;

  // אם הכמות 0, נמחק את המוצר מהעגלה
  if (selectedItem.item === 0) {
    basket = basket.filter((x) => x.id !== id);
    console.log('Item removed from basket:', id); // הדפסה אם המוצר הוסר
  }

  // עדכון הכמות בתצוגה
  updateQuantityDisplay(id);
  
  // שמירה ב-localStorage
  saveBasketToLocalStorage();
};

function updateQuantityDisplay(id) {
  // עדכון הכמות בתצוגה
  let selectedItem = basket.find((x) => x.id === id);
  if (selectedItem) {
    const quantityElement = document.getElementById(`quantity-${id}`);
    if (quantityElement) {
      quantityElement.innerHTML = selectedItem.item; // עדכון הכמות
    }
  }

  calculation();  // עדכון סיכום העגלה
}

function saveBasketToLocalStorage() {
  console.log('Saving basket to localStorage:', basket); // הדפסת מצב העגלה לפני השמירה
  localStorage.setItem("data", JSON.stringify(basket));
}

function calculation() {
  let cartIcon = document.getElementById("cartAmount");
  // סיכום כל המוצרים בעגלה
  cartIcon.innerHTML = basket.reduce((total, item) => total + item.item, 0); 
}

calculation();

// הצגת מידע נוסף על המוצר
document.querySelectorAll('.info-icon').forEach(icon => {
  icon.addEventListener('mouseenter', (e) => {
    let content = e.target.querySelector('.info-content');
    content.style.display = 'block'; // הצגת המידע
  });
  icon.addEventListener('mouseleave', (e) => {
    let content = e.target.querySelector('.info-content');
    content.style.display = 'none'; // הסתרת המידע
  });
});

// פונקציה לשמירת נתוני המשתמשים כקובץ JSON
function saveUsersToFile(users) {
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.json';
    a.click();
    URL.revokeObjectURL(url);
}

// כפתור לשמירה של הקובץ
document.getElementById("saveUsersButton").addEventListener("click", () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    saveUsersToFile(users);
});

// אתחול העגלה אם יש משתמש מחובר
if (currentUser) {
    basket = currentUser.cart || [];
}

document.addEventListener("DOMContentLoaded", () => {
    const loomCompanion = document.getElementById("loom-companion-mv3");
    if (loomCompanion) {
        loomCompanion.remove();
    }
});

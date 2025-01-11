import { Product, shopItems } from "./product.js";

let shop = document.getElementById('shop');
let basket = JSON.parse(localStorage.getItem("data")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

// פונקציה לשליפת מוצרים מהשרת
async function fetchProducts() {
  try {
    const response = await fetch('http://localhost:3000/api/products'); // שואל את ה-API
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    products.forEach(product => {
      const newProduct = new Product(
        product.id,
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
            let { id, name, price, desc, img, shelfLife, storage, rating, volume } = x;
            let search = basket.find((x) => x.id === id) || { item: 0 };
            return `
                <div id=product-id-${id} class="item">
                    <img width="235" src=${img} alt="">
                    <div class="details">
                        <div class="info-icon" id="info-${id}">
                            <i class="bi bi-info-circle"></i>
                            <div class="info-content" id="content-${id}">
                                ${shelfLife ? `<p><strong>תוקף:</strong> ${shelfLife}</p>` : `<p><strong>תוקף:</strong> -</p>`}
                                ${storage ? `<p><strong>אחסון:</strong> ${storage}</p>` : `<p><strong>אחסון:</strong> -</p>`}
                                ${volume ? `<p><strong>כמות:</strong> ${volume}</p>` : `<p><strong>נפח:</strong> -</p>`}
                            </div>
                        </div>
                        <h3>${name}</h3>
                        <p>${desc}</p>
                        <div class="price">
                            <h2>${price}₪</h2>
                            <div class="buttons">
                                <i class="bi bi-plus-lg increment" data-id="${id}"></i>
                                <div id="${id}" class="quantity">
                                    ${search.item === undefined ? 0 : search.item}
                                </div>
                                <i class="bi bi-dash-lg decrement" data-id="${id}"></i>

                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    // הוספת מאזינים לאירועים לכפתורי הוספה והפחתה
    document.querySelectorAll(".increment").forEach((btn) => {
        btn.addEventListener("click", (e) => increment(e.target.dataset.id));
    });

    document.querySelectorAll(".decrement").forEach((btn) => {
        btn.addEventListener("click", (e) => decrement(e.target.dataset.id));
    });
};

let increment = (id) => {
    // חיפוש מוצר בסל
    let search = basket.find((item) => item.id === id);

    if (!search) {
        basket.push({ id: id, item: 1 });  // אם המוצר לא נמצא, נוסיף אותו
    } else {
        search.item++;  // אם המוצר כבר בסל, נגדיל את הכמות
    }

    update(id);

    // עדכון עגלת הקניות במידע של המשתמש
    if (currentUser) {
        currentUser.cart = basket;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }

    localStorage.setItem("data", JSON.stringify(basket));  // שמירה ל-localStorage
};
let decrement = (id) => {
    let search = basket.find((item) => item.id === id);

    if (!search || search.item === 0) return;

    search.item--;
    basket = basket.filter((item) => item.item !== 0);

    update(id);

    if (currentUser) {
        currentUser.cart = basket;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }

    localStorage.setItem("data", JSON.stringify(basket));  // שמירה ל-localStorage
};
let update = (id) => {
    let search = basket.find((x) => x.id === id);
    let quantity = search ? search.item : 0; // בדיקה אם search מוגדר
    document.getElementById(id).innerHTML = quantity; 
    calculation();
};


let calculation = () => {
    let cartIcon = document.getElementById("cartAmount");
    cartIcon.innerHTML = basket.map((x) => x.item).reduce((x, y) => x + y, 0);
};
calculation();
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
if (currentUser) {
    basket = currentUser.cart || [];
}

document.addEventListener("DOMContentLoaded", () => {
    const loomCompanion = document.getElementById("loom-companion-mv3");
    if (loomCompanion) {
        loomCompanion.remove();
    }
});

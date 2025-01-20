import { Product, shopItems } from "./product.js";

document.addEventListener('DOMContentLoaded', function() {
  let shop = document.getElementById('shop');
  let basket = JSON.parse(localStorage.getItem("data")) || [];
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // פונקציה לשליפת מוצרים מהשרת
  async function fetchProducts() {
    try {
      const products = await Product.fetchProductsFromServer(); // שליפת המוצרים מהשרת
      console.log("Products fetched:", products); // בדיקה שהמוצרים הועלו כראוי
      products.forEach(product => Product.addProductToShopItems(product)); // הוסף כל מוצר ל־shopItems
      if (shop) {
        generateShop(shop); // קריאה לפונקציה ליצירת החנות לאחר שליפת המוצרים
        updateQuantityDisplay(); // עדכון הכמויות אחרי שליפת המוצרים
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }

  // קריאה לפונקציה לשליפת המוצרים
  fetchProducts();

  // יצירת החנות והצגת המוצרים
  function generateShop(shop) {
    shop.innerHTML = shopItems
      .map((x) => {
        let { id, name, price, description, img, shelfLife, storage, volume } = x;
        let search = basket.find((x) => x.id === id) || { item: 0 };

        // אם אין תיאור, נכניס תיאור ברירת מחדל
        if (!description) {
          description = "אין תיאור זמין";
        }

        // אם לא נקבעה תמונה, נשתמש בתמונה ברירת מחדל
        if (!img) {
          img = '/images/default.jpg';
        }

        return `
          <div id=product-id-${id} class="item">
            <img width="235" src="${img}" alt="${name}">
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
              <p>${description}</p>
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
      })
      .join("");

    // חיבור מאזינים אחרי יצירת האלמנטים
    document.querySelectorAll('.increment').forEach((btn) => {
      btn.addEventListener('click', (e) => increment(e.target.dataset.id));
    });

    document.querySelectorAll('.decrement').forEach((btn) => {
      btn.addEventListener('click', (e) => decrement(e.target.dataset.id));
    });

    // חיבור למאזינים של האייקונים
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
  }

  // פונקציות increment ו-decrement
  window.increment = (id) => {
    console.log("Incrementing product with ID:", id);
    let selectedItem = basket.find((x) => x.id === id);

    if (selectedItem === undefined) {
      basket.push({
        id: id,
        item: 1,
      });
    } else {
      selectedItem.item += 1;
    }

    console.log("Basket after increment:", basket);  // לוג עדכון הסל
    updateBasket();
  };

  window.decrement = (id) => {
    console.log("Decrementing product with ID:", id);
    let selectedItem = basket.find((x) => x.id === id);

    if (selectedItem === undefined || selectedItem.item === 0) return;

    selectedItem.item -= 1;

    // אם הכמות הגיעה ל-0, נמחק את המוצר מהסל
    if (selectedItem.item === 0) {
      basket = basket.filter((x) => x.id !== id);
    }

    console.log("Basket after decrement:", basket);  // לוג עדכון הסל
    updateBasket();
  };

  function updateBasket() {
    localStorage.setItem("data", JSON.stringify(basket));
    generateShop(shop); // הצגת החנות מחדש
    updateQuantityDisplay();
  }

  function updateQuantityDisplay() {
    basket.forEach(item => {
      const quantityDisplay = document.getElementById(item.id);
      if (quantityDisplay) {
        quantityDisplay.innerHTML = item.item;
      }
    });
    calculation();  // עדכון הסל לאחר שינוי
  }

  function calculation() {
    let cartIcon = document.getElementById("cartAmount");
    if (cartIcon) {
      cartIcon.innerHTML = basket.map((x) => x.item).reduce((x, y) => x + y, 0);
    }
  }

  // עדכון תצוגת הכמויות ברגע טעינת הדף
  updateQuantityDisplay();
  calculation();
});

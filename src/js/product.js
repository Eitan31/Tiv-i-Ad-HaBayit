export let shopItems = [];

export class Product {
  static CACHE_KEY = 'store_products_cache';
  static LAST_UPDATE_KEY = 'store_last_update';
  static UPDATE_INTERVAL = 300000; // 5 דקות
  static imageCache = new Map();

  constructor(id, name, price, image, description, category, volume, shelfLife, storage) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.image = image;
    this.description = description;
    this.category = category || "מיצים 2 ליטר";
    this.volume = volume || "2 ליטר";
    this.shelfLife = shelfLife || "7-10 ימים";
    this.storage = storage || "מומלץ לשמור בקירור";
  }

  // בדיקה אם צריך לעדכן את המטמון
  static shouldUpdate() {
    const lastUpdate = localStorage.getItem(this.LAST_UPDATE_KEY);
    return !lastUpdate || (Date.now() - parseInt(lastUpdate)) > this.UPDATE_INTERVAL;
  }

  // שליפת מוצרים מהמטמון המקומי
  static getFromCache() {
    const cached = localStorage.getItem(this.CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }

  // שמירת מוצרים במטמון המקומי
  static saveToCache(products) {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
  }

  // טעינת תמונות למטמון
  static async preloadImages(products) {
    const imagePromises = products
      .filter(p => p.image && !this.imageCache.has(p.image))
      .map(p => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(p.image, p.image);
          resolve();
        };
        img.onerror = () => resolve(); // המשך גם אם התמונה נכשלה
        img.src = p.image;
      }));

    await Promise.all(imagePromises);
  }

  // שליפת מוצרים מהשרת או מהמטמון
  static async fetchProductsFromServer() {
    try {
      // נסה לטעון מהמטמון קודם
      const cachedProducts = this.getFromCache();
      
      // אם יש מוצרים במטמון ולא צריך לעדכן, השתמש בהם
      if (cachedProducts && !this.shouldUpdate()) {
        await this.preloadImages(cachedProducts);
        return cachedProducts.map(p => new Product(
          p.id, p.name, p.price, p.image, p.description,
          p.category, p.volume, p.shelfLife, p.storage
        ));
      }

      // אחרת, טען מהשרת
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const products = await response.json();
      
      // שמור במטמון ועדכן את זמן העדכון האחרון
      this.saveToCache(products);
      
      // טען תמונות למטמון
      await this.preloadImages(products);

      return products.map(p => new Product(
        p.id, p.name, p.price, p.image, p.description,
        p.category, p.volume, p.shelfLife, p.storage
      ));

    } catch (err) {
      console.error('Error fetching products:', err);
      // במקרה של שגיאה, נסה להשתמש במטמון
      const cachedProducts = this.getFromCache();
      if (cachedProducts) {
        return cachedProducts.map(p => new Product(
          p.id, p.name, p.price, p.image, p.description,
          p.category, p.volume, p.shelfLife, p.storage
        ));
      }
      return []; // אם אין מטמון, החזר מערך ריק
    }
  }

  // הוספת מוצר ל-shopItems
  static addProductToShopItems(product) {
    shopItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      img: this.imageCache.get(product.image) || product.image,
      category: product.category,
      volume: product.volume,
      shelfLife: product.shelfLife,
      storage: product.storage,
    });
  }
}

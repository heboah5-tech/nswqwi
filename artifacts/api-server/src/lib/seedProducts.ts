// Featured Naqi water-bottle cartons. These are the flagship products and
// must always exist; they're also re-asserted at runtime by
// `ensureFeaturedProducts()` in routes/products.ts so they show up even
// if the database was seeded with an older catalog.
export const FEATURED_PRODUCTS = [
  {
    name_ar: "نقي 200 مل",
    price: 22,
    original_price: 28,
    discount: 6,
    category: "desalination",
    in_stock: true,
    image_url: "/products/naqi-200ml.png",
  },
  {
    name_ar: "قطرة 200 مل",
    price: 18,
    original_price: 24,
    discount: 6,
    category: "desalination",
    in_stock: true,
    image_url: "/products/qatra-200ml.png",
  },
  {
    name_ar: "نقي 330 مل",
    price: 30,
    original_price: 38,
    discount: 8,
    category: "desalination",
    in_stock: true,
    image_url: "/products/naqi-330ml.png",
  },
];

export const SEED_PRODUCTS = [
  ...FEATURED_PRODUCTS,
  {
    name_ar: "صانعة آيس كريم نقي",
    price: 899,
    original_price: 1199,
    discount: 300,
    category: "ice-makers",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0eb8f3ed1_1.png",
  },
  {
    name_ar: "منقي مياه نقي MAX",
    price: 1299,
    original_price: 1799,
    discount: 500,
    category: "desalination",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/8a2eb4133_2.png",
  },
  {
    name_ar: "براد مياه نقي 5 جالون",
    price: 599,
    original_price: 799,
    discount: 200,
    category: "desalination",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/82b07e6cd_3.png",
  },
  {
    name_ar: "منقي الهواء نقي AIR PRO",
    price: 749,
    original_price: 999,
    discount: 250,
    category: "air-purifiers",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/04fcf2acf_4.png",
  },
  {
    name_ar: "ماكينة قهوة نقي بريميوم",
    price: 1899,
    original_price: 2499,
    discount: 600,
    category: "coffee",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/9b9f2c63f_5.png",
  },
  {
    name_ar: "دفاية نقي الذكية",
    price: 449,
    original_price: 649,
    discount: 200,
    category: "heaters",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/2bdfc7a45_6.png",
  },
  {
    name_ar: "غسالة صحون نقي ميني",
    price: 1099,
    original_price: 1399,
    discount: 300,
    category: "kitchen",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/4ff5fbe18_7.png",
  },
  {
    name_ar: "مضخة مياه نقي 1HP",
    price: 549,
    original_price: 749,
    discount: 200,
    category: "pumps",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/3b04b62a9_8.png",
  },
  {
    name_ar: "مكنسة كهربائية نقي تيربو",
    price: 399,
    original_price: 599,
    discount: 200,
    category: "home-devices",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/cb7488e8e_9.png",
  },
  {
    name_ar: "صانعة الثلج نقي ICE+",
    price: 1199,
    original_price: 1599,
    discount: 400,
    category: "ice-makers",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/47ea59c66_10.png",
  },
  {
    name_ar: "ثلاجة نقي صغيرة",
    price: 799,
    original_price: 1099,
    discount: 300,
    category: "heaters",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/f3c89bfb1_11.png",
  },
  {
    name_ar: "خدمة صيانة دورية",
    price: 199,
    original_price: 299,
    discount: 100,
    category: "maintenance",
    in_stock: true,
    image_url:
      "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/abf49d6c0_12.png",
  },
];

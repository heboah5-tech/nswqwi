import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CATEGORIES = [
  { id: "1", name_ar: "العروض المميزة", slug: "promotions", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/2075ea122_www_naqi_sa_--e1738571010238_4c905d18.svg" },
  { id: "2", name_ar: "التحلية والبرادات", slug: "desalination", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/0680ca8d4_www_naqi_sa_---e1738571121112-2048x1927_5f1e0bd5.png" },
  { id: "3", name_ar: "منقيات الهواء", slug: "air-purifiers", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/a2f88fcd3_www_naqi_sa_--e1738571805455-2048x1927_e2cef727.png" },
  { id: "4", name_ar: "صانعات الثلج", slug: "ice-makers", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/9bce1d27c_www_naqi_sa_---e1738571211984-2048x1927_9038284a.png" },
  { id: "5", name_ar: "أجهزة القهوة", slug: "coffee", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/5000580ff_www_naqi_sa_-----e1738571414376-2048x1927_b5157a28.png" },
  { id: "6", name_ar: "الدفايات والثلاجات", slug: "heaters", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/6d5cd2731_www_naqi_sa_--e1738571507554-2048x1927_6e055084.png" },
  { id: "7", name_ar: "أجهزة المطبخ", slug: "kitchen", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/144881d9b_www_naqi_sa_Screenshot_6-removebg-preview_a80b25d8.png" },
  { id: "8", name_ar: "منتجات المنزل", slug: "home-devices", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/db48f2487_www_naqi_sa_Screenshot_12-removebg-preview_549e1975.png" },
  { id: "9", name_ar: "المضخات والغطاسات", slug: "pumps", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/641308484_www_naqi_sa_Screenshot_10-removebg-preview_1d33505a.png" },
  { id: "10", name_ar: "الصيانة الدورية", slug: "maintenance", image_url: "https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/e7b5aced5_www_naqi_sa_-1-e1738571650797-2048x1927_a9a98a1c.png" },
];

router.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

export default router;

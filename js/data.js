/* Стандартні дані сайту. Використовуються, поки база порожня або не підключена,
   і для кнопки «Імпортувати стандартні товари» в адмінці. */
window.DEFAULT_PRODUCTS = [
  {
    id: 1, category: 'embroidery', color: 'blue', stock: true, price: 1500,
    name: { uk: 'Футболка «Місто» блакитна', en: 'Blue “City” T-shirt' },
    desc: { uk: 'Бавовна · вишивка на спині · розмір M', en: 'Cotton · back embroidery · size M' },
    details: { uk: 'Блакитна футболка з вишивкою «Місто» на спині.\nРозмір M — 2 в наявності.', en: 'Blue T-shirt with a “City” embroidery on the back.\nSize M — 2 in stock.' },
    img: 'assets/tee-blue.jpg', gallery: ['assets/tee-blue.jpg', 'assets/tees.jpg']
  },
  {
    id: 2, category: 'embroidery', color: 'yellow', stock: true, price: 1500,
    name: { uk: 'Футболка «Колесо» жовта', en: 'Yellow “Ferris wheel” T-shirt' },
    desc: { uk: 'Бавовна · вишивка на спині · розмір L, остання', en: 'Cotton · back embroidery · size L, last one' },
    details: { uk: 'Жовта футболка з вишивкою «Колесо» на спині.\nРозмір L — остання.', en: 'Yellow T-shirt with a “Ferris wheel” embroidery on the back.\nSize L — the last one.' },
    img: 'assets/tee-yellow.jpg', gallery: ['assets/tee-yellow.jpg', 'assets/tees.jpg']
  },
  {
    id: 3, category: 'embroidery', color: 'white', stock: true, price: 0,
    name: { uk: 'Рушник з вишитою монограмою', en: 'Towel with embroidered monogram' },
    desc: { uk: 'Літера, ім’я або монограма · золота нитка', en: 'Letter, name or monogram · golden thread' },
    details: { uk: 'Не просто рушник, а свій рушник. Вишиваємо ініціали на кожному рушнику, додаючи індивідуальності та елегантності.\nМожна вишити літеру, ім’я або монограму. Ціна залежить від розміру рушника та вишивки — напишіть нам.', en: 'Not just a towel — your own towel. We embroider initials on every towel for a touch of elegance.\nA letter, a name or a monogram: write to us for a price.' },
    img: 'assets/towels.jpg', gallery: ['assets/towels.jpg']
  },
  {
    id: 4, category: 'embroidery', color: 'beige', stock: true, price: 0,
    name: { uk: 'Шопер з квітковим орнаментом', en: 'Tote bag with floral ornament' },
    desc: { uk: 'Щільна тканина · вишивка · тканий ремінь', en: 'Sturdy fabric · embroidery · woven strap' },
    details: { uk: 'Шопер із вишитим квітковим орнаментом, застібкою на кнопку та ременем із тканої стрічки.\nЦіну та наявність уточнюйте через форму.', en: 'Tote bag with a floral embroidery, a snap closure and a woven strap.\nAsk us for the price and availability.' },
    img: 'assets/shoper-red.jpg', gallery: ['assets/shoper-red.jpg', 'assets/shopers.jpg']
  },
  {
    id: 5, category: 'embroidery', color: 'beige', stock: true, price: 0,
    name: { uk: 'Шопери з вишивкою, добірка', en: 'Embroidered tote bags, selection' },
    desc: { uk: 'Бежеві, чорні та білі · ремені на вибір', en: 'Beige, black and white · choice of straps' },
    details: { uk: 'Шопери бежевого, чорного та білого кольорів з різними вишитими візерунками. Ремені з різними візерунками — обирайте під настрій.\nЦіну та наявність уточнюйте через форму.', en: 'Tote bags in beige, black and white with different embroidered patterns and a choice of straps.\nAsk us for the price and availability.' },
    img: 'assets/shopers.jpg', gallery: ['assets/shopers.jpg', 'assets/shoper-red.jpg']
  }
];

window.DEFAULT_SITE = {
  heroTitle: { uk: 'Створюємо речі,\nякі мають характер.', en: 'We create things\nwith character.' },
  heroText: { uk: 'Комп’ютерна вишивка та вироби зі шкіри\nу поєднанні з майстерністю і стилем.', en: 'Computer embroidery and leather goods\nwhere craftsmanship meets style.' },
  aboutTitle: { uk: 'Речі, створені\nз любов’ю до деталей.', en: 'Made with a love\nfor every detail.' },
  aboutText: {
    uk: 'ann.di.studio — студія комп’ютерної вишивки з Білої Церкви. Вишиваємо літери, імена та монограми на рушниках, одязі й шоперах, а ще створюємо власні речі з міськими мотивами. Одна літера — і звичайна річ отримує особливий характер.',
    en: 'ann.di.studio is a computer embroidery studio in Bila Tserkva, Ukraine. We stitch letters, names and monograms onto towels, clothing and tote bags, and make our own pieces inspired by the city. One letter is enough to give an everyday thing real character.'
  },
  worksTitle: { uk: 'Трохи нашого процесу', en: 'A glimpse of our process' },
  worksText: { uk: 'Кожен стібок і кожен шов — частина історії.', en: 'Every stitch and every seam tells a story.' },
  heroImage: '', aboutImage: '',
  works: ['assets/tees.jpg', 'assets/shopers.jpg', 'assets/shoper-red.jpg'],
  phone: '+38 067 871 42 12', email: '',
  address: 'Северина Наливайка, 24, Біла Церква, Київська область, 09106',
  instagram: 'https://www.instagram.com/ann.di.studio'
};

window.CATEGORIES = { embroidery: ['Вишиті вироби', 'Embroidered items'], leather: ['Вироби зі шкіри', 'Leather goods'], accessories: ['Аксесуари', 'Accessories'] };
window.COLORS = {
  brown: ['Коричневий', 'Brown', '#7a5236'], beige: ['Бежевий', 'Beige', '#d8c3a3'], black: ['Чорний', 'Black', '#1f1a18'],
  white: ['Білий', 'White', '#fbfaf7'], blue: ['Блакитний', 'Blue', '#9cc2e6'], yellow: ['Жовтий', 'Yellow', '#f2dc86']
};
window.FREE_SHIPPING = 2000;

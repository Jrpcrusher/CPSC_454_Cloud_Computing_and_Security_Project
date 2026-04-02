const products = [
  {
    id: 1,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 2,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 3,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 4,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 5,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 6,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 7,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
  {
    id: 8,
    name: "Insert Product Name Here",
    price: 999.99,
    image:
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500&h=500&fit=crop",
    description: "Insert a very good description here.",
  },
];

export function getProducts() {
  return products;
}

export function getProductById(id) {
  return products.find((p) => p.id === Number(id));
}

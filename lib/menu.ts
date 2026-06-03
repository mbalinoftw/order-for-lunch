import type { MenuItem } from "./types"

// Reemplazá estas entradas con los ítems reales del menú.
// photo_url puede ser una URL de Vercel Blob, Cloudinary, o cualquier imagen pública.
export const MENU_ITEMS: MenuItem[] = [
  {
    id: "bulnes",
    name: "Bulnes",
    description: "Pan brioche, colita de cuadril, cebolla y morrón verde a la chapa, mix de quesos gratinados (estilo cheesesteak), aderezos.",
    price: 19500,
    photo_url: "/menu-items/bulnes.png",
    bread: ["Pan brioche"],
  },
  {
    id: "catedral",
    name: "Catedral",
    description: "Pan de campo, manteca al ajillo, albóndigas de bife de chorizo en salsa ragú, queso parmesano gratinado.",
    price: 16950,
    photo_url: "/menu-items/catedral.png",
    bread: ["Pan de campo"],
  },
  {
    id: "corrientes",
    name: "Corrientes",
    description: "Pan de campo, suprema de pollo grillada, cheddar spicy gratinado, panceta a la chapa, cebolla caramelizada al vino, mix de lechuga y mayo casera.",
    price: 17350,
    photo_url: "/menu-items/corrientes.png",
    bread: ["Pan de campo"],
  },
  {
    id: "santa_fe",
    name: "Santa Fe",
    description: "Pan brioche, bondiola borracha (vino o cerveza), provoleta gratinada, cebolla colorada marinada, hojas de cilantro, alioli y mostaza miel.",
    price: 19500,
    photo_url: "/menu-items/santa-fe.png",
    bread: ["Pan brioche"],
  },
  {
    id: "florida",
    name: "Florida",
    description: "Pan brioche, pollo estilo coreano, queso crema tropical, pepinillos agridulces y mix de lechuga.",
    price: 17800,
    photo_url: "/menu-items/florida.png",
    bread: ["Pan brioche"],
  },
  {
    id: "las_heras",
    name: "Las Heras",
    description: "Jamón crudo, queso gouda artesanal, rúcula, tomates confitados.",
    price: 15500,
    photo_url: "/menu-items/las-heras.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
  },
  {
    id: "plaza_italia",
    name: "Plaza Italia",
    description: "Jamón cocido, pepperoni, queso gouda ahumado. Opcional: rúcula o mix de lechuga.",
    price: 15000,
    photo_url: "/menu-items/plaza-italia.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
  },
  {
    id: "constitucion",
    name: "Constitución",
    description: "Jamón cocido, queso danbo. Opcional: tomate natural, rúcula o mix de lechuga.",
    price: 13800,
    photo_url: "/menu-items/constitucion.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
  },
  {
    id: "dorrego",
    name: "Dorrego",
    description: "Pastrón, pepinillos agridulces, queso crema. Opcional: rúcula o mix de lechuga.",
    price: 16250,
    photo_url: "/menu-items/dorrego.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
  },
  {
    id: "miserere",
    name: "Miserere",
    description: "Lomo ahumado, queso gouda, orégano. Opcional: rúcula o mix de lechuga.",
    price: 15150,
    photo_url: "/menu-items/miserere.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
  },
  {
    id: "palermo",
    name: "Palermo",
    description: "Vegetales salpimentados (morrón, cebolla y zanahoria) con mix de tres quesos gratinados.",
    price: 14550,
    photo_url: "/menu-items/palermo.png",
    bread: ["Pan brioche blanco", "Pan brioche sésamo", "Pan brioche orégano"],
    dressing: ["Mayonesa de ajo", "Mayonesa de choclo", "Mayonesa de roquefort", "Aceite de oliva", "Miel mostaza", "Queso crema", "Crema de jalapeño", "Manteca"],
    veggie: true,
  },
]

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id)
}

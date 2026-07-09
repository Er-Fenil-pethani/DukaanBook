import { PrismaClient, Prisma, Role, SaleStatus, StockMovementType, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const OWNER_EMAIL = 'owner@demo.local';

const CASHIERS = [
  {
    name: 'Aarav Sharma',
    email: 'cashier1@demo.local',
    password: 'Cashier123!',
  },
  {
    name: 'Priya Patel',
    email: 'cashier2@demo.local',
    password: 'Cashier123!',
  },
];

const categories = [
  { name: 'Groceries', slug: 'groceries' },
  { name: 'Beverages', slug: 'beverages' },
  { name: 'Snacks', slug: 'snacks' },
  { name: 'Dairy & Breakfast', slug: 'dairy-breakfast' },
  { name: 'Personal Care', slug: 'personal-care' },
  { name: 'Household', slug: 'household' },
];

const products = [
  {
    category: 'Groceries',
    sku: 'GRO-001',
    barcode: '8901000000011',
    name: 'India Gate Basmati Rice 5kg',
    description: 'Premium aged basmati rice',
    price: 699,
    costPrice: 560,
    stock: 42,
    lowStockThreshold: 10,
  },
  {
    category: 'Groceries',
    sku: 'GRO-002',
    barcode: '8901000000028',
    name: 'Aashirvaad Atta 5kg',
    description: 'Whole wheat flour',
    price: 289,
    costPrice: 235,
    stock: 55,
    lowStockThreshold: 12,
  },
  {
    category: 'Groceries',
    sku: 'GRO-003',
    barcode: '8901000000035',
    name: 'Tata Salt 1kg',
    description: 'Iodised salt',
    price: 28,
    costPrice: 22,
    stock: 80,
    lowStockThreshold: 15,
  },
  {
    category: 'Beverages',
    sku: 'BEV-001',
    barcode: '8901000000042',
    name: 'Coca-Cola 750ml',
    description: 'Chilled soft drink bottle',
    price: 45,
    costPrice: 35,
    stock: 64,
    lowStockThreshold: 15,
  },
  {
    category: 'Beverages',
    sku: 'BEV-002',
    barcode: '8901000000059',
    name: 'Real Mixed Fruit Juice 1L',
    description: 'Mixed fruit juice',
    price: 125,
    costPrice: 96,
    stock: 26,
    lowStockThreshold: 8,
  },
  {
    category: 'Beverages',
    sku: 'BEV-003',
    barcode: '8901000000066',
    name: 'Red Bull Energy Drink 250ml',
    description: 'Energy drink can',
    price: 125,
    costPrice: 102,
    stock: 7,
    lowStockThreshold: 10,
  },
  {
    category: 'Snacks',
    sku: 'SNK-001',
    barcode: '8901000000073',
    name: 'Lay’s Magic Masala',
    description: 'Indian magic masala potato chips',
    price: 20,
    costPrice: 15,
    stock: 95,
    lowStockThreshold: 20,
  },
  {
    category: 'Snacks',
    sku: 'SNK-002',
    barcode: '8901000000080',
    name: 'Kurkure Masala Munch',
    description: 'Crunchy masala snack',
    price: 20,
    costPrice: 15,
    stock: 72,
    lowStockThreshold: 20,
  },
  {
    category: 'Snacks',
    sku: 'SNK-003',
    barcode: '8901000000097',
    name: 'Britannia Good Day Cookies',
    description: 'Butter cookies pack',
    price: 40,
    costPrice: 31,
    stock: 6,
    lowStockThreshold: 10,
  },
  {
    category: 'Dairy & Breakfast',
    sku: 'DAI-001',
    barcode: '8901000000103',
    name: 'Amul Butter 500g',
    description: 'Pasteurised table butter',
    price: 285,
    costPrice: 248,
    stock: 24,
    lowStockThreshold: 8,
  },
  {
    category: 'Dairy & Breakfast',
    sku: 'DAI-002',
    barcode: '8901000000110',
    name: 'Amul Taaza Milk 1L',
    description: 'Toned milk',
    price: 57,
    costPrice: 51,
    stock: 38,
    lowStockThreshold: 12,
  },
  {
    category: 'Dairy & Breakfast',
    sku: 'DAI-003',
    barcode: '8901000000127',
    name: 'Kellogg’s Corn Flakes 475g',
    description: 'Classic breakfast cereal',
    price: 199,
    costPrice: 158,
    stock: 18,
    lowStockThreshold: 6,
  },
  {
    category: 'Personal Care',
    sku: 'PER-001',
    barcode: '8901000000134',
    name: 'Dove Bathing Bar 100g',
    description: 'Moisturising bathing bar',
    price: 65,
    costPrice: 51,
    stock: 48,
    lowStockThreshold: 12,
  },
  {
    category: 'Personal Care',
    sku: 'PER-002',
    barcode: '8901000000141',
    name: 'Colgate Strong Teeth 200g',
    description: 'Daily fluoride toothpaste',
    price: 125,
    costPrice: 98,
    stock: 32,
    lowStockThreshold: 8,
  },
  {
    category: 'Household',
    sku: 'HOU-001',
    barcode: '8901000000158',
    name: 'Surf Excel Matic 2kg',
    description: 'Machine wash detergent powder',
    price: 475,
    costPrice: 390,
    stock: 20,
    lowStockThreshold: 6,
  },
  {
    category: 'Household',
    sku: 'HOU-002',
    barcode: '8901000000165',
    name: 'Vim Dishwash Gel 750ml',
    description: 'Lemon dishwashing gel',
    price: 199,
    costPrice: 158,
    stock: 5,
    lowStockThreshold: 8,
  },
];

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  });

  if (!owner) {
    throw new Error(`Owner ${OWNER_EMAIL} not found`);
  }

  if (!owner.businessProfileId) {
    throw new Error('Demo owner has no business profile');
  }

  const businessProfileId = owner.businessProfileId;

  await prisma.businessProfile.update({
    where: { id: businessProfileId },
    data: {
      name: 'Urban Basket Supermarket',
      address: 'SG Highway, Ahmedabad, Gujarat',
      phone: '+91 98765 43210',
      currency: 'INR',
      taxRate: new Prisma.Decimal(5),
    },
  });

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: {
        businessProfileId_slug: {
          businessProfileId,
          slug: category.slug,
        },
      },
      update: {
        name: category.name,
      },
      create: {
        ...category,
        businessProfileId,
      },
    });

    categoryMap.set(category.name, saved.id);
  }

  const productMap = new Map<string, string>();

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);

    if (!categoryId) {
      throw new Error(`Category missing: ${product.category}`);
    }

    const saved = await prisma.product.upsert({
      where: {
        businessProfileId_sku: {
          businessProfileId,
          sku: product.sku,
        },
      },
      update: {
        name: product.name,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        costPrice: new Prisma.Decimal(product.costPrice),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        categoryId,
        active: true,
      },
      create: {
        businessProfileId,
        categoryId,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        costPrice: new Prisma.Decimal(product.costPrice),
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        active: true,
      },
    });

    productMap.set(product.sku, saved.id);
  }

  const passwordHash = await bcrypt.hash('Cashier123!', 12);
  const cashierIds: string[] = [];

  for (const cashier of CASHIERS) {
    const saved = await prisma.user.upsert({
      where: { email: cashier.email },
      update: {
        name: cashier.name,
        password: passwordHash,
        role: Role.CASHIER,
        suspended: false,
        businessProfileId,
      },
      create: {
        name: cashier.name,
        email: cashier.email,
        password: passwordHash,
        role: Role.CASHIER,
        suspended: false,
        businessProfileId,
      },
    });

    cashierIds.push(saved.id);
  }

  await prisma.saleItem.deleteMany({
    where: {
      sale: {
        businessProfileId,
      },
    },
  });

  await prisma.sale.deleteMany({
    where: {
      businessProfileId,
    },
  });

  await prisma.stockMovement.deleteMany({
    where: {
      product: {
        businessProfileId,
      },
    },
  });

  const saleTemplates = [
    [
      ['GRO-001', 1],
      ['SNK-001', 3],
      ['DAI-002', 2],
    ],
    [
      ['GRO-002', 1],
      ['PER-002', 1],
      ['BEV-001', 2],
    ],
    [
      ['DAI-001', 1],
      ['SNK-002', 4],
      ['BEV-002', 1],
    ],
    [
      ['HOU-001', 1],
      ['PER-001', 3],
    ],
    [
      ['GRO-003', 2],
      ['DAI-003', 1],
      ['SNK-001', 5],
    ],
    [
      ['BEV-001', 4],
      ['SNK-002', 3],
      ['SNK-003', 2],
    ],
    [
      ['GRO-001', 1],
      ['HOU-002', 1],
      ['PER-002', 1],
    ],
    [
      ['DAI-002', 3],
      ['DAI-001', 1],
      ['BEV-003', 2],
    ],
  ] as Array<Array<[string, number]>>;

  const now = new Date();
  let saleCounter = 1;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const salesToday = dayOffset % 2 === 0 ? 4 : 3;

    for (let index = 0; index < salesToday; index++) {
      const template =
        saleTemplates[(saleCounter - 1) % saleTemplates.length];

      const saleDate = new Date(now);
      saleDate.setUTCDate(now.getUTCDate() - dayOffset);
      saleDate.setUTCHours(9 + index * 2, 15 + index * 7, 0, 0);

      let subtotal = new Prisma.Decimal(0);

      const saleItems = [];

      for (const [sku, quantity] of template) {
        const productData = products.find((p) => p.sku === sku);
        const productId = productMap.get(sku);

        if (!productData || !productId) {
          throw new Error(`Product missing: ${sku}`);
        }

        const productPrice = new Prisma.Decimal(productData.price);
        const lineTotal = productPrice.mul(quantity);

        subtotal = subtotal.add(lineTotal);

        saleItems.push({
          productId,
          productName: productData.name,
          productPrice,
          quantity,
          lineTotal,
        });
      }

      const taxAmount = subtotal.mul(new Prisma.Decimal('0.05'));
      const total = subtotal.add(taxAmount);

      const dateKey = saleDate.toISOString().slice(0, 10).replace(/-/g, '');

      const sale = await prisma.sale.create({
        data: {
          businessProfileId,
          saleNumber: `DEMO-${dateKey}-${String(saleCounter).padStart(4, '0')}`,
          cashierId: cashierIds[saleCounter % cashierIds.length],
          subtotal,
          taxAmount,
          total,
          paymentMethod:
            saleCounter % 3 === 0
              ? PaymentMethod.CARD
              : PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          createdAt: saleDate,
          items: {
            create: saleItems,
          },
        },
      });

      for (const item of saleItems) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            reason: `Sale ${sale.saleNumber}`,
            actorId: cashierIds[saleCounter % cashierIds.length],
            createdAt: saleDate,
          },
        });
      }

      saleCounter++;
    }
  }

  for (const product of products) {
    const productId = productMap.get(product.sku);

    if (!productId) continue;

    const purchaseDate = new Date(now);
    purchaseDate.setUTCDate(now.getUTCDate() - 20);

    await prisma.stockMovement.create({
      data: {
        productId,
        type: StockMovementType.PURCHASE,
        quantity: product.stock + 25,
        reason: 'Opening inventory purchase',
        notes: 'Demo store opening stock',
        actorId: owner.id,
        createdAt: purchaseDate,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        userId: owner.id,
        action: 'BUSINESS_UPDATE',
        entityType: 'BusinessProfile',
        entityId: businessProfileId,
        metadata: {
          name: 'Urban Basket Supermarket',
          currency: 'INR',
        },
      },
      {
        userId: owner.id,
        action: 'CATEGORY_CREATE',
        entityType: 'Category',
        metadata: {
          count: categories.length,
        },
      },
      {
        userId: owner.id,
        action: 'PRODUCT_CREATE',
        entityType: 'Product',
        metadata: {
          count: products.length,
        },
      },
      {
        userId: owner.id,
        action: 'STAFF_CREATE',
        entityType: 'User',
        metadata: {
          count: CASHIERS.length,
        },
      },
    ],
  });

  console.log('');
  console.log('Demo store populated successfully');
  console.log('');
  console.log('Owner:');
  console.log('owner@demo.local');
  console.log('');
  console.log('Cashiers:');
  console.log('cashier1@demo.local / Cashier123!');
  console.log('cashier2@demo.local / Cashier123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
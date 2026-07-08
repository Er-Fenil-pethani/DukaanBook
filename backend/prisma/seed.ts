import {
  PrismaClient,
  Role,
  StockMovementType,
  PaymentMethod,
  SaleStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDateWithinDays(days: number) {
  const now = new Date();
  const result = new Date(now);

  result.setDate(now.getDate() - randInt(0, days - 1));
  result.setHours(randInt(8, 22));
  result.setMinutes(randInt(0, 59));
  result.setSeconds(randInt(0, 59));
  result.setMilliseconds(0);

  return result;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function main() {
  console.log('Starting DukaanBook demo seed...');

  // --------------------------------------------------
  // 1. CLEAR EXISTING DEMO DATA
  // --------------------------------------------------

  console.log('Clearing existing data...');

  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.businessProfile.deleteMany();

  // --------------------------------------------------
  // 2. BUSINESS
  // --------------------------------------------------

  const business = await prisma.businessProfile.create({
    data: {
      name: 'DukaanBook',
      address: 'Main Market, Commercial Area',
      phone: '+92 300 1234567',
      currency: 'PKR',
      taxRate: 0,
    },
  });

  console.log('Business created:', business.name);

  // --------------------------------------------------
  // 3. USERS
  // --------------------------------------------------

  const ownerEmail =
    process.env.SEED_OWNER_EMAIL ?? 'owner@demo.local';

  const ownerPassword =
    process.env.SEED_OWNER_PASSWORD ?? 'Owner123!';

  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      password: await bcrypt.hash(ownerPassword, 10),
      name: 'Demo Owner',
      role: Role.OWNER,
      businessProfileId: business.id,
    },
  });

  const cashierPassword = 'Cashier123!';
  const cashierHash = await bcrypt.hash(cashierPassword, 10);

  const cashierData = [
    {
      name: 'Aarav Sharma',
      email: 'aarav@dukaanbook.local',
    },
    {
      name: 'Sara Khan',
      email: 'sara@dukaanbook.local',
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan@dukaanbook.local',
    },
    {
      name: 'Priya Patel',
      email: 'priya@dukaanbook.local',
    },
    {
      name: 'Kabir Singh',
      email: 'kabir@dukaanbook.local',
    },
    {
      name: 'Ayesha Malik',
      email: 'ayesha@dukaanbook.local',
    },
  ];

  const cashiers = [];

  for (const cashierInfo of cashierData) {
    const cashier = await prisma.user.create({
      data: {
        name: cashierInfo.name,
        email: cashierInfo.email,
        password: cashierHash,
        role: Role.CASHIER,
        businessProfileId: business.id,
      },
    });

    cashiers.push(cashier);
  }

  console.log(`Users created: ${cashiers.length + 1}`);

  // --------------------------------------------------
  // 4. CATEGORIES
  // --------------------------------------------------

  const categoryNames = [
    'Beverages',
    'Snacks',
    'Bakery',
    'Dairy',
    'Stationery',
    'Personal Care',
    'Household',
    'Breakfast',
    'Frozen Foods',
    'Groceries',
  ];

  const categories = [];

  for (const name of categoryNames) {
    const category = await prisma.category.create({
      data: {
        name,
        slug: slugify(name),
      },
    });

    categories.push(category);
  }

  const categoryMap = new Map(
    categories.map((category) => [category.name, category])
  );

  console.log(`Categories created: ${categories.length}`);

  // --------------------------------------------------
  // 5. PRODUCTS
  // --------------------------------------------------

  const productTemplates = [
    ['Cola 500ml', 120, 75, 'Beverages'],
    ['Cola 1.5L', 220, 150, 'Beverages'],
    ['Orange Juice 1L', 280, 195, 'Beverages'],
    ['Apple Juice 1L', 290, 200, 'Beverages'],
    ['Mineral Water 500ml', 50, 25, 'Beverages'],
    ['Mineral Water 1.5L', 90, 50, 'Beverages'],
    ['Energy Drink 250ml', 250, 170, 'Beverages'],
    ['Iced Tea 330ml', 150, 95, 'Beverages'],

    ['Salted Chips', 100, 60, 'Snacks'],
    ['Masala Chips', 100, 60, 'Snacks'],
    ['Chocolate Bar', 180, 110, 'Snacks'],
    ['Cookies Pack', 220, 145, 'Snacks'],
    ['Mixed Nuts 200g', 450, 320, 'Snacks'],
    ['Popcorn Pack', 120, 70, 'Snacks'],
    ['Wafer Biscuits', 80, 45, 'Snacks'],

    ['White Bread', 160, 105, 'Bakery'],
    ['Brown Bread', 190, 125, 'Bakery'],
    ['Croissant', 120, 70, 'Bakery'],
    ['Chocolate Muffin', 140, 85, 'Bakery'],
    ['Vanilla Cupcake', 110, 65, 'Bakery'],
    ['Plain Bagel', 90, 50, 'Bakery'],

    ['Milk 1L', 250, 180, 'Dairy'],
    ['Yogurt 500g', 220, 150, 'Dairy'],
    ['Cheese Slices', 480, 330, 'Dairy'],
    ['Butter 250g', 380, 265, 'Dairy'],
    ['Cream 200ml', 210, 140, 'Dairy'],
    ['Flavored Milk', 140, 90, 'Dairy'],

    ['Notebook A5', 200, 120, 'Stationery'],
    ['Notebook A4', 350, 220, 'Stationery'],
    ['Ballpoint Pen', 40, 20, 'Stationery'],
    ['Gel Pen', 80, 40, 'Stationery'],
    ['Pencil HB', 30, 15, 'Stationery'],
    ['Eraser', 25, 10, 'Stationery'],
    ['Sharpener', 30, 12, 'Stationery'],
    ['Marker Black', 100, 55, 'Stationery'],
    ['Stapler Small', 350, 220, 'Stationery'],

    ['Shampoo 180ml', 420, 310, 'Personal Care'],
    ['Soap Bar', 120, 75, 'Personal Care'],
    ['Toothpaste 150g', 280, 190, 'Personal Care'],
    ['Toothbrush', 180, 110, 'Personal Care'],
    ['Face Wash', 450, 310, 'Personal Care'],
    ['Hand Wash', 320, 220, 'Personal Care'],

    ['Dishwashing Liquid', 300, 210, 'Household'],
    ['Laundry Powder 1kg', 520, 390, 'Household'],
    ['Floor Cleaner 1L', 400, 290, 'Household'],
    ['Tissue Box', 180, 110, 'Household'],
    ['Garbage Bags', 220, 140, 'Household'],
    ['Kitchen Towels', 250, 160, 'Household'],

    ['Corn Flakes', 650, 470, 'Breakfast'],
    ['Oats 500g', 420, 300, 'Breakfast'],
    ['Peanut Butter', 750, 550, 'Breakfast'],
    ['Honey 500g', 900, 670, 'Breakfast'],
    ['Jam Strawberry', 480, 350, 'Breakfast'],
    ['Tea 500g', 950, 720, 'Breakfast'],

    ['Frozen Fries 1kg', 650, 480, 'Frozen Foods'],
    ['Chicken Nuggets', 850, 640, 'Frozen Foods'],
    ['Frozen Paratha Pack', 420, 300, 'Frozen Foods'],
    ['Ice Cream Tub', 700, 500, 'Frozen Foods'],
    ['Frozen Peas', 350, 240, 'Frozen Foods'],

    ['Rice 5kg', 1850, 1500, 'Groceries'],
    ['Wheat Flour 5kg', 750, 590, 'Groceries'],
    ['Sugar 1kg', 180, 145, 'Groceries'],
    ['Cooking Oil 1L', 550, 460, 'Groceries'],
    ['Salt 800g', 80, 45, 'Groceries'],
    ['Red Lentils 1kg', 420, 330, 'Groceries'],
    ['Chickpeas 1kg', 390, 300, 'Groceries'],
    ['Basmati Rice 1kg', 450, 350, 'Groceries'],
  ] as const;

  const products = [];

  for (let index = 0; index < productTemplates.length; index++) {
    const [name, price, costPrice, categoryName] =
      productTemplates[index];

    const category = categoryMap.get(categoryName);

    if (!category) {
      throw new Error(`Category missing: ${categoryName}`);
    }

    const prefix = categoryName
      .substring(0, 3)
      .toUpperCase();

    const stock =
      index % 11 === 0
        ? randInt(0, 5)
        : index % 7 === 0
          ? randInt(6, 10)
          : randInt(20, 120);

    const product = await prisma.product.create({
      data: {
        sku: `${prefix}-${String(index + 1).padStart(3, '0')}`,
        barcode: `8901${String(index + 1).padStart(9, '0')}`,
        name,
        description: `${name} available at DukaanBook.`,
        imageUrl: `/uploads/products/${name}.png`,
        price,
        costPrice,
        stock,
        lowStockThreshold: 10,
        categoryId: category.id,
        active: true,
      },
    });

    products.push(product);

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: StockMovementType.PURCHASE,
        quantity: stock + randInt(20, 80),
        reason: 'Opening inventory purchase',
        notes: 'Demo inventory seed',
        actorId: owner.id,
        createdAt: randomDateWithinDays(45),
      },
    });
  }

  console.log(`Products created: ${products.length}`);

  // --------------------------------------------------
  // 6. SALES
  // --------------------------------------------------

  console.log('Creating sales history...');

  const saleCount = 320;

  const saleDates = Array.from(
    { length: saleCount },
    () => randomDateWithinDays(30)
  ).sort((a, b) => a.getTime() - b.getTime());

  for (let saleIndex = 0; saleIndex < saleCount; saleIndex++) {
    const cashier = randomItem(cashiers);

    const itemCount = randInt(1, 5);

    const selectedProducts = shuffle(products).slice(
      0,
      itemCount
    );

    const saleItems = selectedProducts.map((product) => {
      const quantity = randInt(1, 4);
      const price = Number(product.price);
      const lineTotal = price * quantity;

      return {
        productId: product.id,
        productName: product.name,
        productPrice: price,
        quantity,
        lineTotal,
      };
    });

    const subtotal = saleItems.reduce(
      (total, item) => total + item.lineTotal,
      0
    );

    const taxAmount = 0;
    const total = subtotal + taxAmount;

    const createdAt = saleDates[saleIndex];

    const isRefunded = Math.random() < 0.04;

    const saleNumber = `S-${createdAt
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${String(saleIndex + 1).padStart(5, '0')}`;

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        cashierId: cashier.id,
        subtotal,
        taxAmount,
        total,
        paymentMethod:
          Math.random() < 0.68
            ? PaymentMethod.CASH
            : PaymentMethod.CARD,
        status: isRefunded
          ? SaleStatus.REFUNDED
          : SaleStatus.COMPLETED,
        refundedAt: isRefunded
          ? new Date(createdAt.getTime() + randInt(1, 48) * 60 * 60 * 1000)
          : null,
        refundReason: isRefunded
          ? randomItem([
              'Customer changed mind',
              'Wrong item selected',
              'Damaged packaging',
              'Duplicate transaction',
            ])
          : null,
        createdAt,
        items: {
          create: saleItems,
        },
      },
    });

    for (const item of saleItems) {
      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: isRefunded
            ? StockMovementType.RETURN
            : StockMovementType.SALE,
          quantity: isRefunded
            ? item.quantity
            : -item.quantity,
          reason: isRefunded
            ? `Refund for ${sale.saleNumber}`
            : `Sale ${sale.saleNumber}`,
          actorId: cashier.id,
          createdAt,
        },
      });
    }

    if (saleIndex % 40 === 0) {
      console.log(
        `Created ${saleIndex + 1}/${saleCount} sales`
      );
    }
  }

  console.log(`Sales created: ${saleCount}`);

  // --------------------------------------------------
  // 7. EXTRA STOCK MOVEMENTS
  // --------------------------------------------------

  console.log('Creating inventory activity...');

  for (let index = 0; index < 80; index++) {
    const product = randomItem(products);

    const movementType = randomItem([
      StockMovementType.PURCHASE,
      StockMovementType.ADJUSTMENT,
      StockMovementType.DAMAGE,
    ]);

    let quantity = randInt(1, 20);

    if (
      movementType === StockMovementType.DAMAGE ||
      movementType === StockMovementType.ADJUSTMENT
    ) {
      quantity = -randInt(1, 4);
    }

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: movementType,
        quantity,
        reason:
          movementType === StockMovementType.PURCHASE
            ? 'Supplier stock delivery'
            : movementType === StockMovementType.DAMAGE
              ? 'Damaged stock removed'
              : 'Physical stock reconciliation',
        notes: 'Demo inventory activity',
        actorId:
          Math.random() < 0.7
            ? owner.id
            : randomItem(cashiers).id,
        createdAt: randomDateWithinDays(30),
      },
    });
  }

  // --------------------------------------------------
  // 8. AUDIT LOGS
  // --------------------------------------------------

  console.log('Creating audit history...');

  const allUsers = [owner, ...cashiers];

  const auditTemplates = [
    {
      action: 'LOGIN',
      entityType: 'USER',
    },
    {
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
    },
    {
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
    },
    {
      action: 'STOCK_ADJUSTED',
      entityType: 'PRODUCT',
    },
    {
      action: 'SALE_COMPLETED',
      entityType: 'SALE',
    },
    {
      action: 'SALE_REFUNDED',
      entityType: 'SALE',
    },
    {
      action: 'CATEGORY_UPDATED',
      entityType: 'CATEGORY',
    },
  ];

  for (let index = 0; index < 180; index++) {
    const user = randomItem(allUsers);
    const template = randomItem(auditTemplates);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: template.action,
        entityType: template.entityType,
        metadata: {
          source: 'DukaanBook POS',
          description: `${template.action
            .toLowerCase()
            .replace(/_/g, ' ')} by ${user.name}`,
        },
        ipAddress: `192.168.1.${randInt(2, 200)}`,
        createdAt: randomDateWithinDays(30),
      },
    });
  }

  console.log('Audit logs created: 180');

  // --------------------------------------------------
  // DONE
  // --------------------------------------------------

  console.log('\n======================================');
  console.log('DUKAANBOOK DEMO DATABASE READY');
  console.log('======================================');

  console.log(`Owner: ${ownerEmail} / ${ownerPassword}`);

  console.log(
    `Cashier: ${cashierData[0].email} / ${cashierPassword}`
  );

  console.log(`${cashiers.length + 1} users`);
  console.log(`${categories.length} categories`);
  console.log(`${products.length} products`);
  console.log(`${saleCount} sales`);
  console.log('80 additional inventory movements');
  console.log('180 audit logs');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
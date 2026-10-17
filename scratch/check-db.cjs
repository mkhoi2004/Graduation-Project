const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Adding CHECK constraints to SQL Server...');

  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MedicalSupply_inStock')
      BEGIN
        ALTER TABLE MedicalSupply ADD CONSTRAINT CK_MedicalSupply_inStock CHECK (inStock >= 0);
        PRINT 'Added CK_MedicalSupply_inStock';
      END
    `);
    console.log('CK_MedicalSupply_inStock ensured!');
  } catch (err) {
    console.error('Error adding CK_MedicalSupply_inStock:', err);
  }

  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MedicalSupplyDeleted_inStock')
      BEGIN
        ALTER TABLE MedicalSupplyDeleted ADD CONSTRAINT CK_MedicalSupplyDeleted_inStock CHECK (inStock >= 0);
        PRINT 'Added CK_MedicalSupplyDeleted_inStock';
      END
    `);
    console.log('CK_MedicalSupplyDeleted_inStock ensured!');
  } catch (err) {
    console.error('Error adding CK_MedicalSupplyDeleted_inStock:', err);
  }

  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ExaminationSupply_quantity')
      BEGIN
        ALTER TABLE ExaminationSupply ADD CONSTRAINT CK_ExaminationSupply_quantity CHECK (quantityInBaseUnit > 0);
        PRINT 'Added CK_ExaminationSupply_quantity';
      END
    `);
    console.log('CK_ExaminationSupply_quantity ensured!');
  } catch (err) {
    console.error('Error adding CK_ExaminationSupply_quantity:', err);
  }

  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SupplyReservation_quantity')
      BEGIN
        ALTER TABLE SupplyReservation ADD CONSTRAINT CK_SupplyReservation_quantity CHECK (quantity > 0);
        PRINT 'Added CK_SupplyReservation_quantity';
      END
    `);
    console.log('CK_SupplyReservation_quantity ensured!');
  } catch (err) {
    console.error('Error adding CK_SupplyReservation_quantity:', err);
  }

  const checkConstraints = await prisma.$queryRawUnsafe(`
    SELECT name, definition 
    FROM sys.check_constraints 
    WHERE parent_object_id IN (OBJECT_ID('MedicalSupply'), OBJECT_ID('ExaminationSupply'), OBJECT_ID('SupplyReservation'))
  `);
  console.log('Active CHECK CONSTRAINTS:', checkConstraints);
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

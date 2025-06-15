// src/scripts/seedUser.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10); // Cambia la contraseña si lo deseas

  const user = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      company: {
        connect: { id: 1 }, // Asegúrate de que exista la company con ID 1
      },
      userName:"jaldanatest"
    },
  });

  console.log('Usuario creado:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

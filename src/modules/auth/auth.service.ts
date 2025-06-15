import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function validateUser(email: string, password: string) {
  console.log("🚀 ~ validateUser ~ password:", password)
  console.log("🚀 ~ validateUser ~ email:", email)
  // 1. Buscar el usuario por email
  const user = await prisma.user.findUnique({
    where: { email },
  });
  console.log("🚀 ~ validateUser ~ user:", user)

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // 2. Validar la contraseña usando bcrypt
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error("Contraseña incorrecta");
  }

  // 3. Devolver el usuario si todo está bien
  return user;
}

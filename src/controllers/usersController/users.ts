// src/controllers/userController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../../src/prisma/prisma";

export const registerUser = async (req: Request, res: Response) => {
  const { email, password, companyId } = req.body;

  if (!email || !password || !companyId) {
    return res.status(400).json({ message: "Faltan datos requeridos." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "El correo ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        companyId,
      },
    });

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      companyId: newUser.companyId,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const user = req.params.userName;
  const { email, password, companyId,userName } = req.body;

  if (!user) {
    return res.status(400).json({ message: 'usuario inválido.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { userName: userName } });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verifica si el nuevo email ya existe en otro usuario
    if (userName && userName !== user.userName) {
      const userNameExists = await prisma.user.findUnique({ where: { email } });
      if (userNameExists) {
        return res.status(409).json({ message: 'El nombre de usuario ya está en uso por otro usuario.' });
      }
    }

    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { userName: userName },
      data: {
        email,
        password: hashedPassword,
        companyId,
      },
    });

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      companyId: updatedUser.companyId,
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};
export async function getUserByUserName(userName: string){
  try {
    const user = await prisma.user.findUnique({
      where: {  userName },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  } catch (error) {
    console.error('Error fetching user by userName:', error);
    throw new Error('Could not fetch user');
  }
}
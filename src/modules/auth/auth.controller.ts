// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { loginSchema } from "./auth.schema";
import jwt from "jsonwebtoken";
import { validateUser } from "./auth.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validar cuerpo de la solicitud con Zod
    const { email, password } = loginSchema.parse(req.body);

    // Validar credenciales
    const user = await validateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Crear payload del token
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    };

    // Firmar JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });

    return res.status(200).json({ status: "success", token });
  } catch (error) {
    next(error);
  }
};

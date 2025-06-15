// src/routes/userRoutes.ts
import { Router } from "express";
import {
  getUserByUserName,
  registerUser,
  updateUser,
} from "../controllers/usersController/users";
import { asyncHandler } from "../core/utils/asyncHandler";

const router = Router();

router.get("/getUser/:userName", async (req, res) => {
  try {
    const user = await getUserByUserName(req.params.userName);
    res.json(user);
  } catch (error) {
    res.status(204).json({ message: "Usuario no encontrado" });
  }
});
router.post("/register", asyncHandler(registerUser));
router.put("/updateUser:userName", asyncHandler(updateUser));

export default router;

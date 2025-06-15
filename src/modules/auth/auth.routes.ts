import { Router } from "express";
import { login } from "./auth.controller";
import { asyncHandler } from "../../core/utils/asyncHandler";

const router = Router();

router.post("/login", asyncHandler(login));

export default router;
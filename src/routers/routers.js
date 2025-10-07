import express from "express";
import {
  handleCreateUser,
  handleLoginUser,
  handleLogout,
  handleRefreshToken,
} from "../controllers/userController.js";
import { isLoggedIn } from "../middleware/authMiddleware.js";
import { handleCreateCustomerSupplier } from "../controllers/customerSupplierController.js";
import { handleGetBrand } from "../controllers/brandController.js";

export const apiRouter = express.Router();

apiRouter.post("/users/auth/register-user", handleCreateUser);
apiRouter.post("/users/auth/login", handleLoginUser);
apiRouter.get("/users/auth/manage-token", handleRefreshToken);
apiRouter.post("/users/auth/logout", isLoggedIn, handleLogout);

//brand
apiRouter.get("/brands/get-brand-info", isLoggedIn, handleGetBrand);

//tally
apiRouter.post("/cs/create", isLoggedIn, handleCreateCustomerSupplier);

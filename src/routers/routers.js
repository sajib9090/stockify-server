import express from "express";
import {
  handleCreateUser,
  handleLoginUser,
  handleLogout,
  handleRefreshToken,
} from "../controllers/userController.js";
import { isLoggedIn } from "../middleware/authMiddleware.js";
import {
  handleAddBrand,
  handleGetBrand,
} from "../controllers/brandController.js";
import {
  handleCreateClient,
  handleEditClientById,
  handleGetClientById,
  handleGetClients,
  handleRemoveClientById,
} from "../controllers/clientController.js";
import {
  handleAddTransaction,
  handleDeleteTransaction,
  handleGetTransactionById,
  handleGetTransactions,
} from "../controllers/transactionController.js";
import { upload } from "../middleware/multer.js";

export const apiRouter = express.Router();

apiRouter.post("/users/auth/register-user", handleCreateUser);
apiRouter.post("/users/auth/login", handleLoginUser);
apiRouter.get("/users/auth/manage-token", handleRefreshToken);
apiRouter.post("/users/auth/logout", isLoggedIn, handleLogout);

//brand
apiRouter.post("/brands/create-brand", isLoggedIn, handleAddBrand);
apiRouter.get("/brands/get-brand-info", isLoggedIn, handleGetBrand);

//tally
apiRouter.post("/clients/create-client", isLoggedIn, handleCreateClient);
apiRouter.get("/clients/get-clients", isLoggedIn, handleGetClients);
apiRouter.get("/clients/get-client/:id", isLoggedIn, handleGetClientById);
apiRouter.delete(
  "/clients/delete-client/:id",
  upload.single("avatar"),
  isLoggedIn,
  handleRemoveClientById
);
apiRouter.put(
  "/clients/edit-client/:id",
  upload.single("avatar"),
  isLoggedIn,
  handleEditClientById
);

//transactions
apiRouter.post(
  "/transactions/add-transaction/:id",
  isLoggedIn,
  handleAddTransaction
);
apiRouter.get(
  "/transactions/get-transactions/:id",
  isLoggedIn,
  handleGetTransactions
);
apiRouter.get(
  "/transactions/get-transaction/:transactionId",
  isLoggedIn,
  handleGetTransactionById
);
apiRouter.delete(
  "/transactions/delete-transaction/:id",
  isLoggedIn,
  handleDeleteTransaction
);

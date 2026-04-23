import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import transactionRoutes from "./routes/transactions.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Smart Expense Tracker API is running." });
});

app.use("/api/transactions", transactionRoutes);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});


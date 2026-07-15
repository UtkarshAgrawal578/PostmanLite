import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); 
console.log("CORS origin set to:", process.env.CLIENT_URL);
export default cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "QUERY"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
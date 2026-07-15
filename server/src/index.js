import express from "express";
import dotenv from "dotenv";
import corsConfig from "./config/cors.js";
import relayroute from "./routes/relay.route.js";
const app=express();

const PORT = process.env.PORT || 5000;
app.use(corsConfig);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Postman Lite relay is running" });
});

app.use("/api/relay",relayroute);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

app.listen(PORT, () => {
  console.log(`Postman Lite relay running on http://localhost:${PORT}`);
});
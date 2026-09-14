import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.post("/api/measurements", (req, res) => {
  console.log("Measurement received:");
  console.log(req.body);

  res.status(201).json({
    success: true,
    measurement: req.body,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
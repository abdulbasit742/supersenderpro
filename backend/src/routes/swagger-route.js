const express = require("express");
const router  = express.Router();

// GET /api-docs.json  — raw OpenAPI spec
router.get("/api-docs.json", (req, res) => {
  try {
    const { getSwaggerSpec } = require("../swagger");
    res.json(getSwaggerSpec());
  } catch {
    res.status(503).json({ error: "API docs not available" });
  }
});

// Serve Swagger UI at /api-docs
router.use("/api-docs", (req, res, next) => {
  try {
    const swaggerUi = require("swagger-ui-express");
    const { getSwaggerSpec } = require("../swagger");
    swaggerUi.setup(getSwaggerSpec())(req, res, next);
  } catch {
    res.status(503).send("<h1>API Docs</h1><p>swagger-ui-express not installed. Run: npm install swagger-ui-express swagger-jsdoc</p>");
  }
});

router.get("/api-docs", (req, res, next) => {
  try {
    const swaggerUi = require("swagger-ui-express");
    const { getSwaggerSpec } = require("../swagger");
    swaggerUi.serve[0](req, res, () => swaggerUi.setup(getSwaggerSpec())(req, res, next));
  } catch {
    res.status(503).send("<h1>API Docs</h1><p>swagger-ui-express not installed. Run: npm install swagger-ui-express swagger-jsdoc</p>");
  }
});

module.exports = router;
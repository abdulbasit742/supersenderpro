const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title:       "SuperSender Pro API",
      version:     "1.0.0",
      description: "AI Tools Business Command Center — WhatsApp CRM + Payment Parser + Dealer Intelligence",
      contact: { name: "SuperSender Pro", url: "https://github.com/abdulbasit742/supersenderpro" },
      license: { name: "MIT" },
    },
    servers: [
      { url: "http://localhost:3001",   description: "Local Development" },
      { url: "https://your-domain.com", description: "Production"        },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error:   { type: "string" },
            code:    { type: "string" },
            errorId: { type: "string" },
          }
        },
        User: {
          type: "object",
          properties: {
            id:    { type: "string" },
            name:  { type: "string" },
            email: { type: "string", format: "email" },
            role:  { type: "string", enum: ["ADMIN", "SALES", "SUPPORT"] },
          }
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email:    { type: "string", format: "email",    example: "admin@example.com" },
            password: { type: "string", format: "password", example: "yourpassword"      },
          }
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT Bearer token" },
            user:  { "": "#/components/schemas/User" },
          }
        },
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth",       description: "Authentication & user management" },
      { name: "Customers",  description: "Customer management"              },
      { name: "Orders",     description: "Order management"                 },
      { name: "Stock",      description: "Inventory management"             },
      { name: "Dealers",    description: "Dealer intelligence"              },
      { name: "Payments",   description: "Payment verification"             },
      { name: "Rates",      description: "AI tools pricing"                 },
      { name: "Analytics",  description: "Business analytics"               },
      { name: "WhatsApp",   description: "WhatsApp bot control"             },
      { name: "Broadcast",  description: "Group broadcasting"               },
      { name: "Monitoring", description: "System health & metrics"          },
    ],
  },
  apis: ["./src/routes/*.js"],
};

function getSwaggerSpec() {
  try {
    return swaggerJsdoc(options);
  } catch (err) {
    console.warn("[Swagger] Failed to generate spec:", err.message);
    return { openapi: "3.0.0", info: { title: "SuperSender Pro API", version: "1.0.0" }, paths: {} };
  }
}

module.exports = { getSwaggerSpec, swaggerOptions: options };
'use strict';
// Churn Predictor config. All env-driven, safe defaults. Zero deps.
module.exports = {
  // Days of silence after which recency starts hurting the score hard.
  recencyWindowDays: Number(process.env.CHURN_RECENCY_DAYS || 30),
  // Above this score (0-100) a contact is flagged at-risk.
  riskThreshold: Number(process.env.CHURN_RISK_THRESHOLD || 60),
  // Score weights (must roughly sum to 100). Deterministic, explainable.
  weights: {
    recency: Number(process.env.CHURN_W_RECENCY || 45),
    frequency: Number(process.env.CHURN_W_FREQUENCY || 25),
    monetary: Number(process.env.CHURN_W_MONETARY || 15),
    engagement: Number(process.env.CHURN_W_ENGAGEMENT || 15)
  },
  // Optional Ollama enrichment for a human win-back note. Off => template.
  useModel: String(process.env.CHURN_USE_MODEL || 'true') === 'true',
  currency: process.env.CURRENCY || 'PKR',
  locale: process.env.LOCALE || 'ur-PK'
};

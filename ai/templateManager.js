// Automated Message Template System

const fs = require('fs');
const path = require('path');
const { extractMergeFields, renderMergeFields } = require('../lib/mergeFields');

/**
 * Template Manager for creating and managing message templates
 */
class TemplateManager {
  constructor() {
    this.dataFile = path.join(__dirname, '..', 'data', 'templates.json');
    const defaults = {
      welcome: {
        id: 'welcome',
        name: 'Welcome Message',
        content: 'Hi {{name}}! Welcome to {{business_name}}. How can I assist you today?',
        variables: ['name', 'business_name'],
        category: 'greeting',
        isActive: true
      },
      followUp: {
        id: 'followUp',
        name: 'Follow-Up Message',
        content: 'Hi {{name}}, just checking in to see if you found what you were looking for? We have new {{product_type}} arrivals!',
        variables: ['name', 'product_type'],
        category: 'followup',
        isActive: true
      },
      promotion: {
        id: 'promotion',
        name: 'Promotional Offer',
        content: 'Special offer for {{name}}! Get {{discount}}% off on {{product_name}}. Valid until {{expiry_date}}.',
        variables: ['name', 'discount', 'product_name', 'expiry_date'],
        category: 'promotion',
        isActive: true
      },
      appointmentReminder: {
        id: 'appointmentReminder',
        name: 'Appointment Reminder',
        content: 'Hello {{name}}, this is a reminder for your appointment on {{date}} at {{time}}. Please reply to confirm.',
        variables: ['name', 'date', 'time'],
        category: 'reminder',
        isActive: true
      },
      feedbackRequest: {
        id: 'feedbackRequest',
        name: 'Feedback Request',
        content: 'Hi {{name}}! We hope you enjoyed your experience. Could you take a moment to share your feedback?',
        variables: ['name'],
        category: 'feedback',
        isActive: true
      }
    };
    this.templates = { ...defaults, ...this.loadPersistedTemplates() };
  }

  loadPersistedTemplates() {
    try {
      if (!fs.existsSync(this.dataFile)) return {};
      const raw = fs.readFileSync(this.dataFile, 'utf8').trim();
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc, template) => {
          if (template && template.id) acc[template.id] = template;
          return acc;
        }, {});
      }
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.warn('[TemplateManager] Could not load templates.json:', error.message);
      return {};
    }
  }

  saveTemplates() {
    try {
      fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
      fs.writeFileSync(this.dataFile, JSON.stringify(this.templates, null, 2));
    } catch (error) {
      console.warn('[TemplateManager] Could not save templates.json:', error.message);
    }
  }

  /**
   * Get all templates
   * @returns {Object} - All templates
   */
  getAllTemplates() {
    return this.templates;
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} - Template or null if not found
   */
  getTemplateById(templateId) {
    return this.templates[templateId] || null;
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @returns {Array} - Templates in the specified category
   */
  getTemplatesByCategory(category) {
    return Object.values(this.templates).filter(t => t.category === category);
  }

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @returns {Object} - Created template
   */
  createTemplate(templateData) {
    const templateId = templateData.id || this.generateTemplateId(templateData.name);
    
    const template = {
      id: templateId,
      name: templateData.name,
      content: templateData.content,
      variables: templateData.variables || this.extractVariables(templateData.content),
      category: templateData.category || 'general',
      isActive: templateData.isActive !== undefined ? templateData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.templates[templateId] = template;
    this.saveTemplates();
    return template;
  }

  /**
   * Update an existing template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} - Updated template or null if not found
   */
  updateTemplate(templateId, updates) {
    const template = this.templates[templateId];
    if (!template) return null;
    
    // Update fields
    Object.assign(template, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Re-extract variables if content changed
    if (updates.content) {
      template.variables = this.extractVariables(updates.content);
    }
    
    this.templates[templateId] = template;
    this.saveTemplates();
    return template;
  }

  /**
   * Delete a template
   * @param {string} templateId - Template ID
   * @returns {boolean} - True if deleted
   */
  deleteTemplate(templateId) {
    if (!this.templates[templateId]) return false;
    delete this.templates[templateId];
    this.saveTemplates();
    return true;
  }

  /**
   * Render a template with variables
   * @param {string} templateId - Template ID
   * @param {Object} variables - Variables to substitute
   * @returns {string} - Rendered template or error message
   */
  renderTemplate(templateId, variables = {}) {
    const template = this.templates[templateId];
    if (!template) {
      return `Template not found: ${templateId}`;
    }
    
    if (!template.isActive) {
      return `Template is inactive: ${templateId}`;
    }
    
    try {
      return renderMergeFields(template.content, variables).trim();
    } catch (error) {
      console.error('Template rendering error:', error);
      return `Error rendering template: ${error.message}`;
    }
  }

  /**
   * Extract variable names from template content
   * @param {string} content - Template content
   * @returns {Array} - Variable names
   */
  extractVariables(content) {
    return extractMergeFields(content);
  }

  /**
   * Generate a template ID from name
   * @param {string} name - Template name
   * @returns {string} - Generated ID
   */
  generateTemplateId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get template categories
   * @returns {Array} - Unique categories
   */
  getCategories() {
    return [...new Set(Object.values(this.templates).map(t => t.category))];
  }
}

// Export singleton instance
const templateManager = new TemplateManager();
module.exports = templateManager;

// Also export the class for flexibility
module.exports.TemplateManager = TemplateManager;

// CSV Customer Importer Module

const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

class CSVImporter {
  constructor(dataDir) {
    this.dataDir = dataDir;
  }

  /**
   * Parse CSV string to array of objects
   * Expected headers: name, number, status, tags (comma-separated), buyerIntent
   */
  parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });

      // Transform tags from string to array
      if (obj.tags) {
        obj.tags = obj.tags.split(';').map(t => t.trim()).filter(t => t);
      } else {
        obj.tags = [];
      }

      // Ensure required fields
      if (obj.number && obj.name) {
        obj.id = uuid();
        obj.created = new Date().toISOString();
        obj.messageCount = 0;
        obj.lastActive = null;
        if (!obj.status) obj.status = 'lead';
        if (!obj.buyerIntent) obj.buyerIntent = 'COLD';
        data.push(obj);
      }
    }
    return data;
  }

  /**
   * Load customers from file
   */
  loadCustomers() {
    try {
      return require(path.join(this.dataDir, 'customers.json'));
    } catch (e) {
      return [];
    }
  }

  /**
   * Save customers to file
   */
  saveCustomers(customers) {
    fs.writeFileSync(path.join(this.dataDir, 'customers.json'), JSON.stringify(customers, null, 2));
  }

  /**
   * Import customers from CSV string
   * @returns {Object} - { imported: number, existing: number, errors: [] }
   */
  importFromString(csvContent, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;
    const toImport = this.parseCSV(csvContent);
    const customers = this.loadCustomers();
    const results = { imported: 0, existing: 0, errors: [] };

    toImport.forEach(c => {
      const existingIdx = customers.findIndex(x => x.number === c.number);
      if (existingIdx !== -1) {
        if (skipDuplicates) {
          results.existing++;
          return;
        }
        if (updateExisting) {
          customers[existingIdx] = { ...customers[existingIdx], ...c };
          results.imported++;
        } else {
          results.existing++;
        }
      } else {
        customers.push(c);
        results.imported++;
      }
    });

    this.saveCustomers(customers);
    return results;
  }

  /**
   * Import customers from CSV file path
   */
  importFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return this.importFromString(content);
  }

  /**
   * Generate sample CSV template
   */
  generateTemplate() {
    const headers = ['name', 'number', 'status', 'tags', 'buyerIntent'];
    const sample = `name,number,status,tags,buyerIntent
Ali Khan,923001234567,lead,new;interested,HOT
Sara Ahmed,923009876543,customer,,WARM`;

    return { headers, sample };
  }

  /**
   * Validate a CSV before import
   */
  validateCSV(csvContent) {
    const lines = csvContent.split('\n').filter(l => l.trim());
    const errors = [];
    const warnings = [];

    if (lines.length < 2) {
      errors.push('CSV is empty or has no data rows');
      return { valid: false, errors, warnings };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['name', 'number'];
    required.forEach(req => {
      if (!headers.includes(req)) {
        errors.push(`Missing required column: ${req}`);
      }
    });

    if (!errors.length) {
      const nameIdx = headers.indexOf('name');
      const numIdx = headers.indexOf('number');
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        if (!vals[nameIdx] || !vals[numIdx]) {
          errors.push(`Row ${i + 1}: Missing required fields`);
        } else if (!/^92\d{10}$/.test(vals[numIdx])) {
          warnings.push(`Row ${i + 1}: Phone number should be in Pakistan format (92xxxxxxxxxx)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedRows: lines.length - 1
    };
  }
}

module.exports = CSVImporter;
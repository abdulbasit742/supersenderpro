// Backup and Export Manager for SuperSender Pro

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

function psQuote(value = '') {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function folderSizeBytes(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(targetPath)) {
    total += folderSizeBytes(path.join(targetPath, entry));
  }
  return total;
}

/**
 * Backup Manager for creating and managing data backups
 */
class BackupManager {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.backupDir = path.join(dataDir, 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a full backup of all data files
   * @returns {Object} - Backup info
   */
  createFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = uuidv4();
    const backupName = `backup-${timestamp}-${backupId}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    // Create backup directory
    fs.mkdirSync(backupPath);
    
    // List of files to backup
    const filesToBackup = [
      'settings.json',
      'customers.json',
      'wa_conversations.json',
      'laptop_products.json',
      'laptop_leads.json',
      'followups.json',
      'reminders.json',
      'seq_subs.json'
    ];
    
    const backedUpFiles = [];
    const errors = [];
    
    filesToBackup.forEach(file => {
      try {
        const sourcePath = path.join(this.dataDir, file);
        const destPath = path.join(backupPath, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          backedUpFiles.push(file);
        } else {
          // Create empty file if it doesn't exist
          fs.writeFileSync(destPath, '{}');
          backedUpFiles.push(file);
        }
      } catch (error) {
        errors.push({ file, error: error.message });
      }
    });
    
    // Create backup manifest
    const manifest = {
      backupId,
      timestamp: new Date().toISOString(),
      files: backedUpFiles,
      errors,
      version: '3.0.0'
    };
    
    fs.writeFileSync(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Create ZIP archive
    const zipPath = `${backupPath}.zip`;
    try {
      const { execFileSync } = require('child_process');
      const command = [
        'Add-Type -AssemblyName System.IO.Compression.FileSystem',
        `if (Test-Path -LiteralPath ${psQuote(zipPath)}) { Remove-Item -LiteralPath ${psQuote(zipPath)} -Force }`,
        `[System.IO.Compression.ZipFile]::CreateFromDirectory(${psQuote(backupPath)}, ${psQuote(zipPath)})`
      ].join('; ');
      execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { stdio: 'pipe' });
      
      // Clean up directory after successful zip
      fs.rmSync(backupPath, { recursive: true, force: true });
      
      return {
        success: true,
        backupId,
        backupName: `${backupName}.zip`,
        backupPath: zipPath,
        manifest
      };
    } catch (error) {
      // If ZIP fails, return directory backup
      return {
        success: true,
        backupId,
        backupName,
        backupPath,
        manifest,
        warning: `ZIP creation failed, backup saved as directory: ${error.message}`
      };
    }
  }

  /**
   * List all available backups
   * @returns {Array} - List of backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = [];
      
      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        let backupInfo = {
          name: file,
          path: filePath,
          size: folderSizeBytes(filePath),
          created: stats.birthtime,
          modified: stats.mtime
        };
        
        // If it's a ZIP file, try to read manifest
        if (file.endsWith('.zip')) {
          // For ZIP files, we'd need to extract manifest - simplified for now
          backupInfo.type = 'zip';
        } else if (fs.existsSync(path.join(filePath, 'manifest.json'))) {
          try {
            const manifest = JSON.parse(fs.readFileSync(path.join(filePath, 'manifest.json'), 'utf8'));
            backupInfo.manifest = manifest;
            backupInfo.type = 'directory';
          } catch (e) {
            backupInfo.type = 'directory';
            backupInfo.manifestError = e.message;
          }
        } else {
          backupInfo.type = 'unknown';
        }
        
        backups.push(backupInfo);
      });
      
      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Restore from a backup
   * @param {string} backupIdentifier - Backup name or ID
   * @returns {Object} - Restore result
   */
  restoreBackup(backupIdentifier) {
    try {
      let backupPath;
      
      // Check if it's a ZIP file
      const zipPath = path.join(this.backupDir, `${backupIdentifier}.zip`);
      if (fs.existsSync(zipPath)) {
        backupPath = zipPath;
      } else {
        // Check if it's a directory
        const dirPath = path.join(this.backupDir, backupIdentifier);
        if (fs.existsSync(dirPath)) {
          backupPath = dirPath;
        } else {
          // Look for exact match in files
          const files = fs.readdirSync(this.backupDir);
          const match = files.find(f => 
            f === backupIdentifier || 
            f.replace('.zip', '') === backupIdentifier ||
            f.includes(backupIdentifier)
          );
          
          if (match) {
            backupPath = path.join(this.backupDir, match);
          } else {
            throw new Error(`Backup not found: ${backupIdentifier}`);
          }
        }
      }
      
      // If it's a ZIP file, extract it first
      let restorePath = backupPath;
      if (backupPath.endsWith('.zip')) {
        const extractDir = path.join(this.backupDir, `temp_${uuidv4()}`);
        fs.mkdirSync(extractDir);
        
        try {
          const { execSync } = require('child_process');
          execSync(`powershell Expand-Archive -Path "${backupPath}" -DestinationPath "${extractDir}"`);
          restorePath = extractDir;
        } catch (extractError) {
          throw new Error(`Failed to extract backup: ${extractError.message}`);
        }
      }
      
      // Read manifest
      const manifestPath = path.join(restorePath, 'manifest.json');
      let manifest = {};
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      }
      
      // Restore each file
      const restoredFiles = [];
      const errors = [];
      
      const filesToRestore = manifest.files || [
        'settings.json',
        'customers.json',
        'wa_conversations.json',
        'laptop_products.json',
        'laptop_leads.json',
        'followups.json',
        'reminders.json',
        'seq_subs.json'
      ];
      
      filesToRestore.forEach(file => {
        try {
          const sourcePath = path.join(restorePath, file);
          const destPath = path.join(this.dataDir, file);
          
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            restoredFiles.push(file);
          }
        } catch (error) {
          errors.push({ file, error: error.message });
        }
      });
      
      // Clean up temporary extraction directory
      if (backupPath.endsWith('.zip') && fs.existsSync(restorePath)) {
        const rimraf = require('rimraf');
        rimraf.sync(restorePath);
      }
      
      return {
        success: true,
        restoredFiles,
        errors,
        manifest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export customers to Excel format
   * @returns {string} - Path to exported file
   */
  exportCustomersToExcel() {
    try {
      const customers = require('../data/customers.json');
      
      // Prepare data for export
      const exportData = customers.map(customer => ({
        'ID': customer.id,
        'Name': customer.name,
        'Number': customer.number,
        'Status': customer.status,
        'Tags': (customer.tags || []).join(', '),
        'Message Count': customer.messageCount || 0,
        'Last Active': customer.lastActive || '',
        'Buyer Intent': customer.buyerIntent || '',
        'Created': customer.created || ''
      }));
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `customers_export_${timestamp}.xlsx`;
      const filePath = path.join(this.backupDir, filename);
      
      // Write file
      XLSX.writeFile(wb, filePath);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export customers to Excel: ${error.message}`);
    }
  }

  /**
   * Export conversations to PDF format
   * @param {string} customerNumber - Optional customer number to filter
   * @returns {string} - Path to exported file
   */
  exportConversationsToPDF(customerNumber) {
    try {
      const conversations = require('../data/wa_conversations.json');
      
      // Filter conversations if customer number provided
      let filteredConversations = conversations;
      if (customerNumber) {
        filteredConversations = {};
        if (conversations[customerNumber]) {
          filteredConversations[customerNumber] = conversations[customerNumber];
        }
      }
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = customerNumber 
        ? `conversation_${customerNumber}_${timestamp}.pdf` 
        : `conversations_export_${timestamp}.pdf`;
      const filePath = path.join(this.backupDir, filename);
      
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
      
      // Add header
      doc.fontSize(20).text('WhatsApp Conversations Export', { align: 'center' });
      doc.moveDown();
      if (customerNumber) {
        doc.fontSize(14).text(`Customer Number: ${customerNumber}`, { align: 'center' });
        doc.moveDown();
      }
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();
      
      // Add conversations
      Object.entries(filteredConversations).forEach(([number, conv]) => {
        doc.fontSize(16).text(`Conversation with: ${number}`, { underline: true });
        doc.moveDown();
        
        if (conv.history && conv.history.length > 0) {
          conv.history.forEach(msg => {
            const role = msg.role === 'user' ? 'Customer' : 'Bot';
            const time = new Date(msg.time).toLocaleString();
            doc.fontSize(10)
              .text(`${role} [${time}]:`, { continued: true })
              .text(` ${msg.msg}`);
            doc.moveDown(0.5);
          });
        } else {
          doc.text('No messages in this conversation.');
          doc.moveDown();
        }
        
        doc.moveDown();
        doc.drawText('---', { align: 'center' });
        doc.moveDown();
      });
      
      // Finalize PDF
      doc.end();
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => resolve(filePath));
        writeStream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to export conversations to PDF: ${error.message}`);
    }
  }

  /**
   * Get backup storage statistics
   * @returns {Object} - Storage stats
   */
  getStorageStats() {
    try {
      const backupDir = this.backupDir;
      if (!fs.existsSync(backupDir)) {
        return { totalSize: 0, fileCount: 0 };
      }
      
      let totalSize = 0;
      let fileCount = 0;
      
      const files = fs.readdirSync(backupDir);
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        totalSize += folderSizeBytes(filePath);
        fileCount++;
      });
      
      return {
        totalSize,
        fileCount,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalSize: 0, fileCount: 0, error: error.message };
    }
  }
}

// Initialize backup manager with data directory
const dataDir = path.join(__dirname, '..', 'data');
const backupManager = new BackupManager(dataDir);

module.exports = backupManager;
// Also export class for direct instantiation
module.exports.BackupManager = BackupManager;

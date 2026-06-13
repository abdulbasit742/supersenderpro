// Workflow Automation Engine for complex message sequences

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

/**
 * Workflow Engine for creating and executing automated message sequences
 */
class WorkflowEngine {
  constructor(dataDir, messageAnalytics, templateManager, customerSegmentation) {
    this.dataDir = dataDir;
    this.workflowsFile = path.join(dataDir, 'workflows.json');
    this.executionsFile = path.join(dataDir, 'workflow_executions.json');
    this.messageAnalytics = messageAnalytics;
    this.templateManager = templateManager;
    
    // Import customer segmentation functions
    const { segmentCustomers, getCustomersByTag, applyAutoTags } = customerSegmentation;
    this.segmentCustomers = segmentCustomers;
    this.getCustomersByTag = getCustomersByTag;
    this.applyAutoTags = applyAutoTags;
    
    this.initFiles();
    this.activeWorkflows = new Map(); // Track active workflow executions
    this.scheduledJobs = new Map(); // Track scheduled cron jobs
    
    // Load and schedule existing workflows
    this.loadAndScheduleWorkflows();
  }

  /**
   * Initialize workflow files if they don't exist
   */
  initFiles() {
    const fs = require('fs');
    
    // Initialize workflows file
    try {
      require(this.workflowsFile);
    } catch (error) {
      fs.writeFileSync(this.workflowsFile, JSON.stringify([], null, 2));
    }
    
    // Initialize executions file
    try {
      require(this.executionsFile);
    } catch (error) {
      fs.writeFileSync(this.executionsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Load workflows from file
   * @returns {Array} - Array of workflow definitions
   */
  loadWorkflows() {
    try {
      const workflows = require(this.workflowsFile);
      return Array.isArray(workflows) ? workflows : [];
    } catch (error) {
      console.error('Error loading workflows:', error);
      return [];
    }
  }

  /**
   * Save workflows to file
   * @param {Array} workflows - Array of workflow definitions to save
   */
  saveWorkflows(workflows) {
    const fs = require('fs');
    fs.writeFileSync(this.workflowsFile, JSON.stringify(workflows, null, 2));
  }

  /**
   * Load workflow executions from file
   * @returns {Array} - Array of workflow execution records
   */
  loadExecutions() {
    try {
      const executions = require(this.executionsFile);
      return Array.isArray(executions) ? executions : [];
    } catch (error) {
      console.error('Error loading workflow executions:', error);
      return [];
    }
  }

  /**
   * Save workflow executions to file
   * @param {Array} executions - Array of workflow execution records to save
   */
  saveExecutions(executions) {
    const fs = require('fs');
    fs.writeFileSync(this.executionsFile, JSON.stringify(executions, null, 2));
  }

  /**
   * Load and schedule all active workflows
   */
  loadAndScheduleWorkflows() {
    const workflows = this.loadWorkflows();
    workflows.forEach(workflow => {
      if (workflow.isActive) {
        this.scheduleWorkflow(workflow);
      }
    });
  }

  /**
   * Create a new workflow
   * @param {Object} workflowData - Workflow definition
   * @returns {Object} - Created workflow
   */
  createWorkflow(workflowData) {
    const workflows = this.loadWorkflows();
    
    const workflow = {
      id: workflowData.id || uuidv4(),
      name: workflowData.name,
      description: workflowData.description || '',
      trigger: workflowData.trigger, // { type: 'event', event: 'tag_added', tag: 'interested' }
      conditions: workflowData.conditions || [], // Array of condition objects
      actions: workflowData.actions, // Array of action objects
      isActive: workflowData.isActive !== undefined ? workflowData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    
    workflows.push(workflow);
    this.saveWorkflows(workflows);
    
    // Schedule if active
    if (workflow.isActive) {
      this.scheduleWorkflow(workflow);
    }
    
    return workflow;
  }

  /**
   * Update an existing workflow
   * @param {string} workflowId - ID of workflow to update
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} - Updated workflow or null if not found
   */
  updateWorkflow(workflowId, updates) {
    const workflows = this.loadWorkflows();
    const workflowIndex = workflows.findIndex(w => w.id === workflowId);
    
    if (workflowIndex === -1) return null;
    
    // Remove old schedule if exists
    this.unscheduleWorkflow(workflowId);
    
    // Update workflow
    const workflow = {
      ...workflows[workflowIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: workflows[workflowIndex].version + 1
    };
    
    workflows[workflowIndex] = workflow;
    this.saveWorkflows(workflows);
    
    // Schedule if active
    if (workflow.isActive) {
      this.scheduleWorkflow(workflow);
    }
    
    return workflow;
  }

  /**
   * Delete a workflow
   * @param {string} workflowId - ID of workflow to delete
   * @returns {boolean} - True if deleted
   */
  deleteWorkflow(workflowId) {
    let workflows = this.loadWorkflows();
    const initialLength = workflows.length;
    workflows = workflows.filter(w => w.id !== workflowId);
    
    if (workflows.length === initialLength) return false; // Not found
    
    // Remove schedule
    this.unscheduleWorkflow(workflowId);
    
    this.saveWorkflows(workflows);
    return true;
  }

  /**
   * Schedule a workflow for execution based on its trigger
   * @param {Object} workflow - Workflow definition
   */
  scheduleWorkflow(workflow) {
    // Unschedle first if already scheduled
    this.unscheduleWorkflow(workflow.id);
    
    // Only schedule active workflows
    if (!workflow.isActive) return;
    
    let cronJob = null;
    
    switch (workflow.trigger.type) {
      case 'schedule':
        // Handle cron-based schedules
        if (workflow.trigger.cron) {
          cronJob = cron.schedule(workflow.trigger.cron, () => {
            this.executeWorkflow(workflow);
          });
        }
        break;
        
      case 'interval':
        // Handle interval-based triggers (e.g., every X hours)
        if (workflow.trigger.every && workflow.trigger.unit) {
          let intervalMs;
          switch (workflow.trigger.unit) {
            case 'minutes': intervalMs = workflow.trigger.every * 60 * 1000; break;
            case 'hours': intervalMs = workflow.trigger.every * 60 * 60 * 1000; break;
            case 'days': intervalMs = workflow.trigger.every * 24 * 60 * 60 * 1000; break;
            default: intervalMs = workflow.trigger.every * 60 * 1000; // Default to minutes
          }
          
          cronJob = cron.schedule(`*/${workflow.trigger.every} * * * *`, () => {
            this.executeWorkflow(workflow);
          });
        }
        break;
        
      case 'event':
        // Event-based workflows are handled through event listeners
        // We'll register listeners elsewhere
        this.registerEventListener(workflow);
        break;
        
      default:
        console.warn(`Unknown workflow trigger type: ${workflow.trigger.type}`);
        return;
    }
    
    if (cronJob) {
      this.scheduledJobs.set(workflow.id, cronJob);
    }
  }

  /**
   * Unschedule a workflow
   * @param {string} workflowId - ID of workflow to unschedule
   */
  unscheduleWorkflow(workflowId) {
    // Clear cron job if exists
    if (this.scheduledJobs.has(workflowId)) {
      const job = this.scheduledJobs.get(workflowId);
      job.stop();
      this.scheduledJobs.delete(workflowId);
    }
    
    // Remove event listeners if any
    // (Implementation would depend on how we store listeners)
  }

  /**
   * Register event listener for event-based workflows
   * @param {Object} workflow - Workflow definition
   */
  registerEventListener(workflow) {
    // This would integrate with your existing event system
    // For example, listening to tag additions, customer updates, etc.
    // Implementation depends on your event architecture
    console.log(`Registered event listener for workflow: ${workflow.name}`);
  }

  /**
   * Execute a workflow
   * @param {Object} workflow - Workflow definition to execute
   * @returns {Promise<Object>} - Execution result
   */
  async executeWorkflow(workflow) {
    const executionId = uuidv4();
    const startTime = new Date();
    
    const executionRecord = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      startTime: startTime.toISOString(),
      status: 'running',
      steps: [],
      customersAffected: 0,
      messagesSent: 0
    };
    
    try {
      // Get target customers based on workflow conditions
      let targetCustomers = await this.getTargetCustomers(workflow);
      
      executionRecord.customersAffected = targetCustomers.length;
      
      // Execute each action for each customer
      for (const customer of targetCustomers) {
        const customerExecution = {
          customerId: customer.id,
          customerNumber: customer.number,
          actions: []
        };
        
        for (const action of workflow.actions) {
          const actionResult = await this.executeAction(action, customer, workflow);
          customerExecution.actions.push(actionResult);
          
          if (actionResult.messageSent) {
            executionRecord.messagesSent++;
          }
        }
        
        executionRecord.steps.push(customerExecution);
      }
      
      executionRecord.status = 'completed';
      executionRecord.endTime = new Date().toISOString();
      
    } catch (error) {
      executionRecord.status = 'failed';
      executionRecord.error = error.message;
      executionRecord.endTime = new Date().toISOString();
      console.error(`Workflow execution failed: ${error}`);
    }
    
    // Save execution record
    const executions = this.loadExecutions();
    executions.push(executionRecord);
    
    // Keep only last 1000 executions
    if (executions.length > 1000) {
      executions.splice(0, executions.length - 1000);
    }
    
    this.saveExecutions(executions);
    
    return executionRecord;
  }

  /**
   * Get target customers based on workflow conditions
   * @param {Object} workflow - Workflow definition
   * @returns {Promise<Array>} - Array of target customers
   */
  async getTargetCustomers(workflow) {
    let customers = require('../data/customers.json');
    
    // Apply workflow conditions to filter customers
    if (workflow.conditions && workflow.conditions.length > 0) {
      customers = this.applyConditions(customers, workflow.conditions);
    }
    
    // Apply auto-tags to ensure customers have latest tags
    customers = this.applyAutoTags(customers);
    
    return customers;
  }

  /**
   * Apply conditions to filter customers
   * @param {Array} customers - Array of customer objects
   * @param {Array} conditions - Array of condition objects
   * @returns {Array} - Filtered customers
   */
  applyConditions(customers, conditions) {
    return customers.filter(customer => {
      return conditions.every(condition => this.evaluateCondition(customer, condition));
    });
  }

  /**
   * Evaluate a single condition against a customer
   * @param {Object} customer - Customer object
   * @param {Object} condition - Condition definition
   * @returns {boolean} - Whether condition passes
   */
  evaluateCondition(customer, condition) {
    switch (condition.type) {
      case 'tag':
        return customer.tags && customer.tags.includes(condition.tag);
        
      case 'status':
        return customer.status === condition.status;
        
      case 'messageCount':
        const count = customer.messageCount || 0;
        switch (condition.operator) {
          case 'gte': return count >= condition.value;
          case 'lte': return count <= condition.value;
          case 'gt': return count > condition.value;
          case 'lt': return count < condition.value;
          case 'eq': return count === condition.value;
          case 'neq': return count !== condition.value;
          default: return false;
        }
        
      case 'lastActive':
        if (!customer.lastActive) return false;
        const lastActive = new Date(customer.lastActive).getTime();
        const now = Date.now();
        const hoursAgo = (now - lastActive) / (1000 * 60 * 60);
        
        switch (condition.operator) {
          case 'gte': return hoursAgo >= condition.value;
          case 'lte': return hoursAgo <= condition.value;
          case 'gt': return hoursAgo > condition.value;
          case 'lt': return hoursAgo < condition.value;
          default: return false;
        }
        
      case 'buyerIntent':
        return customer.buyerIntent === condition.intent;
        
      case 'custom':
        // For custom JavaScript conditions (use with caution)
        try {
          return new Function('customer', `return ${condition.expression}`)(customer);
        } catch (error) {
          console.error('Error evaluating custom condition:', error);
          return false;
        }
        
      default:
        return false;
    }
  }

  /**
   * Execute a single action for a customer
   * @param {Object} action - Action definition
   * @param {Object} customer - Target customer
   * @param {Object} workflow - Parent workflow
   * @returns {Object} - Action result
   */
  async executeAction(action, customer, workflow) {
    const startTime = new Date();
    let result = {
      actionId: action.id || uuidv4(),
      actionType: action.type,
      customerId: customer.id,
      startTime: startTime.toISOString(),
      success: false,
      messageSent: false
    };
    
    try {
      switch (action.type) {
        case 'sendMessage':
          await this.executeSendMessageAction(action, customer, workflow, result);
          break;
          
        case 'addTag':
          await this.executeAddTagAction(action, customer, result);
          break;
          
        case 'removeTag':
          await this.executeRemoveTagAction(action, customer, result);
          break;
          
        case 'updateStatus':
          await this.executeUpdateStatusAction(action, customer, result);
          break;
          
        case 'wait':
          await this.executeWaitAction(action, result);
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      result.success = true;
      
    } catch (error) {
      result.error = error.message;
      console.error(`Action execution failed: ${error}`);
    }
    
    result.endTime = new Date().toISOString();
    result.durationMs = new Date(result.endTime) - new Date(result.startTime);
    
    return result;
  }

  /**
   * Execute send message action
   * @param {Object} action - Action definition
   * @param {Object} customer - Target customer
   * @param {Object} workflow - Parent workflow
   * @param {Object} result - Result object to update
   */
  async executeSendMessageAction(action, customer, workflow, result) {
    let content = action.content;
    
    // If using a template
    if (action.templateId) {
      const template = this.templateManager.getTemplateById(action.templateId);
      if (template && template.isActive) {
        // Prepare variables for template
        const variables = {
          name: customer.name,
          business_name: 'SuperSender Store', // Would come from settings
          // Add more variables as needed
          ...(action.variables || {})
        };
        
        content = this.templateManager.renderTemplate(action.templateId, variables);
        
        // Check if template rendering failed
        if (content.startsWith('Template not found') || content.startsWith('Error rendering')) {
          throw new Error(content);
        }
      } else {
        throw new Error(`Template not found or inactive: ${action.templateId}`);
      }
    }
    
    // Personalize content with customer data
    content = content
      .replace(/\{\{name\}\}/g, customer.name || '')
      .replace(/\{\{number\}\}/g, customer.number || '')
      .replace(/\{\{business_name\}\}/g, 'SuperSender Store');
    
    // Send the message
    const sentMsg = await this.messageAnalytics.recordSentMessage({
      to: customer.number,
      content: content,
      whatsappId: null, // Will be updated when we actually send
      type: 'template',
      workflowId: workflow.id,
      actionId: action.id
    });
    
    // Actually send via WhatsApp
    await sendDirect(customer.number, content);
    
    // Update the analytics record with the actual WhatsApp ID
    // (This would require modifying the recordSentMessage to return the ID)
    
    result.messageSent = true;
    result.messageId = sentMsg.id;
    result.content = content;
  }

  /**
   * Execute add tag action
   * @param {Object} action - Action definition
   * @param {Object} customer - Target customer
   * @param {Object} result - Result object to update
   */
  async executeAddTagAction(action, customer, result) {
    // In a real implementation, this would update the customer in the database
    // For now, we'll simulate it
    
    const customers = require('../data/customers.json');
    const updatedCustomers = this.templateManager.addCustomerTags(
      customers, 
      customer.id, 
      action.tags
    );
    
    // Save back to file
    const fs = require('fs');
    fs.writeFileSync(path.join(this.dataDir, 'customers.json'), 
      JSON.stringify(updatedCustomers, null, 2));
    
    result.tagsAdded = action.tags;
    result.success = true;
  }

  /**
   * Execute remove tag action
   * @param {Object} action - Action definition
   * @param {Object} customer - Target customer
   * @param {Object} result - Result object to update
   */
  async executeRemoveTagAction(action, customer, result) {
    const customers = require('../data/customers.json');
    const updatedCustomers = this.templateManager.removeCustomerTags(
      customers, 
      customer.id, 
      action.tags
    );
    
    // Save back to file
    const fs = require('fs');
    fs.writeFileSync(path.join(this.dataDir, 'customers.json'), 
      JSON.stringify(updatedCustomers, null, 2));
    
    result.tagsRemoved = action.tags;
    result.success = true;
  }

  /**
   * Execute update status action
   * @param {Object} action - Action definition
   * @param {Object} customer - Target customer
   * @param {Object} result - Result object to update
   */
  async executeUpdateStatusAction(action, customer, result) {
    const customers = require('../data/customers.json');
    const updatedCustomers = customers.map(c => {
      if (c.id === customer.id) {
        return { ...c, status: action.status };
      }
      return c;
    });
    
    // Save back to file
    const fs = require('fs');
    fs.writeFileSync(path.join(this.dataDir, 'customers.json'), 
      JSON.stringify(updatedCustomers, null, 2));
    
    result.statusUpdated = action.status;
    result.success = true;
  }

  /**
   * Execute wait action (delay)
   * @param {Object} action - Action definition
   * @param {Object} result - Result object to update
   */
  async executeWaitAction(action, result) {
    const waitMs = action.durationMs || (action.seconds * 1000) || (action.minutes * 60 * 1000);
    
    return new Promise(resolve => {
      setTimeout(() => {
        result.waitCompleted = true;
        resolve();
      }, waitMs);
    });
  }

  /**
   * Get workflow statistics
   * @returns {Object} - Workflow statistics
   */
  getStats() {
    const workflows = this.loadWorkflows();
    const executions = this.loadExecutions();
    
    const activeWorkflows = workflows.filter(w => w.isActive).length;
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    
    // Recent executions
    const recentExecutions = executions
      .slice(-10)
      .map(e => ({
        id: e.id,
        workflowName: e.workflowName,
        startTime: e.startTime,
        status: e.status,
        customersAffected: e.customersAffected || 0,
        messagesSent: e.messagesSent || 0
      }));
    
    return {
      workflows: {
        total: workflows.length,
        active: activeWorkflows,
        inactive: workflows.length - activeWorkflows
      },
      executions: {
        total: totalExecutions,
        successful: successfulExecutions,
        failed: failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
      },
      recentExecutions: recentExecutions
    };
  }
}

module.exports = WorkflowEngine;
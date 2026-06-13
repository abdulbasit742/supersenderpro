// Customer Segmentation and Tagging System

/**
 * Segment customers based on behavior and attributes
 * @param {Array} customers - Array of customer objects
 * @returns {Object} - Segmented customers
 */
function segmentCustomers(customers) {
  const segments = {
    new_leads: [],
    warm_leads: [],
    hot_leads: [],
    existing_customers: [],
    inactive: [],
    tagged: {}
  };
  
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  customers.forEach(customer => {
    // Initialize tagged segments for this customer's tags
    (customer.tags || []).forEach(tag => {
      if (!segments.tagged[tag]) {
        segments.tagged[tag] = [];
      }
      segments.tagged[tag].push(customer);
    });
    
    // Skip if no meaningful data
    if (!customer.number) return;
    
    // Segment by status and activity
    if (customer.status === 'customer') {
      segments.existing_customers.push(customer);
    } else if (customer.status === 'lead') {
      const lastActive = customer.lastActive ? new Date(customer.lastActive).getTime() : 0;
      const timeSinceActive = now - lastActive;
      
      // Check for tags that indicate temperature
      const hasHotTag = (customer.tags || []).some(tag => 
        ['hot', 'urgent', 'buying'].includes(tag.toLowerCase()));
      const hasWarmTag = (customer.tags || []).some(tag => 
        ['warm', 'interested', 'considering'].includes(tag.toLowerCase()));
      
      if (hasHotTag || customer.buyerIntent === 'HOT') {
        segments.hot_leads.push(customer);
      } else if (hasWarmTag || customer.buyerIntent === 'WARM' || timeSinceActive < twentyFourHours) {
        segments.warm_leads.push(customer);
      } else if (timeSinceActive > oneWeek) {
        segments.inactive.push(customer);
      } else {
        segments.new_leads.push(customer);
      }
    }
  });
  
  return segments;
}

/**
 * Add tags to a customer
 * @param {Array} customers - Array of customer objects
 * @param {string} customerId - ID of customer to tag
 * @param {string|Array} tags - Tag(s) to add
 * @returns {Array} - Updated customers array
 */
function addCustomerTags(customers, customerId, tags) {
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  return customers.map(customer => {
    if (customer.id === customerId) {
      // Initialize tags array if it doesn't exist
      if (!customer.tags) {
        customer.tags = [];
      }
      
      // Add new tags, avoiding duplicates
      tagArray.forEach(tag => {
        if (!customer.tags.includes(tag)) {
          customer.tags.push(tag);
        }
      });
      
      // Update last activity
      customer.lastActive = new Date().toISOString();
    }
    return customer;
  });
}

/**
 * Remove tags from a customer
 * @param {Array} customers - Array of customer objects
 * @param {string} customerId - ID of customer to untag
 * @param {string|Array} tags - Tag(s) to remove
 * @returns {Array} - Updated customers array
 */
function removeCustomerTags(customers, customerId, tags) {
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  return customers.map(customer => {
    if (customer.id === customerId && customer.tags) {
      // Remove specified tags
      customer.tags = customer.tags.filter(tag => !tagArray.includes(tag));
      
      // Update last activity
      customer.lastActive = new Date().toISOString();
    }
    return customer;
  });
}

/**
 * Get customers by tag
 * @param {Array} customers - Array of customer objects
 * @param {string} tag - Tag to filter by
 * @returns {Array} - Customers with the specified tag
 */
function getCustomersByTag(customers, tag) {
  return customers.filter(customer => 
    customer.tags && customer.tags.includes(tag)
  );
}

/**
 * Get all unique tags used across customers
 * @param {Array} customers - Array of customer objects
 * @returns {Array} - Unique tags
 */
function getAllTags(customers) {
  const tagsSet = new Set();
  customers.forEach(customer => {
    if (customer.tags) {
      customer.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet);
}

/**
 * Automatically tag customers based on behavior
 * @param {Array} customers - Array of customer objects
 * @returns {Array} - Customers with auto-applied tags
 */
function applyAutoTags(customers) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  
  return customers.map(customer => {
    // Initialize tags if not present
    if (!customer.tags) {
      customer.tags = [];
    }
    
    const lastActive = customer.lastActive ? new Date(customer.lastActive).getTime() : 0;
    const timeSinceActive = now - lastActive;
    const messageCount = customer.messageCount || 0;
    
    // Auto-tag based on activity
    if (timeSinceActive > oneMonth) {
      if (!customer.tags.includes('inactive')) {
        customer.tags.push('inactive');
      }
    } else if (timeSinceActive < oneWeek) {
      // Remove inactive tag if recently active
      customer.tags = customer.tags.filter(tag => tag !== 'inactive');
    }
    
    // Auto-tag based on engagement
    if (messageCount >= 10) {
      if (!customer.tags.includes('engaged')) {
        customer.tags.push('engaged');
      }
    } else if (messageCount >= 5) {
      if (!customer.tags.includes('interested')) {
        customer.tags.push('interested');
      }
    }
    
    // Auto-tag lead status
    if (customer.status === 'lead' && messageCount === 0) {
      if (!customer.tags.includes('new')) {
        customer.tags.push('new');
      }
    }
    
    return customer;
  });
}

module.exports = {
  segmentCustomers,
  addCustomerTags,
  removeCustomerTags,
  getCustomersByTag,
  getAllTags,
  applyAutoTags
};
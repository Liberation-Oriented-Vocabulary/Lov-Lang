class Environment {
  constructor(parent = null) {
    this.variables = new Map(); // Stores variable bindings
    this.types = new Map(); // Stores type definitions
    this.parent = parent; // Reference to parent environment for scope chain
    this.permissions = new Map(); // Stores access control permissions
    this.eventListeners = new Map(); // Stores event listeners for view/subscribe
  }

  /**
   * Defines a variable in the current environment.
   * @param {string} name - Variable name
   * @param {any} value - Variable value
   * @throws {Error} If variable is already defined
   */
  defineVariable(name, value) {
    if (this.variables.has(name)) {
      throw new Error(`Variable ${name} already defined in this scope`);
    }
    this.variables.set(name, value);
  }

  /**
   * Defines a type in the current environment.
   * @param {string} name - Type name
   * @param {Object} type - Type definition
   * @throws {Error} If type is already defined
   */
  defineType(name, type) {
    if (this.types.has(name)) {
      throw new Error(`Type ${name} already defined in this scope`);
    }
    this.types.set(name, type);
  }

  /**
   * Retrieves a variable's value, searching up the scope chain.
   * @param {string} name - Variable name
   * @returns {any} Variable value
   * @throws {Error} If variable is not found
   */
  getVariable(name) {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parent) {
      return this.parent.getVariable(name);
    }
    throw new Error(`Undefined variable ${name}`);
  }

  /**
   * Retrieves a type definition, searching up the scope chain.
   * @param {string} name - Type name
   * @returns {Object} Type definition
   * @throws {Error} If type is not found
   */
  getType(name) {
    if (this.types.has(name)) {
      return this.types.get(name);
    }
    if (this.parent) {
      return this.parent.getType(name);
    }
    throw new Error(`Undefined type ${name}`);
  }

  /**
   * Assigns a new value to an existing variable, searching up the scope chain.
   * @param {string} name - Variable name
   * @param {any} value - New value
   * @throws {Error} If variable is not found
   */
  assignVariable(name, value) {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assignVariable(name, value);
      return;
    }
    throw new Error(`Cannot assign to undefined variable ${name}`);
  }

  /**
   * Defines a permission for access control (e.g., allow declarations).
   * @param {string} name - Entity name
   * @param {string} permission - Permission type (read, write, run)
   * @param {string} target - Target entity
   */
  definePermission(name, permission, target) {
    this.permissions.set(`${name}:${target}`, permission);
  }

  /**
   * Checks if a permission exists.
   * @param {string} name - Entity name
   * @param {string} permission - Permission type
   * @param {string} target - Target entity
   * @returns {boolean} True if permission exists
   */
  hasPermission(name, permission, target) {
    return this.permissions.get(`${name}:${target}`) === permission;
  }

  /**
   * Registers an event listener for view or subscribe actions.
   * @param {string} eventName - Event identifier
   * @param {Function} callback - Callback function
   */
  registerEventListener(eventName, callback) {
    this.eventListeners.set(eventName, callback);
  }

  /**
   * Triggers an event, invoking registered listeners.
   * @param {string} eventName - Event identifier
   * @param {any} data - Event data
   */
  triggerEvent(eventName, data) {
    const listener = this.eventListeners.get(eventName);
    if (listener) {
      listener(data);
    }
  }

  /**
   * Creates a child environment for nested scopes.
   * @returns {Environment} New child environment
   */
  createChild() {
    return new Environment(this);
  }

  /**
   * Validates a value against a type definition.
   * @param {any} value - Value to validate
   * @param {Object} typeNode - Type AST node
   * @returns {boolean} True if value matches type
   * @throws {Error} If type validation fails
   */
  validateType(value, typeNode) {
    const typeInfo = this.getType(typeNode.value || typeNode.name || typeNode.type);
    switch (typeInfo.kind || typeNode.type) {
      case 'SimpleType':
        if (typeInfo.value === 'num' && typeof value !== 'number') {
          throw new Error(`Expected number, got ${typeof value}`);
        }
        if (typeInfo.value === 'word' && typeof value !== 'string') {
          throw new Error(`Expected string, got ${typeof value}`);
        }
        if (typeInfo.value === 'bool' && typeof value !== 'boolean') {
          throw new Error(`Expected boolean, got ${typeof value}`);
        }
        if (typeInfo.value === 'time' && !(value instanceof Date)) {
          throw new Error(`Expected time, got ${typeof value}`);
        }
        if (typeInfo.value === 'address' && !/^(0x)?[0-9a-fA-F]+$/.test(value)) {
          throw new Error(`Expected address, got ${value}`);
        }
        if (typeInfo.value === 'mood' && !['happy', 'sad', 'neutral'].includes(value)) {
          throw new Error(`Expected mood, got ${value}`);
        }
        if (typeInfo.value === 'any') {
          return true;
        }
        break;
      case 'ListType':
        if (!Array.isArray(value)) {
          throw new Error(`Expected list, got ${typeof value}`);
        }
        for (const item of value) {
          this.validateType(item, typeInfo.typeRule || typeNode.typeRule);
        }
        break;
      case 'DictType':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Expected dict, got ${typeof value}`);
        }
        for (const key in value) {
          this.validateType(key, typeInfo.keyType || typeNode.keyType);
          this.validateType(value[key], typeInfo.valueType || typeNode.valueType);
        }
        break;
      case 'OptionType':
        if (value !== null && value !== undefined) {
          this.validateType(value, typeInfo.typeRule || typeNode.typeRule);
        }
        break;
      case 'BoxType':
        if (typeof value !== 'object' || value.type !== typeInfo.name) {
          throw new Error(`Expected box of type ${typeInfo.name}, got ${value.type || typeof value}`);
        }
        for (const field of typeInfo.fields) {
          if (!(field.name in value.value) && !field.defaultValue) {
            throw new Error(`Missing field ${field.name} in box ${typeInfo.name}`);
          }
          if (field.name in value.value) {
            this.validateType(value.value[field.name], field.type);
          }
        }
        break;
      case 'GroupType':
        if (!Array.isArray(value)) {
          throw new Error(`Expected group, got ${typeof value}`);
        }
        if (value.length !== typeInfo.types.length) {
          throw new Error(`Expected ${typeInfo.types.length} elements in group, got ${value.length}`);
        }
        value.forEach((item, index) => {
          this.validateType(item, typeInfo.types[index] || typeNode.types[index]);
        });
        break;
      case 'UnionType':
        let valid = false;
        for (const type of typeInfo.types || typeNode.types) {
          try {
            this.validateType(value, type);
            valid = true;
            break;
          } catch (e) {
            // Continue to next type
          }
        }
        if (!valid) {
          throw new Error(`Value ${value} does not match any type in union`);
        }
        break;
      case 'FutureType':
        if (!(value instanceof Promise)) {
          throw new Error(`Expected future, got ${typeof value}`);
        }
        break;
      case 'ErrorType':
        if (typeof value !== 'object' || value.type !== typeInfo.name) {
          throw new Error(`Expected error of type ${typeInfo.name}`);
        }
        for (const field of typeInfo.fields) {
          if (!(field.name in value)) {
            throw new Error(`Missing field ${field.name} in error ${typeInfo.name}`);
          }
          this.validateType(value[field.name], field.type);
        }
        break;
      default:
        throw new Error(`Unsupported type: ${typeInfo.kind || typeNode.type}`);
    }
    return true;
  }
}

module.exports = Environment;

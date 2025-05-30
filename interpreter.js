class Environment {
  constructor(parent = null) {
    this.bindings = new Map(); // Stores variable bindings
    this.types = new Map(); // Stores type definitions
    this.parent = parent; // Reference to parent environment for scope chain
    this.permissions = new Map(); // Stores access control permissions
    this.eventListeners = new Map(); // Stores event listeners for view/subscribe
  }

  define(name, value) {
    if (this.bindings.has(name)) {
      throw new Error(`Variable ${name} already defined in this scope`);
    }
    this.bindings.set(name, value);
  }

  defineType(name, type) {
    if (this.types.has(name)) {
      throw new Error(`Type ${name} already defined in this scope`);
    }
    this.types.set(name, type);
  }

  get(name) {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new Error(`Undefined variable ${name}`);
  }

  getType(name) {
    if (this.types.has(name)) {
      return this.types.get(name);
    }
    if (this.parent) {
      return this.parent.getType(name);
    }
    throw new Error(`Undefined type ${name}`);
  }

  assign(name, value) {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new Error(`Cannot assign to undefined variable ${name}`);
  }

  definePermission(name, permission, target) {
    this.permissions.set(`${name}:${target}`, permission);
  }

  hasPermission(name, permission, target) {
    return this.permissions.get(`${name}:${target}`) === permission;
  }

  registerEventListener(eventName, callback) {
    this.eventListeners.set(eventName, callback);
  }

  triggerEvent(eventName, data) {
    const listener = this.eventListeners.get(eventName);
    if (listener) {
      listener(data);
    }
  }

  createChild() {
    return new Environment(this);
  }

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
      default:
        throw new Error(`Unsupported type: ${typeInfo.kind || typeNode.type}`);
    }
    return true;
  }
}

class Interpreter {
  constructor() {
    this.globalEnv = new Environment();
    this.asyncJobs = new Map();
    this.eventListeners = new Map();
    this.initializeBuiltins();
  }

  initializeBuiltins() {
    this.globalEnv.defineType('num', { kind: 'SimpleType', value: 'num' });
    this.globalEnv.defineType('word', { kind: 'SimpleType', value: 'word' });
    this.globalEnv.defineType('bool', { kind: 'SimpleType', value: 'bool' });
    this.globalEnv.defineType('time', { kind: 'SimpleType', value: 'time' });
    this.globalEnv.defineType('address', { kind: 'SimpleType', value: 'address' });
    this.globalEnv.defineType('mood', { kind: 'SimpleType', value: 'mood' });
    this.globalEnv.defineType('any', { kind: 'SimpleType', value: 'any' });
  }

  async interpret(ast) {
    return await this.evalProgram(ast, this.globalEnv);
  }

  async evalProgram(node, env) {
    let result = null;
    for (const statement of node.body) {
      result = await this.evalNode(statement, env);
    }
    return result;
  }

  async evalNode(node, env) {
    switch (node.type) {
      case 'Namespace':
        return await this.evalNamespace(node, env);
      case 'Pack':
        return await this.evalPack(node, env);
      case 'VarDecl':
        return await this.evalVarDecl(node, env);
      case 'BoxDecl':
        return await this.evalBoxDecl(node, env);
      case 'MapDecl':
        return await this.evalMapDecl(node, env);
      case 'QueueDecl':
        return await this.evalQueueDecl(node, env);
      case 'ViewDecl':
        return await this.evalViewDecl(node, env);
      case 'EntityDecl':
        return await this.evalEntityDecl(node, env);
      case 'JobDecl':
        return await this.evalJobDecl(node, env);
      case 'MoneyDecl':
        return await this.evalMoneyDecl(node, env);
      case 'PromiseDecl':
        return await this.evalPromiseDecl(node, env);
      case 'ReputationDecl':
        return await this.evalReputationDecl(node, env);
      case 'ConsensusDecl':
        return await this.evalConsensusDecl(node, env);
      case 'ShareDecl':
        return await this.evalShareDecl(node, env);
      case 'SendDecl':
        return await this.evalSendDecl(node, env);
      case 'AllowDecl':
        return await this.evalAllowDecl(node, env);
      case 'BridgeDecl':
        return await this.evalBridgeDecl(node, env);
      case 'ThinkDecl':
        return await this.evalThinkDecl(node, env);
      case 'LooseDecl':
        return await this.evalLooseDecl(node, env);
      case 'TargetDecl':
        return await this.evalTargetDecl(node, env);
      case 'TypeDecl':
        return await this.evalTypeDecl(node, env);
      case 'FormatDecl':
        return await this.evalFormatDecl(node, env);
      case 'GuardDecl':
        return await this.evalGuardDecl(node, env);
      case 'ErrorDecl':
        return await this.evalErrorDecl(node, env);
      case 'TestDecl':
        return await this.evalTestDecl(node, env);
      case 'LineNote':
      case 'BlockNote':
        return null;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  async evalNamespace(node, env) {
    const namespaceEnv = new Environment(env);
    for (const item of node.body) {
      await this.evalNode(item, namespaceEnv);
    }
    env.define(node.name, { type: 'Namespace', env: namespaceEnv });
    return null;
  }

  async evalPack(node, env) {
    const packEnv = new Environment(env);
    for (const item of node.body) {
      await this.evalNode(item, packEnv);
    }
    env.define(node.name, { type: 'Pack', tags: node.tags, env: packEnv });
    return null;
  }

  async evalVarDecl(node, env) {
    const value = await this.evalExpr(node.value, env);
    if (node.type && node.type.type !== 'InferType') {
      this.validateType(value, node.type, env);
    }
    if (node.names.type === 'Name') {
      env.define(node.names.value, value);
    } else {
      if (!Array.isArray(value)) {
        throw new Error(`Expected array for destructuring, got ${typeof value}`);
      }
      node.names.names.forEach((name, index) => {
        if (index < value.length) {
          env.define(name, value[index]);
        } else {
          throw new Error(`Not enough values to destructure at ${name}`);
        }
      });
    }
    return value;
  }

  async evalBoxDecl(node, env) {
    const boxType = {
      kind: 'BoxType',
      name: node.name,
      fields: node.fields.map(field => ({
        name: field.name,
        type: field.type,
        defaultValue: field.defaultValue
      }))
    };
    env.defineType(node.name, boxType);
    return null;
  }

  async evalMapDecl(node, env) {
    env.defineType(node.name, {
      kind: 'MapType',
      box: {
        name: node.box.name,
        fields: node.box.fields
      }
    });
    return null;
  }

  async evalQueueDecl(node, env) {
    env.define(node.name, { type: 'Queue', queue: [] });
    return null;
  }

  async evalViewDecl(node, env) {
    const view = {
      type: 'View',
      fields: node.fields,
      events: {}
    };
    for (const event of node.events) {
      view.events[event.name] = {
        actions: event.actions,
        onError: event.onError
      };
      this.eventListeners.set(`${node.name}:${event.name}`, async (data) => {
        const eventEnv = new Environment(env);
        eventEnv.define('eventData', data);
        await this.executeActions(event.actions, eventEnv);
      });
    }
    env.define(node.name, view);
    return null;
  }

  async evalEntityDecl(node, env) {
    const entity = {
      type: 'Entity',
      fields: node.fields.reduce((acc, field) => {
        acc[field.name] = null;
        return acc;
      }, {}),
      changes: node.changes
    };
    env.define(node.name, entity);
    return null;
  }

  async evalJobDecl(node, env) {
    const config = {};
    for (const field of node.config) {
      config[field.type] = field.value;
    }
    const job = {
      type: 'Job',
      config,
      execute: async (args) => {
        const jobEnv = new Environment(env);
        if (config.args) {
          config.args.forEach((arg, index) => {
            jobEnv.define(arg.name, args[index]);
          });
        }
        try {
          return await this.executeActions(node.actions, jobEnv);
        } catch (e) {
          if (node.onError) {
            const errorEnv = new Environment(jobEnv);
            if (node.onError.errorName) {
              errorEnv.define(node.onError.errorName, e.message);
            }
            return await this.executeActions(node.onError.body, errorEnv);
          }
          throw e;
        }
      }
    };
    env.define(node.name, job);
    if (config.when) {
      this.asyncJobs.set(node.name, setTimeout(() => job.execute([]), this.parseTime(config.when)));
    }
    return null;
  }

  parseTime(timeStr) {
    const match = timeStr.match(/(\d+)(s|m|h|d)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 24 * 3600 * 1000 };
    return value * multipliers[unit];
  }

  async evalMoneyDecl(node, env) {
    const money = {
      type: 'Money',
      rules: node.rules.map(rule => ({
        type: rule.type,
        box: rule.box,
        when: rule.when,
        amount: rule.amount
      }))
    };
    env.define('money', money);
    for (const rule of node.rules) {
      if (rule.when) {
        const condition = await this.evalExpr(rule.when, env);
        if (condition) {
          const boxValue = await this.evalExpr(rule.box, env);
          env.define('reward', { value: boxValue, amount: rule.amount });
        }
      }
    }
    return null;
  }

  async evalPromiseDecl(node, env) {
    const promise = {
      type: 'Promise',
      needs: node.needs,
      binds: node.binds,
      check: node.check,
      enforce: node.enforce
    };
    if (node.check) {
      const valid = await this.evalExpr(node.check, env);
      if (!valid) {
        throw new Error(`Promise check failed for ${node.name}`);
      }
    }
    if (node.enforce) {
      await this.executeActions(node.enforce, env);
    }
    env.define(node.name, promise);
    return null;
  }

  async evalReputationDecl(node, env) {
    env.define(node.name, { type: 'Reputation', user: node.user, score: node.score });
    return null;
  }

  async evalConsensusDecl(node, env) {
    const consensus = {
      type: 'Consensus',
      threshold: node.threshold,
      voters: node.voters,
      execute: async () => {
        const votes = await this.collectVotes(node.voters, env);
        if (votes.length >= node.threshold) {
          return await this.executeActions(node.actions, env);
        }
        throw new Error(`Consensus failed: ${votes.length} votes < ${node.threshold}`);
      }
    };
    env.define(node.name, consensus);
    return null;
  }

  async collectVotes(voters, env) {
    return voters;
  }

  async evalShareDecl(node, env) {
    env.define(node.name, { type: 'Share', target: node.target });
    return null;
  }

  async evalSendDecl(node, env) {
    env.define(node.name, { type: 'Send', target: node.target });
    return null;
  }

  async evalAllowDecl(node, env) {
    env.define(node.name, { type: 'Allow', permission: node.permission, target: node.target });
    return null;
  }

  async evalBridgeDecl(node, env) {
    const bridge = {
      type: 'Bridge',
      target: node.target,
      execute: async () => await this.executeActions(node.actions, env)
    };
    env.define(node.name, bridge);
    return null;
  }

  async evalThinkDecl(node, env) {
    console.log(`Think: ${node.name}`, env.get(node.name));
    return null;
  }

  async evalLooseDecl(node, env) {
    return await this.evalExpr(node.expr, env);
  }

  async evalTargetDecl(node, env) {
    env.define('target', node.target);
    return null;
  }

  async evalTypeDecl(node, env) {
    env.defineType(node.name, node.type);
    return null;
  }

  async evalFormatDecl(node, env) {
    env.define(node.name, { type: 'Format', formatType: node.formatType, schema: node.schema });
    return null;
  }

  async evalGuardDecl(node, env) {
    const guard = {
      type: 'Guard',
      check: async (value) => {
        const guardEnv = new Environment(env);
        guardEnv.define('value', value);
        return await this.evalExpr(node.expr, guardEnv);
      }
    };
    env.define(node.name, guard);
    return null;
  }

  async evalErrorDecl(node, env) {
    env.defineType(node.name, {
      kind: 'ErrorType',
      name: node.name,
      fields: node.fields
    });
    return null;
  }

  async evalTestDecl(node, env) {
    let passed = 0;
    for (const testCase of node.cases) {
      const result = await this.evalTestCase(testCase, env);
      if (result) passed++;
    }
    console.log(`Tests: ${passed}/${node.cases.length} passed`);
    return null;
  }

  async evalTestCase(node, env) {
    const testEnv = new Environment(env);
    try {
      await this.executeActions(node.actions, testEnv);
      for (const expect of node.expects) {
        if (expect.type === 'ExpectExpr') {
          const left = await this.evalExpr(expect.left, testEnv);
          const right = await this.evalExpr(expect.right, testEnv);
          if (left !== right) {
            console.error(`Test ${node.name} failed: ${left} !== ${right}`);
            return false;
          }
        }
      }
      console.log(`Test ${node.name} passed`);
      return true;
    } catch (e) {
      if (node.expects.some(exp => exp.type === 'ExpectError' && exp.errorName === e.message)) {
        console.log(`Test ${node.name} passed (expected error)`);
        return true;
      }
      if (node.onError) {
        const errorEnv = new Environment(testEnv);
        if (node.onError.errorName) {
          errorEnv.define(node.onError.errorName, e.message);
        }
        await this.executeActions(node.onError.body, errorEnv);
        return true;
      }
      console.error(`Test ${node.name} failed: ${e.message}`);
      return false;
    }
  }

  async evalExpr(node, env) {
    switch (node.type) {
      case 'Number':
        return node.value;
      case 'Hex':
        return parseInt(node.value, 16);
      case 'Base64':
        return Buffer.from(node.value, 'base64').toString();
      case 'Text':
        return node.value;
      case 'Literal':
        return node.value;
      case 'Identifier':
        return env.get(node.value);
      case 'BinaryExpr':
        return await this.evalBinaryExpr(node, env);
      case 'NotExpr':
        return await this.evalNotExpr(node, env);
      case 'Call':
        return await this.evalCall(node, env);
      case 'DictExpr':
        return await this.evalDictExpr(node, env);
      case 'ListExpr':
        return await this.evalListExpr(node, env);
      case 'BoxExpr':
        return await this.evalBoxExpr(node, env);
      case 'GroupExpr':
        return await this.evalGroupExpr(node, env);
      case 'SmallFnExpr':
        return await this.evalSmallFnExpr(node, env);
      case 'WaitExpr':
        return await this.evalWaitExpr(node, env);
      case 'ThrowExpr':
        return await this.evalThrowExpr(node, env);
      case 'QueryExpr':
        return await this.evalQueryExpr(node, env);
      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }

  async evalBinaryExpr(node, env) {
    const left = await this.evalExpr(node.left, env);
    const right = await this.evalExpr(node.right, env);
    switch (node.op) {
      case '&&':
        return left && right;
      case '||':
        return left || right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      default:
        throw new Error(`Unknown operator: ${node.op}`);
    }
  }

  async evalNotExpr(node, env) {
    const value = await this.evalExpr(node.expr, env);
    if (node.op === '!') {
      return !value;
    }
    if (node.op === '-') {
      return -value;
    }
    throw new Error(`Unknown unary operator: ${node.op}`);
  }

  async evalCall(node, env) {
    const fn = env.get(node.name);
    if (fn && fn.type === 'Job') {
      const args = await Promise.all(node.args.map(arg => this.evalExpr(arg, env)));
      return await fn.execute(args);
    }
    throw new Error(`Function ${node.name} not found or not callable`);
  }

  async evalDictExpr(node, env) {
    const dict = {};
    for (const entry of node.entries) {
      dict[entry.key] = await this.evalExpr(entry.value, env);
    }
    return dict;
  }

  async evalListExpr(node, env) {
    return await Promise.all(node.elements.map(elem => this.evalExpr(elem, env)));
  }

  async evalBoxExpr(node, env) {
    const box = {};
    for (const entry of node.entries) {
      box[entry.key] = await this.evalExpr(entry.value, env);
    }
    return { type: node.name, value: box };
  }

  async evalGroupExpr(node, env) {
    return await Promise.all(node.elements.map(elem => this.evalExpr(elem, env)));
  }

  async evalSmallFnExpr(node, env) {
    return {
      type: 'Function',
      execute: async (args) => {
        const fnEnv = new Environment(env);
        node.args.forEach((arg, index) => {
          fnEnv.define(arg, args[index]);
        });
        if (node.grab) {
          node.grab.forEach(name => {
            fnEnv.define(name, env.get(name));
          });
        }
        return await this.evalExpr(node.expr, fnEnv);
      }
    };
  }

  async evalWaitExpr(node, env) {
    const value = await this.evalExpr(node.expr, env);
    if (value && typeof value.then === 'function') {
      return await value;
    }
    return value;
  }

  async evalThrowExpr(node, env) {
    const value = await this.evalExpr(node.expr, env);
    throw new Error(`${node.name}: ${value}`);
  }

  async evalQueryExpr(node, env) {
    return { query: node.query, type: node.type };
  }

  async executeActions(actions, env) {
    let result = null;
    for (const action of actions) {
      result = await this.evalAction(action, env);
    }
    return result;
  }

  async evalAction(node, env) {
    switch (node.type) {
      case 'SetAction':
        return await this.evalSetAction(node, env);
      case 'IfAction':
        return await this.evalIfAction(node, env);
      case 'LoopAction':
        return await this.evalLoopAction(node, env);
      case 'WhileAction':
        return await this.evalWhileAction(node, env);
      case 'MatchAction':
        return await this.evalMatchAction(node, env);
      case 'TryAction':
        return await this.evalTryAction(node, env);
      case 'ReturnAction':
        return await this.evalReturnAction(node, env);
      case 'SayAction':
        return await this.evalSayAction(node, env);
      case 'CheckAction':
        return await this.evalCheckAction(node, env);
      case 'StoreAction':
        return await this.evalStoreAction(node, env);
      case 'ForgetAction':
        return await this.evalForgetAction(node, env);
      case 'HttpAction':
        return await this.evalHttpAction(node, env);
      case 'SocketAction':
        return await this.evalSocketAction(node, env);
      case 'SubscribeAction':
        return await this.evalSubscribeAction(node, env);
      case 'AuditAction':
        return await this.evalAuditAction(node, env);
      case 'HashAction':
        return await this.evalHashAction(node, env);
      case 'VerifyAction':
        return await this.evalVerifyAction(node, env);
      case 'ZkProofAction':
        return await this.evalZkProofAction(node, env);
      case 'KeygenAction':
        return await this.evalKeygenAction(node, env);
      case 'MultisigAction':
        return await this.evalMultisigAction(node, env);
      case 'WaitAction':
        return await this.evalWaitAction(node, env);
      case 'AskAction':
        return await this.evalAskAction(node, env);
      default:
        throw new Error(`Unknown action type: ${node.type}`);
    }
  }

  async evalSetAction(node, env) {
    const value = await this.evalExpr(node.value, env);
    if (node.target.type === 'Name') {
      env.assign(node.target.value, value);
    } else {
      if (!Array.isArray(value)) {
        throw new Error(`Expected array for destructuring, got ${typeof value}`);
      }
      node.target.names.forEach((name, index) => {
        if (index < value.length) {
          env.assign(name, value[index]);
        } else {
          throw new Error(`Not enough values to destructure at ${name}`);
        }
      });
    }
    return value;
  }

  async evalIfAction(node, env) {
    const condition = await this.evalExpr(node.condition, env);
    try {
      if (condition) {
        return await this.executeActions(node.thenBranch, env);
      } else if (node.elseBranch) {
        return await this.executeActions(node.elseBranch, env);
      }
    } catch (e) {
      if (node.onError) {
        const errorEnv = new Environment(env);
        if (node.onError.errorName) {
          errorEnv.define(node.onError.errorName, e.message);
        }
        return await this.executeActions(node.onError.body, errorEnv);
      }
      throw e;
    }
    return null;
  }

  async evalLoopAction(node, env) {
    const start = await this.evalExpr(node.range.start, env);
    const end = await this.evalExpr(node.range.end, env);
    let result = null;
    try {
      for (let i = start; i <= end; i++) {
        const loopEnv = new Environment(env);
        if (node.target.type === 'Name') {
          loopEnv.define(node.target.value, i);
        } else {
          node.target.names.forEach((name, index) => {
            loopEnv.define(name, [i][index]);
          });
        }
        result = await this.executeActions(node.body, loopEnv);
      }
    } catch (e) {
      if (node.onError) {
        const errorEnv = new Environment(env);
        if (node.onError.errorName) {
          errorEnv.define(node.onError.errorName, e.message);
        }
        return await this.executeActions(node.onError.body, errorEnv);
      }
      throw e;
    }
    return result;
  }

  async evalWhileAction(node, env) {
    let result = null;
    try {
      while (await this.evalExpr(node.condition, env)) {
        result = await this.executeActions(node.body, env);
      }
    } catch (e) {
      if (node.onError) {
        const errorEnv = new Environment(env);
        if (node.onError.errorName) {
          errorEnv.define(node.onError.errorName, e.message);
        }
        return await this.executeActions(node.onError.body, errorEnv);
      }
      throw e;
    }
    return result;
  }

  async evalMatchAction(node, env) {
    const value = await this.evalExpr(node.expr, env);
    try {
      if (node.body.type === 'inline') {
        return await this.evalAction(node.body.action, env);
      }
      for (const matchCase of node.body.cases) {
        if (matchCase.pattern.type === 'Else') {
          return await this.executeActions(matchCase.actions, env);
        }
        if (matchCase.pattern.type === 'Name') {
          const caseEnv = new Environment(env);
          caseEnv.define(matchCase.pattern.name, value);
          return await this.executeActions(matchCase.actions, caseEnv);
        }
        if (matchCase.pattern.type === 'Destructure') {
          const caseEnv = new Environment(env);
          caseEnv.define(matchCase.pattern.name, value);
          if (matchCase.pattern.subNames && Array.isArray(value)) {
            matchCase.pattern.subNames.forEach((name, index) => {
              caseEnv.define(name, value[index]);
            });
          }
          return await this.executeActions(matchCase.actions, caseEnv);
        }
        if (matchCase.pattern.type === 'UnionCase') {
          const typeInfo = env.getType(matchCase.pattern.type.value);
          if (this.validateType(value, typeInfo)) {
            const caseEnv = new Environment(env);
            caseEnv.define(matchCase.pattern.name, value);
            return await this.executeActions(matchCase.actions, caseEnv);
          }
        }
      }
    } catch (e) {
      if (node.onError) {
        const errorEnv = new Environment(env);
        if (node.onError.errorName) {
          errorEnv.define(node.onError.errorName, e.message);
        }
        return await this.executeActions(node.onError.body, errorEnv);
      }
      throw e;
    }
    throw new Error(`No matching case for value ${value}`);
  }

  async evalTryAction(node, env) {
    try {
      return await this.executeActions(node.tryBlock, env);
    } catch (e) {
      if (node.catchBlock) {
        const catchEnv = new Environment(env);
        catchEnv.define(node.catchBlock.name, e.message);
        await this.executeActions(node.catchBlock.actions, catchEnv);
      }
      if (node.finallyBlock) {
        await this.executeActions(node.finallyBlock, env);
      }
      if (!node.catchBlock) {
        throw e;
      }
    }
    if (node.finallyBlock) {
      await this.executeActions(node.finallyBlock, env);
    }
    return null;
  }

  async evalReturnAction(node, env) {
    const value = await this.evalExpr(node.value, env);
    if (node.type) {
      this.validateType(value, node.type, env);
    }
    return value;
  }

  async evalSayAction(node, env) {
    const value = await this.evalExpr(node.expr, env);
    console.log(value);
    return null;
  }

  async evalCheckAction(node, env) {
    const value = await this.evalExpr(node.expr, env);
    if (!value) {
      throw new Error(node.message);
    }
    return null;
  }

  async evalStoreAction(node, env) {
    const value = await this.evalExpr(node.value, env);
    env.define(node.key, value);
    return null;
  }

  async evalForgetAction(node, env) {
    env.define(node.key, null);
    console.log(`Forgot key ${node.key}: ${node.reason}`);
    return null;
  }

  async evalHttpAction(node, env) {
    const response = await fetch(node.url);
    const data = await response.text();
    return data;
  }

  async evalSocketAction(node, env) {
    const socket = new WebSocket(node.url);
    socket.onmessage = async (eventData) => {
      const socketEnv = new Environment(env);
      socketEnv.define('message', event.data);
      try {
        await this.executeActions(node.actions, socketEnv);
      } catch (e) {
        if (node.onError) {
          const errorEnv = new Environment(socketEnv);
          if (node.onError.errorName) {
            errorEnv.define(node.onError.errorName, e.message);
          }
          await this.executeActions(node.onError.body, errorEnv);
        } else {
          throw e;
        }
      }
    };
    return socket;
  }

  async evalSubscribeAction(node, env) {
    this.eventListeners.set(node.topic, async (data) => {
      const subEnv = new Environment(env);
      subEnv.define('eventData', data);
      try {
        await this.executeActions(node.actions, subEnv);
      } catch (e) {
        if (node.onError) {
          const errorEnv = new Environment(subEnv);
          if (node.onError.errorName) {
            errorEnv.define(node.onError.errorName, e.message);
          }
          await this.executeActions(node.onError.body, errorEnv);
        }
      }
    });
    return null;
  }

  async evalAuditAction(node, env) {
    console.log(`Audit: ${node.audit}`);
    return null;
  }

  async evalHashAction(node, env) {
    const value = await this.evalExpr(node.value, env);
    env.define(node.name, `hash(${node.algo}:${value}`);
    return null;
  }

  async evalVerifyAction(node, env) {
    const value = await this.evalExpr(node.expr, env);
    return true; // Placeholder
  }

  async evalZkProofAction(node, env) {
    return true; // Placeholder
  }

  async evalKeygenAction(node, env) {
    env.define(node.name, `key-${node.algo}`);
    return null;
  }

  async evalMultisigAction(node, env) {
    return node.signatures.length >= node.threshold;
  }

  async evalWaitAction(node, env) {
    const value = await this.evalExpr(node.expr, env);
    return await value;
  }

  async evalAskAction(node, env) {
    return env.get(node.name);
  }

  validateType(value, typeNode, env) {
    const typeInfo = env.getType(typeNode.value || typeNode.name);
    switch (typeInfo.kind) {
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
        break;
      case 'BoxType':
        if (typeof value !== 'object' || value.type !== typeInfo.name) {
          throw new Error(`Expected box of type ${typeInfo.name}`);
        }
        for (const field of typeInfo.fields) {
          if (!(field.name in value.value) && !field.defaultValue) {
            throw new Error(`Missing field ${field.name} in box ${typeInfo.name}`);
          }
        }
        break;
      case 'ListType':
        if (!Array.isArray(value)) {
          throw new Error(`Expected list, got ${typeof value}`);
        }
        for (const item of value) {
          this.validateType(item, typeInfo.typeRule, env);
        }
        break;
      case 'DictType':
        if (typeof value !== 'object') {
          throw new Error(`Expected dict, got ${typeof value}`);
        }
        for (const key in value) {
          this.validateType(key, typeInfo.keyType, env);
          this.validateType(value[key], typeInfo.valueType, env);
        }
        break;
      case 'OptionType':
        if (value !== null) {
          this.validateType(value, typeInfo.typeRule, env);
        }
        break;
      default:
        throw new Error(`Unsupported type: ${typeInfo.kind}`);
    }
  }
}

module.exports = Interpreter;

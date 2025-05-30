const { Environment } = require('./interpreter');
const axios = require('axios');
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const snarkjs = require('snarkjs');

// Bytecode Instructions
const OPCODES = {
  PUSH: 0x01, // Push value to stack
  LOAD: 0x02, // Load variable from environment
  STORE: 0x03, // Store value to variable
  CALL: 0x04, // Call a function
  RETURN: 0x05, // Return from function
  ADD: 0x06, // Add top two stack values
  SUB: 0x07, // Subtract top two stack values
  MUL: 0x08, // Multiply top two stack values
  DIV: 0x09, // Divide top two stack values
  MOD: 0x0A, // Modulo top two stack values
  EQ: 0x0B, // Equality check
  NEQ: 0x0C, // Inequality check
  GT: 0x0D, // Greater than
  LT: 0x0E, // Less than
  GTE: 0x0F, // Greater than or equal
  LTE: 0x10, // Less than or equal
  AND: 0x11, // Logical AND
  OR: 0x12, // Logical OR
  NOT: 0x13, // Logical NOT
  NEG: 0x14, // Unary negation
  SAY: 0x15, // Output value
  CHECK: 0x16, // Assert condition
  JUMP: 0x17, // Unconditional jump
  JUMP_IF_FALSE: 0x18, // Jump if top is false
  TYPE_CHECK: 0x19, // Validate type
  DICT_SET: 0x1A, // Set dict key-value
  LIST_APPEND: 0x1B, // Append to list
  THROW: 0x1C, // Throw error
  TRY: 0x1D, // Begin try block
  CATCH: 0x1E, // Handle catch block
  FINALLY: 0x1F, // Execute finally block
  AWAIT: 0x20, // Await async value
  SUBSCRIBE: 0x21, // Register event listener
  AUDIT: 0x22, // Log audit event
  HASH: 0x23, // Compute hash
  HTTP: 0x24, // Perform HTTP request
  SOCKET: 0x25, // WebSocket communication
  CRYPTO: 0x26, // Encrypt/decrypt
  ZK_PROOF: 0x27, // Zero-knowledge proof
  VOTE: 0x28, // Cast vote
  VERIFY: 0x29, // Verify proof
  PROOF: 0x2A, // Generate proof
  HALT: 0xFF, // Stop execution
};

// Engine Class
class Engine {
  constructor() {
    this.environment = new Environment();
    this.stack = [];
    this.instructions = [];
    this.ip = 0; // Instruction pointer
    this.callStack = [];
    this.functions = new Map();
    this.eventListeners = new Map();
    this.asyncJobs = new Map();
    this.sockets = new Map(); // Track WebSocket connections
  }

  // Compile AST to bytecode
  compile(ast) {
    this.instructions = [];
    this.compileProgram(ast);
    this.instructions.push({ opcode: OPCODES.HALT });
    return this.instructions;
  }

  compileProgram(node) {
    for (const statement of node.body) {
      this.compileNode(statement);
    }
  }

  compileNode(node) {
    switch (node.type) {
      case 'Namespace':
        this.compileNamespace(node);
        break;
      case 'Pack':
        this.compilePack(node);
        break;
      case 'VarDecl':
        this.compileVarDecl(node);
        break;
      case 'BoxDecl':
        this.compileBoxDecl(node);
        break;
      case 'MapDecl':
        this.compileMapDecl(node);
        break;
      case 'QueueDecl':
        this.compileQueueDecl(node);
        break;
      case 'ViewDecl':
        this.compileViewDecl(node);
        break;
      case 'EntityDecl':
        this.compileEntityDecl(node);
        break;
      case 'JobDecl':
        this.compileJobDecl(node);
        break;
      case 'MoneyDecl':
        this.compileMoneyDecl(node);
        break;
      case 'PromiseDecl':
        this.compilePromiseDecl(node);
        break;
      case 'ReputationDecl':
        this.compileReputationDecl(node);
        break;
      case 'ConsensusDecl':
        this.compileConsensusDecl(node);
        break;
      case 'ShareDecl':
        this.compileShareDecl(node);
        break;
      case 'SendDecl':
        this.compileSendDecl(node);
        break;
      case 'AllowDecl':
        this.compileAllowDecl(node);
        break;
      case 'BridgeDecl':
        this.compileBridgeDecl(node);
        break;
      case 'ThinkDecl':
        this.compileThinkDecl(node);
        break;
      case 'LooseDecl':
        this.compileLooseDecl(node);
        break;
      case 'TargetDecl':
        this.compileTargetDecl(node);
        break;
      case 'TypeDecl':
        this.compileTypeDecl(node);
        break;
      case 'FormatDecl':
        this.compileFormatDecl(node);
        break;
      case 'GuardDecl':
        this.compileGuardDecl(node);
        break;
      case 'ErrorDecl':
        this.compileErrorDecl(node);
        break;
      case 'TestDecl':
        this.compileTestDecl(node);
        break;
      case 'LineNote':
      case 'BlockNote':
        break;
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  compileNamespace(node) {
    const namespaceEnv = new Environment(this.environment);
    const prevEnv = this.environment;
    this.environment = namespaceEnv;
    for (const item of node.body) {
      this.compileNode(item);
    }
    this.environment = prevEnv;
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      env: namespaceEnv,
    });
  }

  compilePack(node) {
    const packEnv = new Environment(this.environment);
    const prevEnv = this.environment;
    this.environment = packEnv;
    for (const item of node.body) {
      this.compileNode(item);
    }
    this.environment = prevEnv;
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      tags: node.tags,
      env: packEnv,
    });
  }

  compileVarDecl(node) {
    this.compileExpr(node.value);
    if (node.type && node.type.type !== 'InferType') {
      this.instructions.push({
        opcode: OPCODES.TYPE_CHECK,
        type: node.type,
      });
    }
    if (node.names.type === 'Name') {
      this.instructions.push({
        opcode: OPCODES.STORE,
        value: node.names.value,
      });
    } else {
      const count = node.names.names.length;
      this.instructions.push({
        opcode: OPCODES.PUSH,
        value: { type: 'Destructure', count },
      });
      node.names.names.forEach(name => {
        this.instructions.push({
          opcode: OPCODES.STORE,
          value: name,
        });
      });
    }
  }

  compileBoxDecl(node) {
    const boxType = {
      kind: 'BoxType',
      name: node.name,
      fields: node.fields.map(field => ({
        name: field.name,
        type: field.type,
        defaultValue: field.defaultValue,
      })),
    };
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      isType: true,
      typeValue: boxType,
    });
  }

  compileMapDecl(node) {
    const mapType = {
      kind: 'DictType',
      keyType: node.box.fields.find(f => f.name === 'key').type,
      valueType: node.box.fields.find(f => f.name === 'value').type,
    };
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      isType: true,
      typeValue: mapType,
    });
  }

  compileQueueDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Queue', queue: [] },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileViewDecl(node) {
    node.events.forEach(event => {
      const eventName = `${node.name}:${event.name}`;
      const eventHandler = {
        actions: event.actions,
        onError: event.onError,
      };
      this.eventListeners.set(eventName, async data => {
        const eventEnv = new Environment(this.environment);
        eventEnv.define('eventData', data);
        await this.executeActions(event.actions, eventEnv);
      });
    });
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'View', fields: node.fields, events: {} },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileEntityDecl(node) {
    const entity = {
      type: 'Entity',
      fields: node.fields.reduce((acc, field) => {
        acc[field.name] = null;
        return acc;
      }, {}),
      changes: node.changes,
    };
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: entity,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileJobDecl(node) {
    const config = {};
    for (const field of node.config) {
      config[field.type] = field.value;
    }
    const job = {
      type: 'Job',
      config,
      actions: node.actions,
      onError: node.onError,
    };
    this.functions.set(node.name, job);
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: job,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
    if (config.when) {
      const delay = this.parseTime(config.when);
      this.asyncJobs.set(node.name, setTimeout(() => this.executeJob(job, []), delay));
    }
  }

  parseTime(timeStr) {
    const match = timeStr.match(/(\d+)(s|m|h|d)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 24 * 3600 * 1000 };
    return value * multipliers[unit];
  }

  compileMoneyDecl(node) {
    const rules = node.rules.map(rule => ({
      type: rule.type,
      box: rule.box,
      when: rule.when,
      amount: rule.amount,
    }));
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Money', rules },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: 'money',
    });
    node.rules.forEach(rule => {
      if (rule.when) {
        this.compileExpr(rule.when);
        this.instructions.push({
          opcode: OPCODES.JUMP_IF_FALSE,
          target: this.instructions.length + 3,
        });
        this.compileExpr(rule.box);
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: rule.amount,
        });
        this.instructions.push({
          opcode: OPCODES.STORE,
          value: 'reward',
        });
      }
    });
  }

  compilePromiseDecl(node) {
    if (node.check) {
      this.compileExpr(node.check);
      this.instructions.push({
        opcode: OPCODES.JUMP_IF_FALSE,
        target: this.instructions.length + 2,
      });
      this.instructions.push({
        opcode: OPCODES.THROW,
        value: `Promise check failed for ${node.name}`,
      });
    }
    if (node.enforce) {
      node.enforce.forEach(action => this.compileAction(action));
    }
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Promise', needs: node.needs, binds: node.binds },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileReputationDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Reputation', user: node.user, score: node.score },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileConsensusDecl(node) {
    const consensus = {
      type: 'Consensus',
      threshold: node.threshold,
      voters: node.voters,
      actions: node.actions,
    };
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: consensus,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileShareDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Share', target: node.target },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileSendDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Send', target: node.target },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileAllowDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Allow', permission: node.permission, target: node.target },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
    this.environment.definePermission(node.name, node.permission, node.target);
  }

  compileBridgeDecl(node) {
    const bridge = {
      type: 'Bridge',
      target: node.target,
      actions: node.actions,
    };
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: bridge,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileThinkDecl(node) {
    this.instructions.push({
      opcode: OPCODES.LOAD,
      value: node.name,
    });
    this.instructions.push({
      opcode: OPCODES.SAY,
    });
  }

  compileLooseDecl(node) {
    this.compileExpr(node.expr);
  }

  compileTargetDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: node.target,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: 'target',
    });
  }

  compileTypeDecl(node) {
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      isType: true,
      typeValue: node.type,
    });
  }

  compileFormatDecl(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'Format', formatType: node.formatType, schema: node.schema },
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileGuardDecl(node) {
    const guard = {
      type: 'Guard',
      expr: node.expr,
    };
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: guard,
    });
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
    });
  }

  compileErrorDecl(node) {
    const errorType = {
      kind: 'ErrorType',
      name: node.name,
      fields: node.fields,
    };
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      isType: true,
      typeValue: errorType,
    });
  }

  compileTestDecl(node) {
    node.cases.forEach(testCase => {
      const testEnv = new Environment(this.environment);
      this.environment = testEnv;
      testCase.actions.forEach(action => this.compileAction(action));
      testCase.expects.forEach(expect => {
        if (expect.type === 'ExpectExpr') {
          this.compileExpr(expect.left);
          this.compileExpr(expect.right);
          this.instructions.push({
            opcode: OPCODES.EQ,
          });
          this.instructions.push({
            opcode: OPCODES.CHECK,
            value: `Test ${testCase.name} failed`,
          });
        }
      });
      this.environment = testEnv.parent;
    });
  }

  compileExpr(node) {
    switch (node.type) {
      case 'Number':
      case 'Text':
      case 'Literal':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: node.value,
        });
        break;
      case 'Hex':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: parseInt(node.value, 16),
        });
        break;
      case 'Base64':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: Buffer.from(node.value, 'base64').toString(),
        });
        break;
      case 'Identifier':
        this.instructions.push({
          opcode: OPCODES.LOAD,
          value: node.value,
        });
        break;
      case 'BinaryExpr':
        this.compileBinaryExpr(node);
        break;
      case 'NotExpr':
        this.compileNotExpr(node);
        break;
      case 'Call':
        this.compileCall(node);
        break;
      case 'DictExpr':
        this.compileDictExpr(node);
        break;
      case 'ListExpr':
        this.compileListExpr(node);
        break;
      case 'BoxExpr':
        this.compileBoxExpr(node);
        break;
      case 'GroupExpr':
        this.compileGroupExpr(node);
        break;
      case 'SmallFnExpr':
        this.compileSmallFnExpr(node);
        break;
      case 'WaitExpr':
        this.compileWaitExpr(node);
        break;
      case 'ThrowExpr':
        this.compileThrowExpr(node);
        break;
      case 'QueryExpr':
        this.compileQueryExpr(node);
        break;
      default:
        throw new Error(`Unsupported expression type: ${node.type}`);
    }
  }

  compileBinaryExpr(node) {
    this.compileExpr(node.left);
    this.compileExpr(node.right);
    const opMap = {
      '&&': OPCODES.AND,
      '||': OPCODES.OR,
      '==': OPCODES.EQ,
      '!=': OPCODES.NEQ,
      '>': OPCODES.GT,
      '<': OPCODES.LT,
      '>=': OPCODES.GTE,
      '<=': OPCODES.LTE,
      '+': OPCODES.ADD,
      '-': OPCODES.SUB,
      '*': OPCODES.MUL,
      '/': OPCODES.DIV,
      '%': OPCODES.MOD,
    };
    this.instructions.push({
      opcode: opMap[node.op],
    });
  }

  compileNotExpr(node) {
    this.compileExpr(node.expr);
    const opMap = {
      '!': OPCODES.NOT,
      '-': OPCODES.NEG,
    };
    this.instructions.push({
      opcode: opMap[node.op],
    });
  }

  compileCall(node) {
    node.args.forEach(arg => this.compileExpr(arg));
    this.instructions.push({
      opcode: OPCODES.CALL,
      value: node.name,
      argCount: node.args.length,
    });
  }

  compileDictExpr(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: {},
    });
    node.entries.forEach(entry => {
      this.compileExpr(entry.value);
      this.instructions.push({
        opcode: OPCODES.DICT_SET,
        key: entry.key,
      });
    });
  }

  compileListExpr(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: [],
    });
    node.elements.forEach(elem => {
      this.compileExpr(elem);
      this.instructions.push({
        opcode: OPCODES.LIST_APPEND,
      });
    });
  }

  compileBoxExpr(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: node.name, value: {} },
    });
    node.entries.forEach(entry => {
      this.compileExpr(entry.value);
      this.instructions.push({
        opcode: OPCODES.DICT_SET,
        key: entry.key,
      });
    });
  }

  compileGroupExpr(node) {
    const values = [];
    node.elements.forEach(elem => {
      this.compileExpr(elem);
      values.push(this.stack.pop());
    });
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: values,
    });
  }

  compileSmallFnExpr(node) {
    const fn = {
      type: 'Function',
      args: node.args,
      expr: node.expr,
      grab: node.grab,
    };
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: fn,
    });
  }

  compileWaitExpr(node) {
    this.compileExpr(node.expr);
    this.instructions.push({
      opcode: OPCODES.AWAIT,
    });
  }

  compileThrowExpr(node) {
    this.compileExpr(node.expr);
    this.instructions.push({
      opcode: OPCODES.THROW,
      value: node.name,
    });
  }

  compileQueryExpr(node) {
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { query: node.query, type: node.type },
    });
  }

  compileAction(node) {
    switch (node.type) {
      case 'SetAction':
        this.compileSetAction(node);
        break;
      case 'IfAction':
        this.compileIfAction(node);
        break;
      case 'LoopAction':
        this.compileLoopAction(node);
        break;
      case 'WhileAction':
        this.compileWhileAction(node);
        break;
      case 'MatchAction':
        this.compileMatchAction(node);
        break;
      case 'TryAction':
        this.compileTryAction(node);
        break;
      case 'ReturnAction':
        this.compileReturnAction(node);
        break;
      case 'SayAction':
        this.compileSayAction(node);
        break;
      case 'CheckAction':
        this.compileCheckAction(node);
        break;
      case 'StoreAction':
        this.compileStoreAction(node);
        break;
      case 'ForgetAction':
        this.compileForgetAction(node);
        break;
      case 'SubscribeAction':
        this.compileSubscribeAction(node);
        break;
      case 'AuditAction':
        this.compileAuditAction(node);
        break;
      case 'HashAction':
        this.compileHashAction(node);
        break;
      case 'HttpAction':
        this.compileHttpAction(node);
        break;
      case 'SocketAction':
        this.compileSocketAction(node);
        break;
      case 'CryptoAction':
        this.compileCryptoAction(node);
        break;
      case 'ZkProofAction':
        this.compileZkProofAction(node);
        break;
      case 'VoteAction':
        this.compileVoteAction(node);
        break;
      case 'VerifyAction':
        this.compileVerifyAction(node);
        break;
      case 'ProofAction':
        this.compileProofAction(node);
        break;
      default:
        throw new Error(`Unsupported action type: ${node.type}`);
    }
  }

  compileSetAction(node) {
    this.compileExpr(node.value);
    if (node.target.type === 'Name') {
      this.instructions.push({
        opcode: OPCODES.STORE,
        value: node.target.value,
      });
    } else {
      const count = node.target.names.length;
      this.instructions.push({
        opcode: OPCODES.PUSH,
        value: { type: 'Destructure', count },
      });
      node.target.names.forEach(name => {
        this.instructions.push({
          opcode: OPCODES.STORE,
          value: name,
        });
      });
    }
  }

  compileIfAction(node) {
    this.compileExpr(node.condition);
    const jumpIfFalse = { opcode: OPCODES.JUMP_IF_FALSE, target: 0 };
    this.instructions.push(jumpIfFalse);
    node.thenBranch.forEach(action => this.compileAction(action));
    const jump = { opcode: OPCODES.JUMP, target: 0 };
    this.instructions.push(jump);
    jumpIfFalse.target = this.instructions.length;
    if (node.elseBranch) {
      node.elseBranch.forEach(action => this.compileAction(action));
    }
    jump.target = this.instructions.length;
  }

  compileLoopAction(node) {
    this.compileExpr(node.range.start);
    this.compileExpr(node.range.end);
    const loopStart = this.instructions.length;
    this.instructions.push({
      opcode: OPCODES.PUSH,
      value: { type: 'LoopCounter' },
    });
    node.body.forEach(action => this.compileAction(action));
    this.instructions.push({
      opcode: OPCODES.JUMP,
      target: loopStart,
    });
  }

  compileWhileAction(node) {
    const loopStart = this.instructions.length;
    this.compileExpr(node.condition);
    const jumpIfFalse = { opcode: OPCODES.JUMP_IF_FALSE, target: 0 };
    this.instructions.push(jumpIfFalse);
    node.body.forEach(action => this.compileAction(action));
    this.instructions.push({
      opcode: OPCODES.JUMP,
      target: loopStart,
    });
    jumpIfFalse.target = this.instructions.length;
  }

  compileMatchAction(node) {
    this.compileExpr(node.expr);
    const endJumps = [];
    node.body.cases.forEach(matchCase => {
      if (matchCase.pattern.type !== 'Else') {
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: { type: 'Match', pattern: matchCase.pattern },
        });
        const jumpIfFalse = { opcode: OPCODES.JUMP_IF_FALSE, target: 0 };
        this.instructions.push(jumpIfFalse);
        matchCase.actions.forEach(action => this.compileAction(action));
        endJumps.push({ opcode: OPCODES.JUMP, target: 0 });
        this.instructions.push(endJumps[endJumps.length - 1]);
        jumpIfFalse.target = this.instructions.length;
      } else {
        matchCase.actions.forEach(action => this.compileAction(action));
      }
    });
    endJumps.forEach(jump => (jump.target = this.instructions.length));
  }

  compileTryAction(node) {
    this.instructions.push({
      opcode: OPCODES.TRY,
      catchTarget: 0,
      finallyTarget: 0,
    });
    const tryIndex = this.instructions.length - 1;
    node.tryBlock.forEach(action => this.compileAction(action));
    this.instructions.push({
      opcode: OPCODES.JUMP,
      target: 0,
    });
    const jumpToFinally = this.instructions.length - 1;
    this.instructions[tryIndex].catchTarget = this.instructions.length;
    if (node.catchBlock) {
      this.instructions.push({
        opcode: OPCODES.STORE,
        value: node.catchBlock.name,
      });
      node.catchBlock.actions.forEach(action => this.compileAction(action));
    }
    this.instructions[tryIndex].finallyTarget = this.instructions.length;
    if (node.finallyBlock) {
      node.finallyBlock.forEach(action => this.compileAction(action));
    }
    this.instructions[jumpToFinally].target = this.instructions.length;
  }

  compileReturnAction(node) {
    this.compileExpr(node.value);
    if (node.type) {
      this.instructions.push({
        opcode: OPCODES.TYPE_CHECK,
        type: node.type,
      });
    }
    this.instructions.push({
      opcode: OPCODES.RETURN,
    });
  }

  compileSayAction(node) {
    this.compileExpr(node.expr);
    this.instructions.push({
      opcode: OPCODES.SAY,
    });
  }

  compileCheckAction(node) {
    this.compileExpr(node.expr);
    this.instructions.push({
      opcode: OPCODES.CHECK,
      value: node.message,
    });
  }

  compileStoreAction(node) {
    this.compileExpr(node.value);
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.key,
    });
  }

  compileForgetAction(node) {
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.key,
      isNull: true,
    });
    this.instructions.push({
      opcode: OPCODES.SAY,
      value: `Forgot key ${node.key}: ${node.reason}`,
    });
  }

  compileSubscribeAction(node) {
    const topic = node.topic;
    this.instructions.push({
      opcode: OPCODES.SUBSCRIBE,
      value: topic,
      actions: node.actions,
    });
  }

  compileAuditAction(node) {
    this.instructions.push({
      opcode: OPCODES.AUDIT,
      value: node.audit,
    });
  }

  compileHashAction(node) {
    this.compileExpr(node.value);
    this.instructions.push({
      opcode: OPCODES.HASH,
      algo: node.algo,
      name: node.name,
    });
  }

  compileHttpAction(node) {
    this.compileExpr(node.url);
    this.compileExpr(node.body || { type: 'Literal', value: null });
    this.instructions.push({
      opcode: OPCODES.HTTP,
      method: node.method,
      headers: node.headers,
      name: node.name,
    });
  }

  compileSocketAction(node) {
    this.compileExpr(node.url);
    this.compileExpr(node.message);
    this.instructions.push({
      opcode: OPCODES.SOCKET,
      action: node.action,
      name: node.name,
    });
  }

  compileCryptoAction(node) {
    this.compileExpr(node.data);
    this.instructions.push({
      opcode: OPCODES.CRYPTO,
      operation: node.operation,
      key: node.key,
      name: node.name,
    });
  }

  compileZkProofAction(node) {
    this.compileExpr(node.input);
    this.instructions.push({
      opcode: OPCODES.ZK_PROOF,
      circuit: node.circuit,
      name: node.name,
    });
  }

  compileVoteAction(node) {
    this.compileExpr(node.choice);
    this.instructions.push({
      opcode: OPCODES.VOTE,
      proposal: node.proposal,
      voter: node.voter,
    });
  }

  compileVerifyAction(node) {
    this.compileExpr(node.proof);
    this.instructions.push({
      opcode: OPCODES.VERIFY,
      circuit: node.circuit,
      publicSignals: node.publicSignals,
    });
  }

  compileProofAction(node) {
    this.compileExpr(node.input);
    this.instructions.push({
      opcode: OPCODES.PROOF,
      circuit: node.circuit,
      name: node.name,
    });
  }

  // Execute bytecode
  async execute(instructions) {
    this.instructions = instructions;
    this.ip = 0;
    this.stack = [];

    while (this.ip < this.instructions.length) {
      const instruction = this.instructions[this.ip];
      if (this.ip === this.instructions.length - 1 && instruction.opcode !== OPCODES.HALT) {
        throw new Error('Program did not terminate with HALT');
      }
      await this.executeInstruction(instruction);
      this.ip++;
    }
  }

  async executeInstruction(instruction) {
    switch (instruction.opcode) {
      case OPCODES.PUSH:
        this.stack.push(instruction.value);
        break;
      case OPCODES.LOAD:
        this.stack.push(this.environment.get(instruction.value));
        break;
      case OPCODES.STORE:
        const value = instruction.isNull ? null : this.stack.pop();
        if (instruction.isType) {
          this.environment.defineType(instruction.value, instruction.typeValue);
        } else if (instruction.env) {
          this.environment.define(instruction.value, { type: 'Namespace', env: instruction.env });
        } else if (instruction.tags) {
          this.environment.define(instruction.value, { type: 'Pack', tags: instruction.tags, env: instruction.env });
        } else if (instruction.value && instruction.value.type === 'Destructure') {
          const arr = this.stack.pop();
          if (!Array.isArray(arr)) {
            throw new Error(`Expected array for destructuring, got ${typeof arr}`);
          }
          if (arr.length < instruction.value.count) {
            throw new Error(`Not enough values to destructure`);
          }
          for (let i = 0; i < instruction.value.count; i++) {
            this.environment.define(this.instructions[this.ip + i + 1].value, arr[i]);
          }
          this.ip += instruction.value.count;
        } else {
          this.environment.define(instruction.value, value);
        }
        break;
      case OPCODES.CALL:
        const fn = this.functions.get(instruction.value) || this.environment.get(instruction.value);
        const args = [];
        for (let i = 0; i < instruction.argCount; i++) {
          args.push(this.stack.pop());
        }
        this.stack.push(await this.executeFunction(fn, args.reverse()));
        break;
      case OPCODES.RETURN:
        this.stack.push(this.stack.pop());
        this.ip = this.callStack.pop();
        break;
      case OPCODES.ADD:
        this.stack.push(this.stack.pop() + this.stack.pop());
        break;
      case OPCODES.SUB:
        const b = this.stack.pop();
        this.stack.push(this.stack.pop() - b);
        break;
      case OPCODES.MUL:
        this.stack.push(this.stack.pop() * this.stack.pop());
        break;
      case OPCODES.DIV:
        const divisor = this.stack.pop();
        this.stack.push(this.stack.pop() / divisor);
        break;
      case OPCODES.MOD:
        const mod = this.stack.pop();
        this.stack.push(this.stack.pop() % mod);
        break;
      case OPCODES.EQ:
        this.stack.push(this.stack.pop() === this.stack.pop());
        break;
      case OPCODES.NEQ:
        this.stack.push(this.stack.pop() !== this.stack.pop());
        break;
      case OPCODES.GT:
        const gt = this.stack.pop();
        this.stack.push(this.stack.pop() > gt);
        break;
      case OPCODES.LT:
        const lt = this.stack.pop();
        this.stack.push(this.stack.pop() < lt);
        break;
      case OPCODES.GTE:
        const gte = this.stack.pop();
        this.stack.push(this.stack.pop() >= gte);
        break;
      case OPCODES.LTE:
        const lte = this.stack.pop();
        this.stack.push(this.stack.pop() <= lte);
        break;
      case OPCODES.AND:
        this.stack.push(this.stack.pop() && this.stack.pop());
        break;
      case OPCODES.OR:
        this.stack.push(this.stack.pop() || this.stack.pop());
        break;
      case OPCODES.NOT:
        this.stack.push(!this.stack.pop());
        break;
      case OPCODES.NEG:
        this.stack.push(-this.stack.pop());
        break;
      case OPCODES.SAY:
        console.log(this.stack.pop());
        break;
      case OPCODES.CHECK:
        if (!this.stack.pop()) {
          throw new Error(instruction.value);
        }
        break;
      case OPCODES.JUMP:
        this.ip = instruction.target - 1;
        break;
      case OPCODES.JUMP_IF_FALSE:
        if (!this.stack.pop()) {
          this.ip = instruction.target - 1;
        }
        break;
      case OPCODES.TYPE_CHECK:
        this.environment.validateType(this.stack[this.stack.length - 1], instruction.type);
        break;
      case OPCODES.DICT_SET:
        const dict = this.stack[this.stack.length - 2];
        dict[instruction.key] = this.stack.pop();
        break;
      case OPCODES.LIST_APPEND:
        const list = this.stack[this.stack.length - 2];
        list.push(this.stack.pop());
        break;
      case OPCODES.THROW:
        throw new Error(`${instruction.value}: ${this.stack.pop()}`);
        break;
      case OPCODES.TRY:
        try {
          await this.executeInstructions(this.instructions.slice(this.ip + 1, instruction.catchTarget));
        } catch (e) {
          this.ip = instruction.catchTarget - 1;
          this.stack.push(e.message);
        }
        if (instruction.finallyTarget) {
          this.ip = instruction.finallyTarget - 1;
        }
        break;
      case OPCODES.AWAIT:
        const value = this.stack.pop();
        this.stack.push(await value);
        break;
      case OPCODES.SUBSCRIBE:
        this.eventListeners.set(instruction.value, async data => {
          const subEnv = new Environment(this.environment);
          subEnv.define('eventData', data);
          await this.executeActions(instruction.actions, subEnv);
        });
        break;
      case OPCODES.AUDIT:
        console.log(`Audit: ${instruction.value}`);
        break;
      case OPCODES.HASH:
        const hashValue = this.stack.pop();
        let hash;
        switch (instruction.algo.toLowerCase()) {
          case 'sha256':
            hash = CryptoJS.SHA256(hashValue).toString();
            break;
          case 'md5':
            hash = CryptoJS.MD5(hashValue).toString();
            break;
          default:
            throw new Error(`Unsupported hash algorithm: ${instruction.algo}`);
        }
        this.environment.define(instruction.name, hash);
        this.stack.push(hash);
        break;
      case OPCODES.HTTP:
        const body = this.stack.pop();
        const url = this.stack.pop();
        let response;
        try {
          if (instruction.method.toLowerCase() === 'get') {
            response = await axios.get(url, { headers: instruction.headers });
          } else if (instruction.method.toLowerCase() === 'post') {
            response = await axios.post(url, body, { headers: instruction.headers });
          } else {
            throw new Error(`Unsupported HTTP method: ${instruction.method}`);
          }
          this.environment.define(instruction.name, response.data);
          this.stack.push(response.data);
        } catch (e) {
          throw new Error(`HTTP request failed: ${e.message}`);
        }
        break;
      case OPCODES.SOCKET:
        const message = this.stack.pop();
        const socketUrl = this.stack.pop();
        if (instruction.action === 'connect') {
          const ws = new WebSocket(socketUrl);
          ws.on('message', data => {
            this.eventListeners.get(instruction.name)?.(data.toString());
          });
          ws.on('error', err => {
            throw new Error(`WebSocket error: ${err.message}`);
          });
          this.sockets.set(instruction.name, ws);
        } else if (instruction.action === 'send') {
          const ws = this.sockets.get(instruction.name);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            this.stack.push(true);
          } else {
            throw new Error(`WebSocket ${instruction.name} not connected`);
          }
        } else if (instruction.action === 'close') {
          const ws = this.sockets.get(instruction.name);
          if (ws) {
            ws.close();
            this.sockets.delete(instruction.name);
            this.stack.push(true);
          } else {
            throw new Error(`WebSocket ${instruction.name} not found`);
          }
        }
        break;
      case OPCODES.CRYPTO:
        const data = this.stack.pop();
        let result;
        if (instruction.operation === 'encrypt') {
          result = CryptoJS.AES.encrypt(data, instruction.key).toString();
        } else if (instruction.operation === 'decrypt') {
          result = CryptoJS.AES.decrypt(data, instruction.key).toString(CryptoJS.enc.Utf8);
        } else {
          throw new Error(`Unsupported crypto operation: ${instruction.operation}`);
        }
        this.environment.define(instruction.name, result);
        this.stack.push(result);
        break;
      case OPCODES.ZK_PROOF:
        const zkInput = this.stack.pop();
        // Placeholder: Requires actual circuit and proving key
        try {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            zkInput,
            instruction.circuit.wasm,
            instruction.circuit.zkey
          );
          this.environment.define(instruction.name, { proof, publicSignals });
          this.stack.push({ proof, publicSignals });
        } catch (e) {
          throw new Error(`ZK proof generation failed: ${e.message}`);
        }
        break;
      case OPCODES.VOTE:
        const choice = this.stack.pop();
        this.environment.define(`vote_${instruction.proposal}_${instruction.voter}`, choice);
        this.stack.push(true);
        break;
      case OPCODES.VERIFY:
        const verifyProof = this.stack.pop();
        // Placeholder: Requires verification key
        try {
          const isValid = await snarkjs.groth16.verify(
            instruction.circuit.vkey,
            instruction.publicSignals,
            verifyProof
          );
          this.stack.push(isValid);
        } catch (e) {
          throw new Error(`Proof verification failed: ${e.message}`);
        }
        break;
      case OPCODES.PROOF:
        const proofInput = this.stack.pop();
        // Placeholder: Similar to ZK_PROOF
        try {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            proofInput,
            instruction.circuit.wasm,
            instruction.circuit.zkey
          );
          this.environment.define(instruction.name, { proof, publicSignals });
          this.stack.push({ proof, publicSignals });
        } catch (e) {
          throw new Error(`Proof generation failed: ${e.message}`);
        }
        break;
      case OPCODES.HALT:
        this.ip = this.instructions.length;
        break;
      default:
        throw new Error(`Unknown opcode: ${instruction.opcode}`);
    }
  }

  async executeFunction(fn, args) {
    if (fn.type === 'Job') {
      const jobEnv = new Environment(this.environment);
      if (fn.config.args) {
        fn.config.args.forEach((arg, index) => {
          jobEnv.define(arg.name, args[index]);
        });
      }
      return await this.executeActions(fn.actions, jobEnv);
    } else if (fn.type === 'Function') {
      const fnEnv = new Environment(this.environment);
      fn.args.forEach((arg, index) => {
        fnEnv.define(arg, args[index]);
      });
      if (fn.grab) {
        fn.grab.forEach(name => {
          fnEnv.define(name, this.environment.get(name));
        });
      }
      this.compileExpr(fn.expr);
      await this.execute(this.instructions.slice(-1));
      return this.stack.pop();
    }
    throw new Error(`Cannot call non-function ${fn.type}`);
  }

  async executeActions(actions, env) {
    const prevEnv = this.environment;
    this.environment = env;
    for (const action of actions) {
      this.compileAction(action);
      await this.execute(this.instructions.slice(-1));
    }
    this.environment = prevEnv;
  }

  // Run AST directly
  async run(ast) {
    const instructions = this.compile(ast);
    await this.execute(instructions);
  }
}

// Update Environment class to support all types
Environment.prototype.validateType = function(value, typeNode) {
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
};

module.exports = Engine;

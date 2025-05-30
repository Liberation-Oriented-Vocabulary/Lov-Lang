const { Environment } = require('./interpreter');

// Bytecode Instructions
const OPCODES = {
  PUSH: 0x01, // Push value to stack
  LOAD: 0x02, // Load variable from environment
  STORE: 0x03, // Store value to variable
  CALL: 0x04, // Call a function
  RETURN: 0x05, // Return from function
  ADD: 0x06, // Add top two stack values
  SAY: 0x07, // Output value
  HALT: 0xFF, // Stop execution
};

// Engine Class
class Engine {
  constructor() {
    this.environment = new Environment();
    this.stack = [];
    this.instructions = [];
    this.ip = 0; // Instruction pointer
    this.functions = new Map();
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
      case 'VarDecl':
        this.compileVarDecl(node);
        break;
      case 'TypeDecl':
        this.compileTypeDecl(node);
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

  compileVarDecl(node) {
    this.compileExpr(node.value);
    if (node.names.type === 'Name') {
      this.instructions.push({
        opcode: OPCODES.STORE,
        value: node.names.value,
      });
      if (node.type && node.type.type !== 'InferType') {
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: { type: 'TypeCheck', type: node.type },
        });
      }
    } else {
      throw new Error('Destructuring not supported in engine yet');
    }
  }

  compileTypeDecl(node) {
    this.instructions.push({
      opcode: OPCODES.STORE,
      value: node.name,
      isType: true,
      typeValue: node.type,
    });
  }

  compileExpr(node) {
    switch (node.type) {
      case 'Number':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: node.value,
        });
        break;
      case 'Text':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: node.value,
        });
        break;
      case 'Literal':
        this.instructions.push({
          opcode: OPCODES.PUSH,
          value: node.value,
        });
        break;
      case 'Identifier':
        this.instructions.push({
          opcode: OPCODES.LOAD,
          value: node.value,
        });
        break;
      default:
        throw new Error(`Unsupported expression type: ${node.type}`);
    }
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
        if (instruction.value && instruction.value.type === 'TypeCheck') {
          const value = this.stack[this.stack.length - 1];
          this.environment.validateType(value, instruction.value.type);
        } else {
          this.stack.push(instruction.value);
        }
        break;
      case OPCODES.LOAD:
        this.stack.push(this.environment.get(instruction.value));
        break;
      case OPCODES.STORE:
        const value = this.stack.pop();
        if (instruction.isType) {
          this.environment.defineType(instruction.value, instruction.typeValue);
        } else if (instruction.env) {
          this.environment.define(instruction.value, { type: 'Namespace', env: instruction.env });
        } else {
          this.environment.define(instruction.value, value);
        }
        break;
      case OPCODES.SAY:
        console.log(this.stack.pop());
        break;
      case OPCODES.HALT:
        this.ip = this.instructions.length;
        break;
      default:
        throw new Error(`Unknown opcode: ${instruction.opcode}`);
    }
  }

  // Run AST directly
  async run(ast) {
    const instructions = this.compile(ast);
    await this.execute(instructions);
  }
}

module.exports = Engine;

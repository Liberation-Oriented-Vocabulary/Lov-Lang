#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { Tokenizer } = require('./tokenizer');
const Parser = require('./parser');
const Interpreter = require('./interpreter');
const { version } = require('./package.json');

// CLI Configuration
const CLI_NAME = 'lov';
const CLI_VERSION = version || '1.0.0';
const PROMPT = 'lov> ';

// Command-line arguments parser
class CLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = {
      file: null,
      repl: false,
      ast: false,
      debug: false,
      help: false,
      version: false,
    };
  }

  parseArgs() {
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      switch (arg) {
        case '-f':
        case '--file':
          this.options.file = this.args[++i];
          break;
        case '-r':
        case '--repl':
          this.options.repl = true;
          break;
        case '-a':
        case '--ast':
          this.options.ast = true;
          break;
        case '-d':
        case '--debug':
          this.options.debug = true;
          break;
        case '-h':
        case '--help':
          this.options.help = true;
          break;
        case '-v':
        case '--version':
          this.options.version = true;
          break;
        default:
          if (!arg.startsWith('-')) {
            this.options.file = arg;
          } else {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
          }
      }
    }
  }

  async run() {
    this.parseArgs();

    if (this.options.help) {
      this.showHelp();
      return;
    }

    if (this.options.version) {
      this.showVersion();
      return;
    }

    if (this.options.file) {
      await this.runFile(this.options.file);
    } else if (this.options.repl || this.args.length === 0) {
      await this.runRepl();
    }
  }

  showHelp() {
    console.log(`
${CLI_NAME} - Liberation-Oriented Vocabulary Interpreter (v${CLI_VERSION})

Usage: ${CLI_NAME} [options] [file]

Options:
  -f, --file <path>    Run a .lov file
  -r, --repl           Start interactive REPL mode
  -a, --ast            Output the Abstract Syntax Tree (AST)
  -d, --debug          Enable debug mode with verbose output
  -h, --help           Show this help message
  -v, --version        Show version information

Examples:
  ${CLI_NAME} program.lov          Run program.lov
  ${CLI_NAME} -f program.lov       Run program.lov
  ${CLI_NAME} -r                   Start REPL
  ${CLI_NAME} -a -f program.lov    Show AST for program.lov
  ${CLI_NAME} -d -f program.lov    Run with debug output
`);
  }

  showVersion() {
    console.log(`${CLI_NAME} v${CLI_VERSION}`);
  }

  async runFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.lov') {
        console.error(`Error: ${filePath} must have a .lov extension`);
        process.exit(1);
      }

      const input = await fs.readFile(filePath, 'utf8');
      if (this.options.debug) {
        console.log(`[DEBUG] Reading file: ${filePath}`);
        console.log(`[DEBUG] Input:\n${input}\n`);
      }

      await this.processInput(input, filePath);
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
      process.exit(1);
    }
  }

  async runRepl() {
    console.log(`Welcome to ${CLI_NAME} REPL (v${CLI_VERSION}). Type 'exit' to quit, 'help' for help.`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: PROMPT,
    });

    const interpreter = new Interpreter();
    let buffer = '';

    rl.on('line', async (line) => {
      line = line.trim();
      if (line === 'exit') {
        rl.close();
        return;
      }
      if (line === 'help') {
        console.log(`
REPL Commands:
  exit            Exit the REPL
  help            Show this message
  clear           Clear the input buffer
  ast            Toggle AST output (${this.options.ast ? 'on' : 'off'})
  debug           Toggle debug mode (${this.options.debug ? 'on' : 'off'})

Enter .lov code to evaluate. Use multi-line input with {{{ and }}} for blocks.
`);
        rl.prompt();
        return;
      }
      if (line === 'clear') {
        buffer = '';
        console.log('Buffer cleared');
        rl.prompt();
        return;
      }
      if (line === 'ast') {
        this.options.ast = !this.options.ast;
        console.log(`AST output ${this.options.ast ? 'enabled' : 'disabled'}`);
        rl.prompt();
        return;
      }
      if (line === 'debug') {
        this.options.debug = !this.options.debug;
        console.log(`Debug mode ${this.options.debug ? 'enabled' : 'disabled'}`);
        rl.prompt();
        return;
      }

      buffer += line + '\n';

      if (line === '{{{' || line === '}}}') {
        if (line === '}}}' && buffer.match(/{{{/g)?.length === buffer.match(/}}}/g)?.length) {
          try {
            await this.processInput(buffer, 'REPL');
            buffer = '';
          } catch (err) {
            console.error(`Error: ${err.message}`);
          }
        }
        rl.prompt();
        return;
      }

      // Try to process single-line input if not in a block
      if (!buffer.includes('{{{')) {
        try {
          await this.processInput(buffer, 'REPL');
          buffer = '';
        } catch (err) {
          if (!err.message.includes('Unexpected end of input')) {
            console.error(`Error: ${err.message}`);
            buffer = '';
          }
        }
      }

      rl.prompt();
    }));

    rl.on('close', () => {
      console.log('Goodbye!');
      process.exit(0);
    });

    rl.prompt();
  }

  async processInput(input, source) {
    const startTime = this.options.debug ? performance.now() : null;

    // Tokenization
    if (this.options.debug) {
      console.log(`[DEBUG] Tokenizing input from ${source}`);
    }
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    if (this.options.debug) {
      console.log('[DEBUG] Tokens:', tokens);
    }

    // Parsing
    if (this.options.debug) {
      console.log(`[DEBUG] Parsing tokens`);
    }
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    if (this.options.ast) {
      console.log('[AST Output]');
      console.log(JSON.stringify(ast, null, 2));
    }

    // Interpretation
    if (this.options.debug) {
      console.log(`[DEBUG] Interpreting AST`);
    }
    const interpreter = new Interpreter();
    const result = await interpreter.interpret(ast);
    if (result !== null && result !== undefined) {
      console.log(result);
    }

    if (this.options.debug) {
      const endTime = performance.now();
      console.log(`[DEBUG] Execution completed in ${(endTime - startTime).toFixed(2)} ms`);
    }
  }
}

// Run the CLI
const cli = new CLI();
cli.run().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

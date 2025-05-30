class Token {
  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class Tokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.keywords = new Set([
      'namespace', 'pack', 'var', 'fn', 'if', 'else', 'set', 'return', 'true', 'false', 'null',
      'public', 'private', 'internal', 'test', 'async', 'ritual', 'mold', 'while', 'loop', 'match',
      'try', 'catch', 'finally', 'throw', 'wait', 'share', 'send', 'allow', 'bridge', 'box', 'map',
      'queue', 'view', 'entity', 'job', 'money', 'promise', 'rule', 'error', 'reputation', 'consensus',
      'think', 'loose', 'target', 'bring', 'type', 'format', 'guard', 'say', 'check', 'store', 'forget',
      'http', 'socket', 'subscribe', 'audit', 'hash', 'verify', 'zk_proof', 'keygen', 'multisig',
      'num', 'word', 'bool', 'time', 'address', 'mood', 'any', 'list', 'dict', 'option', 'group',
      'union', 'future', 'on_error', 'fixed', 'short', 'tracked', 'sacred', 'forever', 'when', 'args',
      'do', 'data', 'gas', 'life', 'expect', 'field', 'needed', 'schema', 'user', 'score', 'threshold',
      'voters', 'to', 'can', 'get', 'connect', 'on_message', 'on_event', 'needs', 'binds', 'enforce',
      'changes', 'active', 'recall', 'returns', 'pattern', 'min', 'max', 'pick', 'is'
    ]);
    this.operators = new Set(['&&', '||', '==', '!=', '>', '<', '>=', '<=', '+', '-', '*', '/', '%', '!', '=', '=>', '..', '|']);
  }

  tokenize() {
    const tokens = [];
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      if (/\s/.test(char)) {
        this.advance(char === '\n');
        continue;
      }

      if (char === '/' && this.input[this.pos + 1] === '/') {
        tokens.push(this.readLineComment());
        continue;
      }

      if (char === '/' && this.input[this.pos + 1] === '*') {
        tokens.push(this.readBlockComment());
        continue;
      }

      if (/[a-zA-Z]/.test(char)) {
        tokens.push(this.readIdentifierOrKeyword());
        continue;
      }

      if (/[0-9]/.test(char) || (char === '0' && this.input[this.pos + 1] === 'x')) {
        tokens.push(this.readNumberOrHex());
        continue;
      }

      if (char === '"') {
        tokens.push(this.readText());
        continue;
      }

      if (/[A-Za-z0-9+/=]/.test(char) && this.isBase64Start()) {
        tokens.push(this.readBase64());
        continue;
      }

      if (this.isOperatorStart()) {
        tokens.push(this.readOperator());
        continue;
      }

      if ('{}[](),:;'.includes(char)) {
        tokens.push(new Token('symbol', char, this.line, this.column));
        this.advance();
        continue;
      }

      throw new Error(`Unexpected character '${char}' at ${this.line}:${this.column}`);
    }
    tokens.push(new Token('eof', '', this.line, this.column));
    return tokens;
  }

  advance(newline = false) {
    this.pos++;
    this.column = newline ? 1 : this.column + 1;
    if (newline) this.line++;
  }

  readLineComment() {
    const startColumn = this.column;
    let value = '//';
    this.pos += 2;
    this.column += 2;
    while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
      value += this.input[this.pos];
      this.pos++;
      this.column++;
    }
    if (this.pos < this.input.length) {
      this.advance(true);
    }
    return new Token('line-comment', value, this.line - 1, startColumn);
  }

  readBlockComment() {
    const startColumn = this.column;
    let value = '/*';
    this.pos += 2;
    this.column += 2;
    while (this.pos < this.input.length - 1 && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
      value += this.input[this.pos];
      this.advance(this.input[this.pos] === '\n');
    }
    if (this.pos < this.input.length - 1) {
      value += '*/';
      this.pos += 2;
      this.column += 2;
    } else {
      throw new Error(`Unclosed block comment at ${this.line}:${startColumn}`);
    }
    return new Token('block-comment', value, this.line, startColumn);
  }

  readIdentifierOrKeyword() {
    let value = '';
    const startColumn = this.column;
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }
    const type = this.keywords.has(value) ? 'keyword' : 'identifier';
    return new Token(type, value, this.line, startColumn);
  }

  readNumberOrHex() {
    let value = '';
    const startColumn = this.column;
    if (this.input[this.pos] === '0' && this.input[this.pos + 1] === 'x') {
      value = '0x';
      this.pos += 2;
      this.column += 2;
      while (this.pos < this.input.length && /[0-9a-fA-F]/.test(this.input[this.pos])) {
        value += this.input[this.pos];
        this.advance();
      }
      return new Token('hex', value, this.line, startColumn);
    }
    while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }
    return new Token(value.includes('.') ? 'decimal' : 'number', value, this.line, startColumn);
  }

  readText() {
    let value = '';
    const startColumn = this.column;
    this.advance(); // Skip opening quote
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      value += this.input[this.pos];
      this.advance();
    }
    if (this.pos < this.input.length) {
      this.advance(); // Skip closing quote
    } else {
      throw new Error(`Unclosed string at ${this.line}:${startColumn}`);
    }
    return new Token('text', value, this.line, startColumn);
  }

  readBase64() {
    let value = '';
    const startColumn = this.column;
    while (this.pos < this.input.length && /[A-Za-z0-9+/=]/.test(this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }
    return new Token('base64', value, this.line, startColumn);
  }

  isBase64Start() {
    const slice = this.input.slice(this.pos, this.pos + 4);
    return /^[A-Za-z0-9+/=]+$/.test(slice);
  }

  readOperator() {
    const startColumn = this.column;
    let value = this.input[this.pos];
    this.advance();
    if (this.pos < this.input.length && this.operators.has(value + this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }
    return new Token('operator', value, this.line, startColumn);
  }

  isOperatorStart() {
    const next = this.input[this.pos] + (this.input[this.pos + 1] || '');
    return this.operators.has(this.input[this.pos]) || this.operators.has(next);
  }
}

module.exports = { Token, Tokenizer };

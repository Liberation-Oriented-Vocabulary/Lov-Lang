const { Token } = require('./tokenizer');

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || { type: 'eof', value: '', line: this.tokens[this.pos - 1]?.line || 1, column: 0 };
  }

  consume(type, value = null) {
    const token = this.peek();
    if (token.type === 'eof') {
      throw new Error(`Unexpected end of input, expected ${value || type} at ${token.line}:${token.column}`);
    }
    if (token.type !== type || (value && token.value !== value)) {
      throw new Error(`Expected ${value || type}, got ${token.value} at ${token.line}:${token.column}`);
    }
    this.pos++;
    return token;
  }

  parseProgram() {
    const node = { type: 'Program', body: [] };
    while (this.peek().type !== 'eof') {
      if (this.peek().type === 'keyword') {
        switch (this.peek().value) {
          case 'namespace':
            node.body.push(this.parseNamespace());
            break;
          case 'pack':
            node.body.push(this.parsePack());
            break;
          case 'line-comment':
          case 'block-comment':
            node.body.push(this.parseNote());
            break;
          default:
            throw new Error(`Unexpected keyword ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
        }
      } else {
        throw new Error(`Unexpected token ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
      }
    }
    return node;
  }

  parseNamespace() {
    this.consume('keyword', 'namespace');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const body = [];
    while (this.peek().value !== '}') {
      body.push(this.parseNamespaceOrPackBody());
    }
    this.consume('symbol', '}');
    return { type: 'Namespace', name, body };
  }

  parsePack() {
    this.consume('keyword', 'pack');
    const name = this.consume('identifier').value;
    const tags = this.parseTags();
    this.consume('symbol', '{');
    const body = [];
    while (this.peek().value !== '}') {
      body.push(this.parseNamespaceOrPackBody());
    }
    this.consume('symbol', '}');
    return { type: 'Pack', name, tags, body };
  }

  parseNamespaceOrPackBody() {
    if (this.peek().type === 'keyword') {
      switch (this.peek().value) {
        case 'pack':
          return this.parsePack();
        case 'var':
          return this.parseVarDecl();
        case 'fn':
          return this.parseFnDecl();
        case 'box':
          return this.parseBoxDecl();
        case 'map':
          return this.parseMapDecl();
        case 'queue':
          return this.parseQueueDecl();
        case 'view':
          return this.parseViewDecl();
        case 'entity':
          return this.parseEntityDecl();
        case 'job':
          return this.parseJobDecl();
        case 'money':
          return this.parseMoneyDecl();
        case 'promise':
          return this.parsePromiseDecl();
        case 'reputation':
          return this.parseReputationDecl();
        case 'consensus':
          return this.parseConsensusDecl();
        case 'share':
          return this.parseShareDecl();
        case 'send':
          return this.parseSendDecl();
        case 'allow':
          return this.parseAllowDecl();
        case 'bridge':
          return this.parseBridgeDecl();
        case 'think':
          return this.parseThinkDecl();
        case 'loose':
          return this.parseLooseDecl();
        case 'target':
          return this.parseTargetDecl();
        case 'type':
          return this.parseTypeDecl();
        case 'format':
          return this.parseFormatDecl();
        case 'guard':
          return this.parseGuardDecl();
        case 'error':
          return this.parseErrorDecl();
        case 'test':
          return this.parseTestDecl();
        case 'line-comment':
        case 'block-comment':
          return this.parseNote();
        default:
          throw new Error(`Unexpected keyword ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
      }
    }
    throw new Error(`Unexpected token ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
  }

  parseNote() {
    const token = this.peek();
    if (token.type === 'line-comment' || token.type === 'block-comment') {
      this.pos++;
      return { type: token.type === 'line-comment' ? 'LineNote' : 'BlockNote', value: token.value };
    }
    throw new Error(`Expected comment, got ${token.value} at ${token.line}:${token.column}`);
  }

  parseTags() {
    const tags = [];
    while (this.peek().value === '[') {
      this.consume('symbol', '[');
      while (this.peek().value !== ']') {
        tags.push(this.consume('keyword').value);
      }
      this.consume('symbol', ']');
    }
    return tags;
  }

  parseVarDecl() {
    this.consume('keyword', 'var');
    const names = this.parseNameOrSplit();
    let type = null;
    if (this.peek().value === ':') {
      this.consume('symbol', ':');
      type = this.peek().value === 'infer' ? { type: 'InferType' } : this.parseType();
    }
    this.consume('symbol', '=');
    const value = this.parseExpr();
    this.consume('symbol', ';');
    return { type: 'VarDecl', names, type, value };
  }

  parseBoxDecl() {
    this.consume('keyword', 'box');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const fields = [];
    while (this.peek().value !== '}') {
      const fieldName = this.consume('identifier').value;
      this.consume('symbol', ':');
      const fieldType = this.parseType();
      let defaultValue = null;
      if (this.peek().value === '=') {
        this.consume('symbol', '=');
        defaultValue = this.peek().value === 'active' ? this.parseActiveExpr() : this.parseExpr();
      }
      fields.push({ name: fieldName, type: fieldType, defaultValue });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'BoxDecl', name, tags, fields };
  }

  parseActiveExpr() {
    this.consume('keyword', 'active');
    const expr = this.parseExpr();
    return { type: 'ActiveExpr', value: expr };
  }

  parseMapDecl() {
    this.consume('keyword', 'map');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    this.consume('keyword', 'box');
    const boxName = this.consume('identifier').value;
    this.consume('symbol', '{');
    const fields = [];
    while (this.peek().value !== '}') {
      fields.push({ name: this.consume('identifier').value, type: { type: 'SimpleType', value: 'text' } });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    this.consume('symbol', '}');
    return { type: 'MapDecl', name, tags, box: { name: boxName, fields } };
  }

  parseQueueDecl() {
    this.consume('keyword', 'queue');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', ';');
    return { type: 'QueueDecl', name, tags };
  }

  parseViewDecl() {
    this.consume('keyword', 'view');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const fields = [];
    const events = [];
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_event') {
        this.consume('keyword', 'on_event');
        const eventName = this.consume('text').value;
        this.consume('symbol', '{');
        const actions = [];
        let onError = null;
        while (this.peek().value !== '}') {
          if (this.peek().value === 'on_error') {
            onError = this.parseOnError();
          } else {
            actions.push(this.parseAction());
          }
        }
        this.consume('symbol', '}');
        events.push({ name: eventName, actions, onError });
      } else {
        const fieldName = this.consume('identifier').value;
        this.consume('symbol', ':');
        const fieldType = this.parseType();
        fields.push({ name: fieldName, type: fieldType });
        if (this.peek().value === ',') {
          this.consume('symbol', ',');
        }
      }
    }
    this.consume('symbol', '}');
    return { type: 'ViewDecl', name, tags, fields, events };
  }

  parseEntityDecl() {
    this.consume('keyword', 'entity');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    const changes = [];
    while (this.peek().value === '[') {
      this.consume('symbol', '[');
      changes.push(this.consume('keyword').value);
      this.consume('symbol', ']');
    }
    this.consume('symbol', '{');
    const fields = [];
    while (this.peek().value !== '}') {
      const fieldName = this.consume('identifier').value;
      this.consume('symbol', ':');
      const fieldType = this.parseType();
      fields.push({ name: fieldName, type: fieldType });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'EntityDecl', name, tags, changes, fields };
  }

  parseJobDecl() {
    this.consume('keyword', 'job');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const config = [];
    const actions = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else if (['when', 'args', 'do', 'data', 'gas', 'audit', 'life', 'check'].includes(this.peek().value)) {
        config.push(this.parseConfigField());
      } else {
        actions.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'JobDecl', name, tags, config, actions, onError };
  }

  parseConfigField() {
    const field = this.consume('keyword').value;
    this.consume('symbol', ':');
    if (field === 'when' || field === 'do') {
      return { type: field, value: this.consume('text').value };
    }
    if (field === 'args') {
      this.consume('symbol', '<');
      const args = [];
      while (this.peek().value !== '>') {
        const argName = this.consume('identifier').value;
        let argType = null;
        if (this.peek().value === ':') {
          this.consume('symbol', ':');
          argType = this.parseType();
        }
        args.push({ name: argName, type: argType });
        if (this.peek().value === ',') {
          this.consume('symbol', ',');
        }
      }
      this.consume('symbol', '>');
      return { type: 'args', value: args };
    }
    if (field === 'data') {
      return { type: 'data', value: this.parseBoxExpr() };
    }
    if (field === 'gas') {
      this.consume('symbol', '{');
      this.consume('keyword', 'max');
      this.consume('symbol', ':');
      const maxValue = this.consume('number').value;
      this.consume('symbol', ',');
      this.consume('keyword', 'fee');
      this.consume('symbol', ':');
      const feeValue = this.consume('text').value;
      this.consume('symbol', '}');
      return { type: 'gas', value: { max: parseInt(maxValue), fee: feeValue } };
    }
    if (field === 'audit') {
      return { type: 'audit', value: this.consume('text').value };
    }
    if (field === 'life') {
      return { type: 'life', value: this.consume('keyword').value };
    }
    if (field === 'check') {
      this.consume('symbol', '{');
      this.consume('keyword', 'field');
      this.consume('symbol', ':');
      const fieldValue = this.consume('text').value;
      this.consume('symbol', ',');
      this.consume('keyword', 'needed');
      this.consume('symbol', ':');
      const neededValue = this.consume('keyword').value;
      this.consume('symbol', ',');
      this.consume('keyword', 'error');
      this.consume('symbol', ':');
      const errorValue = this.consume('text').value;
      this.consume('symbol', '}');
      return { type: 'check', value: { field: fieldValue, needed: neededValue === 'yes', error: errorValue } };
    }
    throw new Error(`Unexpected config field ${field} at ${this.peek().line}:${this.peek().column}`);
  }

  parseMoneyDecl() {
    this.consume('keyword', 'money');
    const tags = this.parseTags();
    this.consume('symbol', '{');
    const rules = [];
    while (this.peek().value !== '}') {
      const ruleType = this.consume('keyword').value;
      if (!['earn', 'reward'].includes(ruleType)) {
        throw new Error(`Expected earn or reward, got ${ruleType} at ${this.peek().line}:${this.peek().column}`);
      }
      const box = this.parseBoxExpr();
      let when = null;
      let amount = null;
      if (this.peek().value === 'when') {
        this.consume('keyword', 'when');
        when = this.parseExpr();
      }
      if (this.peek().value === 'amount') {
        this.consume('keyword', 'amount');
        amount = this.consume('number').value;
      }
      rules.push({ type: ruleType, box, when, amount: amount ? parseInt(amount) : null });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'MoneyDecl', tags, rules };
  }

  parsePromiseDecl() {
    this.consume('keyword', 'promise');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    let needs = null, binds = null, check = null, enforce = null;
    while (this.peek().value !== '}') {
      const field = this.consume('keyword').value;
      this.consume('symbol', ':');
      if (field === 'needs') {
        needs = this.parseRoleList();
      } else if (field === 'binds') {
        binds = this.parseJobList();
      } else if (field === 'check') {
        check = this.parseExpr();
      } else if (field === 'enforce') {
        this.consume('symbol', '{');
        enforce = [];
        while (this.peek().value !== '}') {
          enforce.push(this.parseAction());
        }
        this.consume('symbol', '}');
      } else {
        throw new Error(`Unexpected field ${field} at ${this.peek().line}:${this.peek().column}`);
      }
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'PromiseDecl', name, tags, needs, binds, check, enforce };
  }

  parseRoleList() {
    this.consume('symbol', '[');
    const roles = [];
    while (this.peek().value !== ']') {
      roles.push(this.consume('identifier').value);
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ']');
    return roles;
  }

  parseJobList() {
    this.consume('symbol', '[');
    const jobs = [];
    while (this.peek().value !== ']') {
      jobs.push(this.consume('identifier').value);
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ']');
    return jobs;
  }

  parseReputationDecl() {
    this.consume('keyword', 'reputation');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    this.consume('keyword', 'user');
    this.consume('symbol', ':');
    const user = this.consume('identifier').value;
    this.consume('symbol', ',');
    this.consume('keyword', 'score');
    this.consume('symbol', ':');
    const score = this.consume('number').value;
    this.consume('symbol', '}');
    return { type: 'ReputationDecl', name, user, score: parseInt(score) };
  }

  parseConsensusDecl() {
    this.consume('keyword', 'consensus');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    this.consume('keyword', 'threshold');
    this.consume('symbol', ':');
    const threshold = this.consume('number').value;
    this.consume('symbol', ',');
    this.consume('keyword', 'voters');
    this.consume('symbol', ':');
    this.consume('symbol', '[');
    const voters = [];
    while (this.peek().value !== ']') {
      voters.push(this.consume('identifier').value);
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ']');
    this.consume('symbol', ',');
    const actions = [];
    while (this.peek().value !== '}') {
      actions.push(this.parseAction());
    }
    this.consume('symbol', '}');
    return { type: 'ConsensusDecl', name, threshold: parseInt(threshold), voters, actions };
  }

  parseShareDecl() {
    this.consume('keyword', 'share');
    const name = this.consume('identifier').value;
    this.consume('keyword', 'to');
    const target = this.consume('text').value;
    this.consume('symbol', ';');
    return { type: 'ShareDecl', name, target };
  }

  parseSendDecl() {
    this.consume('keyword', 'send');
    this.consume('keyword', 'pack');
    const name = this.consume('identifier').value;
    this.consume('keyword', 'to');
    const target = this.consume('text').value;
    this.consume('symbol', ';');
    return { type: 'SendDecl', name, target };
  }

  parseAllowDecl() {
    this.consume('keyword', 'allow');
    const name = this.consume('identifier').value;
    this.consume('keyword', 'can');
    const permission = this.consume('keyword').value;
    if (!['read', 'write', 'run'].includes(permission)) {
      throw new Error(`Expected read, write, or run, got ${permission} at ${this.peek().line}:${this.peek().column}`);
    }
    const target = this.consume('identifier').value;
    this.consume('symbol', ';');
    return { type: 'AllowDecl', name, permission, target };
  }

  parseBridgeDecl() {
    this.consume('keyword', 'bridge');
    const name = this.consume('identifier').value;
    this.consume('keyword', 'to');
    const target = this.consume('text').value;
    this.consume('symbol', '{');
    const actions = [];
    while (this.peek().value !== '}') {
      actions.push(this.parseAction());
    }
    this.consume('symbol', '}');
    return { type: 'BridgeDecl', name, target, actions };
  }

  parseThinkDecl() {
    this.consume('keyword', 'think');
    const name = this.consume('identifier').value;
    this.consume('symbol', ';');
    return { type: 'ThinkDecl', name };
  }

  parseLooseDecl() {
    this.consume('keyword', 'loose');
    const expr = this.parseExpr();
    this.consume('symbol', ';');
    return { type: 'LooseDecl', expr };
  }

  parseTargetDecl() {
    this.consume('keyword', 'target');
    const target = this.consume('text').value;
    this.consume('symbol', ';');
    return { type: 'TargetDecl', target };
  }

  parseTypeDecl() {
    this.consume('keyword', 'type');
    const name = this.consume('identifier').value;
    this.consume('symbol', '=');
    const type = this.parseType();
    this.consume('symbol', ';');
    return { type: 'TypeDecl', name, type };
  }

  parseFormatDecl() {
    this.consume('keyword', 'format');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    this.consume('keyword', 'type');
    this.consume('symbol', ':');
    const formatType = this.consume('keyword').value;
    if (!['json', 'cbor'].includes(formatType)) {
      throw new Error(`Expected json or cbor, got ${formatType} at ${this.peek().line}:${this.peek().column}`);
    }
    this.consume('symbol', ',');
    this.consume('keyword', 'schema');
    this.consume('symbol', ':');
    const schema = this.parseExpr();
    this.consume('symbol', '}');
    return { type: 'FormatDecl', name, formatType, schema };
  }

  parseGuardDecl() {
    this.consume('keyword', 'guard');
    const name = this.consume('identifier').value;
    let type = null;
    if (this.peek().value === ':') {
      this.consume('symbol', ':');
      type = this.parseType();
    }
    this.consume('symbol', '{');
    const expr = this.parseExpr();
    this.consume('symbol', '}');
    return { type: 'GuardDecl', name, type, expr };
  }

  parseErrorDecl() {
    this.consume('keyword', 'error');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const fields = [];
    while (this.peek().value !== '}') {
      const fieldName = this.consume('identifier').value;
      this.consume('symbol', ':');
      const fieldType = this.parseType();
      fields.push({ name: fieldName, type: fieldType });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'ErrorDecl', name, fields };
  }

  parseTestDecl() {
    this.consume('keyword', 'test');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const cases = [];
    while (this.peek().value !== '}') {
      cases.push(this.parseTestCase());
    }
    this.consume('symbol', '}');
    return { type: 'TestDecl', name, tags, cases };
  }

  parseTestCase() {
    this.consume('keyword', 'test');
    const name = this.consume('identifier').value;
    this.consume('symbol', '{');
    const actions = [];
    const expects = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'expect') {
        this.consume('keyword', 'expect');
        if (this.peek().value === 'error') {
          this.consume('keyword', 'error');
          this.consume('keyword', 'is');
          this.consume('keyword', 'error');
          const errorName = this.consume('identifier').value;
          expects.push({ type: 'ExpectError', errorName });
        } else {
          const left = this.parseExpr();
          this.consume('operator', '==');
          const right = this.parseExpr();
          expects.push({ type: 'ExpectExpr', left, right });
        }
      } else if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        actions.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'TestCase', name, actions, expects, onError };
  }

  parseType() {
    const token = this.peek();
    if (['num', 'word', 'bool', 'time', 'address', 'mood', 'any'].includes(token.value)) {
      this.pos++;
      return { type: 'SimpleType', value: token.value };
    }
    if (token.value === 'list') {
      this.consume('keyword', 'list');
      this.consume('symbol', '<');
      const typeRule = this.parseType();
      this.consume('symbol', '>');
      return { type: 'ListType', typeRule };
    }
    if (token.value === 'dict') {
      this.consume('keyword', 'dict');
      this.consume('symbol', '<');
      const keyType = this.parseType();
      this.consume('symbol', ',');
      const valueType = this.parseType();
      this.consume('symbol', '>');
      return { type: 'DictType', keyType, valueType };
    }
    if (token.value === 'option') {
      this.consume('keyword', 'option');
      this.consume('symbol', '<');
      const typeRule = this.parseType();
      this.consume('symbol', '>');
      return { type: 'OptionType', typeRule };
    }
    if (token.value === 'box') {
      this.consume('keyword', 'box');
      const name = this.consume('identifier').value;
      return { type: 'BoxType', name };
    }
    if (token.value === 'group') {
      this.consume('keyword', 'group');
      this.consume('symbol', '(');
      const types = [];
      while (this.peek().value !== ')') {
        types.push(this.parseType());
        if (this.peek().value === ',') {
          this.consume('symbol', ',');
        }
      }
      this.consume('symbol', ')');
      return { type: 'GroupType', types };
    }
    if (token.value === 'union') {
      this.consume('keyword', 'union');
      this.consume('symbol', '(');
      const types = [];
      while (this.peek().value !== ')') {
        types.push(this.parseType());
        if (this.peek().value === '|') {
          this.consume('symbol', '|');
        }
      }
      this.consume('symbol', ')');
      return { type: 'UnionType', types };
    }
    if (token.value === 'future') {
      this.consume('keyword', 'future');
      this.consume('symbol', '<');
      const typeRule = this.parseType();
      this.consume('symbol', '>');
      return { type: 'FutureType', typeRule };
    }
    if (token.value === 'error') {
      this.consume('keyword', 'error');
      const name = this.consume('identifier').value;
      return { type: 'ErrorType', name };
    }
    const name = this.consume('identifier').value;
    let limit = null;
    if (this.peek().value === ':') {
      this.consume('symbol', ':');
      limit = this.parseTypeRuleLimit();
    }
    return { type: 'NamedType', name, limit };
  }

  parseTypeRuleLimit() {
    if (['min', 'max'].includes(this.peek().value)) {
      const type = this.consume('keyword').value;
      this.consume('symbol', ':');
      const value = this.consume('number').value;
      return { type, value: parseInt(value) };
    }
    if (this.peek().value === 'pattern') {
      this.consume('keyword', 'pattern');
      this.consume('symbol', ':');
      const value = this.consume('text').value;
      return { type: 'pattern', value };
    }
    const names = [];
    while (this.peek().type === 'identifier') {
      names.push(this.consume('identifier').value);
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    return { type: 'names', value: names };
  }

  parseFnDecl() {
    this.consume('keyword', 'fn');
    const tags = this.parseTags();
    const name = this.consume('identifier').value;
    this.consume('symbol', '(');
    const args = [];
    while (this.peek().value !== ')') {
      const argName = this.consume('identifier').value;
      let argType = null;
      if (this.peek().value === ':') {
        this.consume('symbol', ':');
        argType = this.parseType();
      }
      args.push({ name: argName, type: argType });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ')');
    let returnType = null;
    if (this.peek().value === ':') {
      this.consume('symbol', ':');
      returnType = this.parseType();
    }
    this.consume('symbol', '{');
    const body = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        body.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'FnDecl', name, tags, args, returnType, body, onError };
  }

  parseNameOrSplit() {
    if (this.peek().value === '(') {
      this.consume('symbol', '(');
      const names = [];
      while (this.peek().value !== ')') {
        names.push(this.consume('identifier').value);
        if (this.peek().value === ',') {
          this.consume('symbol', ',');
        }
      }
      this.consume('symbol', ')');
      return { type: 'Split', names };
    }
    return { type: 'Name', value: this.consume('identifier').value };
  }

  parseExpr() {
    if (this.peek().value === 'throw') {
      return this.parseThrowExpr();
    }
    if (this.peek().value === 'wait') {
      return this.parseWaitExpr();
    }
    if (this.peek().value === 'fn') {
      return this.parseSmallFnExpr();
    }
    if (this.peek().value === 'recall') {
      return this.parseQueryExpr();
    }
    return this.parseLogicExpr();
  }

  parseLogicExpr() {
    let expr = this.parseCompareExpr();
    while (this.peek().type === 'operator' && ['&&', '||'].includes(this.peek().value)) {
      const op = this.consume('operator').value;
      const right = this.parseCompareExpr();
      expr = { type: 'BinaryExpr', op, left: expr, right };
    }
    return expr;
  }

  parseCompareExpr() {
    let expr = this.parseMathExpr();
    while (this.peek().type === 'operator' && ['==', '!=', '>', '<', '>=', '<='].includes(this.peek().value)) {
      const op = this.consume('operator').value;
      const right = this.parseMathExpr();
      expr = { type: 'BinaryExpr', op, left: expr, right };
    }
    return expr;
  }

  parseMathExpr() {
    let expr = this.parseTermExpr();
    while (this.peek().type === 'operator' && ['+', '-'].includes(this.peek().value)) {
      const op = this.consume('operator').value;
      const right = this.parseTermExpr();
      expr = { type: 'BinaryExpr', op, left: expr, right };
    }
    return expr;
  }

  parseTermExpr() {
    let expr = this.parseFactorExpr();
    while (this.peek().type === 'operator' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.consume('operator').value;
      const right = this.parseFactorExpr();
      expr = { type: 'BinaryExpr', op, left: expr, right };
    }
    return expr;
  }

  parseFactorExpr() {
    const token = this.peek();
    if (token.type === 'number' || token.type === 'decimal') {
      this.pos++;
      return { type: 'Number', value: parseFloat(token.value) };
    }
    if (token.type === 'hex') {
      this.pos++;
      return { type: 'Hex', value: token.value };
    }
    if (token.type === 'base64') {
      this.pos++;
      return { type: 'Base64', value: token.value };
    }
    if (token.type === 'text') {
      this.pos++;
      return { type: 'Text', value: token.value };
    }
    if (token.type === 'keyword' && ['true', 'false', 'null'].includes(token.value)) {
      this.pos++;
      return { type: 'Literal', value: token.value === 'true' ? true : token.value === 'false' ? false : null };
    }
    if (token.type === 'identifier') {
      this.pos++;
      if (this.peek().value === '(') {
        return this.parseCall(token.value);
      }
      if (this.peek().value === '{') {
        return this.parseBoxExpr(token.value);
      }
      return { type: 'Identifier', value: token.value };
    }
    if (token.value === '(') {
      this.consume('symbol', '(');
      if institución
        this.consume('symbol', ')');
        return { type: 'GroupExpr', elements: [] };
      }
      const expr = this.parseExpr();
      if (this.peek().value === ',') {
        const elements = [expr];
        while (this.peek().value === ',') {
          this.consume('symbol', ',');
          elements.push(this.parseExpr());
        }
        this.consume('symbol', ')');
        return { type: 'GroupExpr', elements };
      }
      this.consume('symbol', ')');
      return expr;
    }
    if (token.value === '{') {
      return this.parseDictExpr();
    }
    if (token.value === '[') {
      return this.parseListExpr();
    }
    if (token.type === 'operator' && ['!', '-'].includes(token.value)) {
      this.pos++;
      const expr = this.parseFactorExpr();
      return { type: 'NotExpr', op: token.value, expr };
    }
    throw new Error(`Unexpected token ${token.value} at ${token.line}:${token.column}`);
  }

  parseCall(name) {
    this.consume('symbol', '(');
    const args = [];
    while (this.peek().value !== ')') {
      args.push(this.parseExpr());
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ')');
    return { type: 'Call', name, args };
  }

  parseDictExpr() {
    this.consume('symbol', '{');
    const entries = [];
    while (this.peek().value !== '}') {
      const key = this.consume('identifier').value;
      this.consume('symbol', ':');
      const value = this.parseExpr();
      entries.push({ key, value });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'DictExpr', entries };
  }

  parseListExpr() {
    this.consume('symbol', '[');
    const elements = [];
    while (this.peek().value !== ']') {
      elements.push(this.parseExpr());
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ']');
    return { type: 'ListExpr', elements };
  }

  parseBoxExpr(name = null) {
    if (!name) {
      name = this.consume('identifier').value;
    }
    this.consume('symbol', '{');
    const entries = [];
    while (this.peek().value !== '}') {
      const key = this.consume('identifier').value;
      this.consume('symbol', ':');
      const value = this.parseExpr();
      entries.push({ key, value });
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', '}');
    return { type: 'BoxExpr', name, entries };
  }

  parseSmallFnExpr() {
    this.consume('keyword', 'fn');
    let grab = null;
    if (this.peek().value === '[') {
      this.consume('symbol', '[');
      grab = [];
      while (this.peek().value !== ']') {
        grab.push(this.consume('identifier').value);
        if (this.peek().value === ',') {
          this.consume('symbol', ',');
        }
      }
      this.consume('symbol', ']');
    }
    this.consume('symbol', '(');
    const args = [];
    while (this.peek().value !== ')') {
      args.push(this.consume('identifier').value);
      if (this.peek().value === ',') {
        this.consume('symbol', ',');
      }
    }
    this.consume('symbol', ')');
    this.consume('operator', '=>');
    const expr = this.parseExpr();
    return { type: 'SmallFnExpr', grab, args, expr };
  }

  parseWaitExpr() {
    this.consume('keyword', 'wait');
    const expr = this.parseExpr();
    return { type: 'WaitExpr', expr };
  }

  parseThrowExpr() {
    this.consume('keyword', 'throw');
    this.consume('keyword', 'error');
    const name = this.consume('identifier').value;
    const expr = this.parseExpr();
    return { type: 'ThrowExpr', name, expr };
  }

  parseQueryExpr() {
    this.consume('keyword', 'recall');
    this.consume('symbol', '(');
    const query = this.consume('text').value;
    this.consume('symbol', ')');
    this.consume('keyword', 'returns');
    const type = this.parseType();
    return { type: 'QueryExpr', query, type };
  }

  parseAction() {
    if (this.peek().type === 'keyword') {
      switch (this.peek().value) {
        case 'set':
          return this.parseSetAction();
        case 'if':
          return this.parseIfAction();
        case 'loop':
          return this.parseLoopAction();
        case 'while':
          return this.parseWhileAction();
        case 'match':
          return this.parseMatchAction();
        case 'try':
          return this.parseTryAction();
        case 'return':
          return this.parseReturnAction();
        case 'say':
          return this.parseSayAction();
        case 'check':
          return this.parseCheckAction();
        case 'store':
          return this.parseStoreAction();
        case 'forget':
          return this.parseForgetAction();
        case 'http':
          return this.parseHttpAction();
        case 'socket':
          return this.parseSocketAction();
        case 'subscribe':
          return this.parseSubscribeAction();
        case 'audit':
          return this.parseAuditAction();
        case 'hash':
        case 'verify':
        case 'zk_proof':
        case 'keygen':
        case 'multisig':
          return this.parseCryptoAction();
        case 'wait':
          return this.parseWaitAction();
        case 'ask':
          return this.parseAskAction();
        default:
          throw new Error(`Unsupported action ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
      }
    }
    throw new Error(`Expected action, got ${this.peek().value} at ${this.peek().line}:${this.peek().column}`);
  }

  parseAskAction() {
    this.consume('keyword', 'ask');
    const name = this.consume('identifier').value;
    let where = null;
    if (this.peek().value === 'where') {
      this.consume('keyword', 'where');
      where = this.parseExpr();
    }
    this.consume('keyword', 'returns');
    const type = this.parseType();
    this.consume('symbol', ';');
    return { type: 'AskAction', name, where, type };
  }

  parseSetAction() {
    this.consume('keyword', 'set');
    const target = this.parseNameOrSplit();
    this.consume('symbol', '=');
    const value = this.parseExpr();
    this.consume('symbol', ';');
    return { type: 'SetAction', target, value };
  }

  parseIfAction() {
    this.consume('keyword', 'if');
    const condition = this.parseExpr();
    this.consume('symbol', '{');
    const thenBranch = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        thenBranch.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    let elseBranch = null;
    if (this.peek().value === 'else') {
      this.consume('keyword', 'else');
      this.consume('symbol', '{');
      elseBranch = [];
      while (this.peek().value !== '}') {
        if (this.peek().value === 'on_error') {
          onError = this.parseOnError();
        } else {
          elseBranch.push(this.parseAction());
        }
      }
      this.consume('symbol', '}');
    }
    return { type: 'IfAction', condition, thenBranch, elseBranch, onError };
  }

  parseLoopAction() {
    this.consume('keyword', 'loop');
    const target = this.parseNameOrSplit();
    this.consume('keyword', 'in');
    const range = this.parseRange();
    this.consume('symbol', '{');
    const body = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        body.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'LoopAction', target, range, body, onError };
  }

  parseRange() {
    const start = this.parseExpr();
    this.consume('operator', '..');
    const end = this.parseExpr();
    return { start, end };
  }

  parseWhileAction() {
    this.consume('keyword', 'while');
    const condition = this.parseExpr();
    this.consume('symbol', '{');
    const body = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        body.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'WhileAction', condition, body, onError };
  }

  parseMatchAction() {
    this.consume('keyword', 'match');
    const expr = this.parseExpr();
    if (this.peek().value === '=>') {
      this.consume('operator', '=>');
      const action = this.parseAction();
      return { type: 'MatchAction', expr, body: { type: 'SimpleMatch', action } };
    }
    this.consume('symbol', '{');
    const cases = [];
    while (this.peek().value !== '}') {
      cases.push(this.parseMatchCase());
    }
    this.consume('symbol', '}');
    return { type: 'MatchAction', expr, body: { type: 'MatchBody', cases } };
  }

  parseMatchCase() {
    this.consume('keyword', 'pick');
    let pattern;
    if (this.peek().value === 'else') {
      this.consume('keyword', 'else');
      this.consume('operator', '=>');
      const actions = [];
      while (this.peek().type === 'keyword' && !['pick', '}'].includes(this.peek().value)) {
        actions.push(this.parseAction());
      }
      return { type: 'MatchCase', pattern: { type: 'Else' }, actions };
    }
    if (this.peek().value === '(') {
      this.consume('symbol', '(');
      const type = this.parseType();
      this.consume('symbol', ':');
      const name = this.consume('identifier').value;
      this.consume('symbol', ')');
      pattern = { type: 'UnionCase', type, name };
    } else {
      const name = this.consume('identifier').value;
      let subNames = null;
      if (this.peek().value === '(') {
        this.consume('symbol', '(');
        subNames = [];
        while (this.peek().value !== ')') {
          subNames.push(this.consume('identifier').value);
          if (this.peek().value === ',') {
            this.consume('symbol', ',');
          }
        }
        this.consume('symbol', ')');
        pattern = { type: 'Destructure', name, subNames };
      } else {
        pattern = { type: 'Name', name };
      }
    }
    this.consume('operator', '=>');
    const actions = [];
    while (this.peek().type === 'keyword' && !['pick', '}'].includes(this.peek().value)) {
      actions.push(this.parseAction());
    }
    return { type: 'MatchCase', pattern, actions };
  }

  parseTryAction() {
    this.consume('keyword', 'try');
    this.consume('symbol', '{');
    const tryBlock = [];
    let tryOnError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        tryOnError = this.parseOnError();
      } else {
        tryBlock.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    let catchBlock = null;
    if (this.peek().value === 'catch') {
      this.consume('keyword', 'catch');
      this.consume('symbol', '(');
      const name = this.consume('identifier').value;
      this.consume('symbol', ':');
      this.consume('keyword', 'error');
      const errorName = this.consume('identifier').value;
      this.consume('symbol', ')');
      this.consume('symbol', '{');
      const actions = [];
      while (this.peek().value !== '}') {
        actions.push(this.parseAction());
      }
      this.consume('symbol', '}');
      catchBlock = { name, errorName, actions };
    }
    let finallyBlock = null;
    if (this.peek().value === 'finally') {
      this.consume('keyword', 'finally');
      this.consume('symbol', '{');
      finallyBlock = [];
      while (this.peek().value !== '}') {
        finallyBlock.push(this.parseAction());
      }
      this.consume('symbol', '}');
    }
    return { type: 'TryAction', tryBlock, tryOnError, catchBlock, finallyBlock };
  }

  parseReturnAction() {
    this.consume('keyword', 'return');
    let type = null;
    if (this.peek().value === '(') {
      this.consume('symbol', '(');
      type = this.parseType();
      this.consume('symbol', ')');
    }
    const value = this.parseExpr();
    this.consume('symbol', ';');
    return { type: 'ReturnAction', type, value };
  }

  parseSayAction() {
    this.consume('keyword', 'say');
    const expr = this.parseExpr();
    this.consume('symbol', ';');
    return { type: 'SayAction', expr };
  }

  parseCheckAction() {
    this.consume('keyword', 'check');
    const expr = this.parseExpr();
    this.consume('symbol', ',');
    const message = this.consume('text').value;
    this.consume('symbol', ';');
    return { type: 'CheckAction', expr, message };
  }

  parseStoreAction() {
    this.consume('keyword', 'store');
    this.consume('symbol', '(');
    const key = this.consume('text').value;
    this.consume('symbol', ',');
    const value = this.parseExpr();
    this.consume('symbol', ')');
    this.consume('symbol', ';');
    return { type: 'StoreAction', key, value };
  }

  parseForgetAction() {
    this.consume('keyword', 'forget');
    this.consume('symbol', '(');
    const key = this.consume('text').value;
    this.consume('symbol', ',');
    this.consume('keyword', 'reason');
    this.consume('symbol', ':');
    const reason = this.consume('text').value;
    this.consume('symbol', ')');
    this.consume('symbol', ';');
    return { type: 'ForgetAction', key, reason };
  }

  parseHttpAction() {
    this.consume('keyword', 'http');
    this.consume('keyword', 'get');
    const url = this.consume('text').value;
    this.consume('keyword', 'returns');
    const type = this.parseType();
    this.consume('symbol', ';');
    return { type: 'HttpAction', url, type };
  }

  parseSocketAction() {
    this.consume('keyword', 'socket');
    this.consume('keyword', 'connect');
    const url = this.consume('text').value;
    this.consume('keyword', 'on_message');
    this.consume('symbol', '{');
    const actions = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        actions.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'SocketAction', url, actions, onError };
  }

  parseSubscribeAction() {
    this.consume('keyword', 'subscribe');
    const topic = this.consume('text').value;
    this.consume('keyword', 'on_event');
    this.consume('symbol', '{');
    const actions = [];
    let onError = null;
    while (this.peek().value !== '}') {
      if (this.peek().value === 'on_error') {
        onError = this.parseOnError();
      } else {
        actions.push(this.parseAction());
      }
    }
    this.consume('symbol', '}');
    return { type: 'SubscribeAction', topic, actions, onError };
  }

  parseAuditAction() {
    this.consume('keyword', 'audit');
    this.consume('keyword', 'get_audit');
    this.consume('symbol', '(');
    const audit = this.consume('text').value;
    this.consume('symbol', ')');
    this.consume('symbol', ';');
    return { type: 'AuditAction', audit };
  }

  parseCryptoAction() {
    const action = this.consume('keyword').value;
    if (action === 'hash') {
      this.consume('keyword', 'set');
      const name = this.consume('identifier').value;
      this.consume('symbol', '=');
      this.consume('keyword', 'hash');
      this.consume('symbol', '(');
      const algo = this.consume('text').value;
      this.consume('symbol', ',');
      const value = this.parseExpr();
      this.consume('symbol', ')');
      this.consume('symbol', ';');
      return { type: 'HashAction', name, algo, value };
    }
    if (action === 'verify') {
      this.consume('keyword', 'signature');
      this.consume('keyword', 'with Hebrew
        this.consume('keyword', 'with');
        const expr = this.parseExpr();
        this.consume('keyword', 'returns');
        this.consume('keyword', 'bool');
        this.consume('symbol', ';');
        return { type: 'VerifyAction', expr };
      }
      if (action === 'zk_proof') {
        this.consume('keyword', 'check');
        this.consume('keyword', 'zk_proof');
        this.consume('symbol', '(');
        const proof = this.consume('text').value;
        this.consume('symbol', ')');
        this.consume('keyword', 'for');
        this.consume('keyword', 'job');
        const name = this.consume('identifier').value;
        this.consume('keyword', 'returns');
        this.consume('keyword', 'bool');
        this.consume('symbol', ';');
        return { type: 'ZkProofAction', proof, name };
      }
      if (action === 'keygen') {
        this.consume('keyword', 'set');
        const name = this.consume('identifier').value;
        this.consume('symbol', '=');
        this.consume('keyword', 'keygen');
        const algo = this.consume('text').value;
        this.consume('keyword', 'returns');
        this.consume('keyword', 'text');
        this.consume('symbol', ';');
        return { type: 'KeygenAction', name, algo };
      }
      if (action === 'multisig') {
        this.consume('keyword', 'check');
        this.consume('keyword', 'multisig');
        this.consume('symbol', '[');
        const signatures = [];
        while (this.peek().value !== ']') {
          signatures.push(this.consume('text').value);
          if (this.peek().value === ',') {
            this.consume('symbol', ',');
          }
        }
        this.consume('symbol', ']');
        this.consume('keyword', 'threshold');
        const threshold = this.consume('number').value;
        this.consume('keyword', 'for');
        this.consume('keyword', 'job');
        const name = this.consume('identifier').value;
        this.consume('keyword', 'returns');
        this.consume('keyword', 'bool');
        this.consume('symbol', ';');
        return { type: 'MultisigAction', signatures, threshold: parseInt(threshold), name };
      }
      throw new Error(`Unexpected crypto action ${action} at ${this.peek().line}:${this.peek().column}`);
    }
    parseWaitAction() {
      this.consume('keyword', 'wait');
      const expr = this.parseExpr();
      this.consume('symbol', ';');
      return { type: 'WaitAction', expr };
    }
  
    parseOnError() {
      this.consume('keyword', 'on_error');
      let errorName = null;
      if (this.peek().value === '(') {
        this.consume('symbol', '(');
        errorName = this.consume('identifier').value;
        this.consume('symbol', ':');
        this.consume('keyword', 'error');
        this.consume('identifier');
        this.consume('symbol', ')');
      }
      this.consume('symbol', '{');
      const body = [];
      while (this.peek().value !== '}') {
        body.push(this.parseAction());
      }
      this.consume('symbol', '}');
      return { type: 'OnError', errorName, body };
    }
  }
  
  module.exports = Parser;

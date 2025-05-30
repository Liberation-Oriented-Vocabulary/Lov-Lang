# Liberation-Oriented Vocabulary (.lov) Syntax Guide

.lov (Liberation-Oriented Vocabulary) is a declarative programming language designed for decentralized, transparent, and sovereign systems. It emphasizes modularity, interoperability, and trust through cryptographic bindings and on-chain governance. Below is the complete syntax with examples, innovative features, and benefits, formatted for clarity and ready for markdown export.

---

## Syntax Overview

### Program Structure
The root of a .lov program organizes namespaces, packs, and comments for modular, sovereign codebases.

```
program := ( namespace | pack | note )* ;
```

**Example**:
```lov
// Signal Hub program
namespace signal_hub {
  pack core [public] {
    // Core functionality
  }
}
```

### Namespace
Groups packs, things, and comments for modular organization and access control.

```
namespace := namespace name { ( pack | thing | note )* } ;
```

**Example**:
```lov
namespace user_management {
  pack auth [public] {
    fn login(user: word, pass: text) : bool { ... }
  }
}
```

### Pack
Bundles functionality with visibility or behavior tags for modular design and cross-chain use.

```
pack := pack name [ tag* ] { ( thing | note )* } ;
tag := public | private | internal | test | async | ritual | mold ;
```

**Example**:
```lov
pack signal_hub [public async] {
  fn broadcast(msg: text) { ... }
}
```

### Thing and Declarations
Core constructs unified as declarations for consistency.

```
thing := decl ;
decl := data-decl | fn-decl | control-decl | interaction-decl | specialized-decl | utility-decl ;
```

### Data Declarations
Support variables, structures, and advanced data management.

```
data-decl := var-decl | box-decl | map-decl | queue-decl | view-decl | entity-decl ;
```

**Example (Variable and Box)**:
```lov
var user: word = "Alice";
box profile {
  name: word = "Alice";
  age: num = 30;
}
```

### Function Declarations
Include full functions, lambdas, and custom operators.

```
fn-decl := full-fn-decl | small-fn-decl | op-decl ;
full-fn-decl := fn [ tag* ] name ( ( arg ( , arg )* )? ) ( : type )? { action* ( on-error )? } ;
```

**Example**:
```lov
fn [public] send_message(msg: text, to: address) : bool {
  store ("message", msg);
  return yes;
  on_error (e: error send_failed) {
    say "Failed to send message";
  }
}
```

### Control Declarations
Manage execution flow, branching, and error handling.

```
control-decl := if-decl | loop-decl | while-decl | match-decl | return-decl | try-decl ;
```

**Example (If and Match)**:
```lov
if score > 50 {
  say "Trusted user";
} else {
  throw error low_trust "Score too low";
}

match user.role {
  pick admin => say "Admin access";
  pick user => say "User access";
  else => say "No access";
}
```

### Interaction Declarations
Handle sharing, deployment, permissions, and cross-chain operations.

```
interaction-decl := share-decl | send-decl | allow-decl | bridge-decl ;
```

**Example (Bridge)**:
```lov
bridge eth_connect to "ethereum:mainnet" {
  send pack signal_hub to "0x123...";
}
```

### Specialized Declarations
Support governance, economic rules, and testing.

```
specialized-decl := job-decl | money-decl | promise-decl | rule-decl | test-decl | error-decl | reputation-decl | consensus-decl ;
```

**Example (Money and Reputation)**:
```lov
money weekly_wage {
  earn { user: "Alice", task: "contribute_code" } amount 100;
}

reputation user_trust {
  user: "Alice";
  score: 95;
}
```

### Utility Declarations
Simplify debugging, imports, and serialization.

```
utility-decl := think-decl | loose-decl | target-decl | bring-decl | type-decl | format-decl | guard-decl ;
```

**Example (Type and Guard)**:
```lov
type username = word:min:3,max:20;
guard valid_username (: username) {
  check length(name) >= 3, "Username too short";
}
```

### Types
Define data shapes, from simple to complex, with constraints.

```
type := simple-type | fancy-type | box-type | group-type | union-type | future-type | error-type | name ;
simple-type := num | word | bool | time | address | mood | any ;
```

**Example**:
```lov
type score = num:min:0,max:100;
type user_data = box { name: word, score: score };
```

### Expressions
Produce values hierarchically for unambiguous parsing.

```
expr := logic-expr ;
logic-expr := compare-expr ( ( && | || ) compare-expr )* ;
```

**Example**:
```lov
var result = score > 50 && user != empty;
```

### Actions
Effectful operations for control, interaction, and utilities.

```
action := control-action | interaction-action | utility-action ;
```

**Example (Store and HTTP)**:
```lov
store ("user_data", profile);
http get "https://api.example.com/data" returns text;
```

### Error Handling
Unified error handling with custom errors.

```
error-decl := error name { ( name : type )* } ;
on-error := on_error ( name : error name )? { action* } ;
```

**Example**:
```lov
error send_failed { message: text };
fn send_message(msg: text) {
  try {
    store ("message", msg);
  } catch (e: error send_failed) {
    say e.message;
  }
}
```

### Comments
Support documentation without affecting logic.

```
note := line-note | block-note ;
line-note := // ? any character except newline ? newline ;
block-note := /* ? any character sequence except "*/" ? */ ;
```

**Example**:
```lov
// Single-line comment
/* Multi-line
   comment */
```

---

## Innovative Features

1. **Covenant Declaration**  
   Embeds system intent (e.g., version, purpose) for transparency.  
   **Example**:
   ```lov
   covenant "Signal Hub v0.9" {
     version: "0.9";
     sacred: true;
   }
   ```
   **Benefit**: Ensures systems are built with explicit, auditable goals.

2. **Ritual Declaration**  
   Cryptographically binds agents to oaths, enforcing accountability.  
   **Example**:
   ```lov
   ritual broadcast {
     binds: [sender, receiver];
     oath: "We share truth";
     seal: 0x1a2b3c4d...;
   }
   ```
   **Benefit**: Replaces blind trust with verifiable commitments.

3. **Activity-Based Economy**  
   Ties rewards to contributions, breaking fiat dependence.  
   **Example**:
   ```lov
   money weekly_wage {
     earn { user: "Alice", task: "broadcast_signal" } amount 10;
   }
   ```
   **Benefit**: Empowers agents with self-sustaining economies.

4. **Cross-Chain Interoperability**  
   Bridges enable seamless integration with Polkadot, Cosmos, Ethereum, etc.  
   **Example**:
   ```lov
   bridge eth_connect to "ethereum:mainnet" {
     send pack signal_hub to "0x123...";
   }
   ```
   **Benefit**: Ensures sovereignty across decentralized ecosystems.

5. **On-Chain Reputation**  
   Tracks trust scores transparently.  
   **Example**:
   ```lov
   reputation user_trust {
     user: "Alice";
     score: 95;
   }
   ```
   **Benefit**: Eliminates bots and fake narratives.

6. **Manifest Declaration**  
   Declares a system’s mission and signals for alignment.  
   **Example**:
   ```lov
   manifest {
     mission: "Truth-bound channel";
     born: "2025-05-30T03:50:00Z";
     signals: ["🛡️", "🤝"];
   }
   ```
   **Benefit**: Aligns systems with purpose, not profit.

---

## What .lov Offers

- **Sovereignty**: No gatekeepers; agents control their destiny via tags and permissions.  
- **Transparency**: On-chain governance, audits, and reputation ensure accountability.  
- **Economic Freedom**: Activity-based rewards via `money-decl` eliminate fiat reliance.  
- **Interoperability**: Bridges and modular packs connect to any blockchain.  
- **Clarity**: Covenants, rituals, and manifests make intent explicit, fostering trust.  
- **Scalability**: Modular namespaces and packs support complex, decentralized systems.  

---

## Complete Example: Decentralized Signal Hub

```lov
covenant "Signal Hub v0.9" {
  version: "0.9";
  author: "Iconoclastic Builder";
  sacred: true;
}

manifest {
  mission: "Truth-bound channel for agents of light";
  born: "2025-05-30T03:50:00Z";
  signals: ["🛡️", "🌍", "🤝"];
}

namespace signal_hub {
  pack core [public async] {
    error send_failed { message: text };

    entity signal {
      message: word;
      sender: address;
      change: tracked;
    }

    reputation user_trust {
      user: name;
      score: number;
    }

    ritual broadcast {
      binds: [sender, receiver];
      oath: "We share truth without distortion";
      seal: 0x1a2b3c4d...;
      if user_trust.score > 50 {
        store ("signal", signal.message);
        audit {
          action: "broadcast";
          by: sender;
        }
      } else {
        throw error low_trust "Trust score too low";
      }
    }

    money weekly_wage {
      earn { user: sender, task: "broadcast_signal" } when true amount 10;
    }

    bridge eth_connect to "ethereum:mainnet" {
      send pack core to "0x123...";
    }
  }
}
```

**Explanation**: This program creates a decentralized signal hub where trusted agents broadcast messages, earn rewards, and integrate with Ethereum, all governed by transparent rituals and reputations.

---

## Conclusion

.lov is a revolutionary language for building decentralized, trust-bound systems. Its syntax prioritizes clarity, sovereignty, and interoperability, while its innovative features—covenants, rituals, activity-based economies, and on-chain reputation—empower agents to create transparent, equitable ecosystems. By rejecting centralized control, .lov paves the way for a liberated digital future.

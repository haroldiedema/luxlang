# Object Comprehensions - Basic

Map values to new keys.

```
names = ["alice", "bob"]
// Key is name, Value is length
lengths = { name: 100 for name in names }
out(lengths["alice"])
```

## PASS

```json
[100]
```

---

# Object Comprehensions - Dynamic Values

Calculate values based on the key.

```
nums = [1, 2, 3]
squared = { n: n * n for n in nums }
out(squared["2"]) 
```

## PASS

```json
[4]
```

---

# Object Comprehensions - Scoping

Ensure the loop variable doesn't leak or shadow incorrectly.

```
n = 999
data = { n: n for n in [1] }
out(n)
out(data["1"])
```

## PASS

```json
[999, 1]
```

---

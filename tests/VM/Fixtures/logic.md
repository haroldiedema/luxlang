# Boolean Comparisons

The VM should correctly evaluate comparison operators (`>`, `<`, `==`, etc.) and return boolean results.

```
out(10 > 5)
out(10 < 5)
out(5 >= 5)
out(10 <= 2)
out(10 == 10)
out(10 != 5)
```

## PASS

- true
- false
- true
- false
- true
- true

---

# Unary Boolean NOT

The VM should handle NOT (`!`) operators.

```
out(!true)
out(!false)
```

## PASS

- false
- true

---

# Boolean Keywords

The VM should support the keyword aliases `and` and `or` identically to their symbol counterparts.

```
out(true and true)
out(true and false)
out(false or true)
out(false or false)
```

## PASS

- true
- false
- true
- false

---

# Complex Compound Expressions

The VM should correctly handle precedence between arithmetic, comparison, and logical operators.
(Arithmetic > Comparison > Logic).

```
x = 10
y = 20
out(x < y and y > 15)
out(x == 10 or y == 100)
out(!(x > y))
```

## PASS

- true
- true
- true

---

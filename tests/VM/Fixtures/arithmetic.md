# Basic additions

The VM should be able to handle arithmetic operations. This test focuses
on basic additions.

```
out(10 + 20)
```

## PASS

- 30

---

# Basic subtractions

The VM should be able to handle arithmetic operations. This test focuses
on basic subtractions.

```
out(30 - 20)
out(2.5 - 1.25)
```

## PASS

- 10
- 1.25

---

# Basic multiplications

The VM should be able to handle arithmetic operations. This test focuses
on basic multiplications.

```
out(5 * 6)
out(2.5 * 4)
```

## PASS

- 30
- 10

---

# Basic divisions

The VM should be able to handle arithmetic operations. This test focuses
on basic divisions.

```
out(20 / 4)
out(7.5 / 2.5)
```

## PASS

- 5
- 3

---

# Modulo

The VM should correctly calculate the remainder of division operations using the `%` operator.

```vm
out(10 % 3)
out(20 % 5)
out(5 % 2)
```

## PASS

- 1
- 0
- 1

---

# Basic Exponents

The VM should be able to handle exponentiation using the `^` operator.

```vm
out(2 ^ 3)
out(10 ^ 2)
out(5 ^ 0)
out(4 ^ 0.5)

```

## PASS

- 8
- 100
- 1
- 2

---

# Operator Precedence

The VM should respect standard order of operations (PEMDAS/BODMAS), ensuring multiplication and division are performed before addition and subtraction.

```
out(10 + 5 * 2)
out(50 - 10 / 2)
out(2 + 3 * 4 - 10)
out(100 - 20 * 2 + 5)
```

## PASS

- 20
- 45
- 4
- 65

---

# Exponent Precedence

The VM should evaluate exponents *before* multiplication and division.

```vm
out(2 * 10 ^ 2)
out(5 + 4 ^ 2)
out(4 ^ 3 / 2)

```

## PASS

- 200
- 21
- 32

---

# Right Associativity

The VM should evaluate chained exponents from Right-to-Left.
If this fails (returns 64), your parser is parsing Left-to-Right.

```vm
out(2 ^ 3 ^ 2)

```

## PASS

- 512

---

# Negative Exponents

The VM should handle negative exponents (resulting in fractions).

```vm
out(2 ^ -1)
out(10 ^ -2)

```

## PASS

- 0.5
- 0.01

---

# Parentheses Grouping

The VM should prioritize expressions inside parentheses over standard operator precedence.

```
out((10 + 5) * 2)
out((50 - 10) / 2)
out(4 * (5 + 10) / 2)
out((10 + 2) * (10 - 2))
```

## PASS

- 30
- 20
- 30
- 96

---

# Left Associativity

The VM should evaluate operators of the same precedence (like subtraction and division) from left to right.

```
out(100 - 50 - 25)
out(20 / 2 / 5)
out(10 - 5 + 2)
```

## PASS

- 25
- 2
- 7

---

# Complex Mixed Types

The VM should handle complex chains involving both integers and floating point numbers, maintaining precision.

```
out(10.5 + 2.5 * 4 - 5)
out((10 + 2.5) * 2)
out(100 / 4.0 + 5.5)
```

## PASS

-15.5
-25
-30.5

---

# Negative Results

The VM should correctly handle calculations that result in negative numbers.

```
out(10 - 20)
out(5 * (2 - 4))
out(100 - 50 * 3)
```

## PASS

- -10
- -10
- -50

---

# Zero Handling

The VM should correctly handle arithmetic operations involving zero, including
multiplication and zero as a numerator.

```
out(10 * 0)
out(0 * 5)
out(0 / 10)
out(10 + 0)
out(10 - 0)
out(0 - 10)
```

## PASS

- 0
- 0
- 0
- 10
- 10
- -10

---

# Identity Operations

The VM should not alter values when applying identity operations (multiplying/dividing by 1).

```
out(55 * 1)
out(1 * 55)
out(55 / 1)
out(12.5 * 1)
```

## PASS

- 55
- 55
- 55
- 12.5

---

# Deep Nesting

The VM should handle deeply nested parentheses without stack overflow or
parsing errors.

```
out((((1 + 1) + 1) + 1))
out(2 * (2 * (2 * (2 * 2))))
out((10 + (5 * (2 + 2))) / 2)
```

## PASS

- 4
- 32
- 15

---

# Precision and Small Numbers

The VM should handle operations resulting in small fractional numbers
without losing significant precision (assuming standard float behavior).

```
out(0.5 + 0.25)
out(1.0 / 2.0)
out(0.1 * 10)
out(10 * 0.1)
```

## PASS

- 0.75
- 0.5
- 1
- 1

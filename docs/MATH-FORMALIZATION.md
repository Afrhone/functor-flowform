# Flowforms mathematical formalization

This bundle treats a symbol as a real-valued expression engine: a glyph is not only a drawing, but a finite-dimensional trajectory whose control graph stores root, graphème, phonème, rhythm, and axiom constraints.

## 1. Root graph, graphème, phonème

Let the root skeleton be a directed attributed graph:

```math
G_r=(V,E,	au),\qquad \tau:V\cup E\to\{root,bridge,form,rhythm,nature,momentum,axiom\}.
```

A graphème is the visible curve program:

```math
\gamma_\theta:[0,1]\to\mathbb R^2,
```

built from cubic Bézier strokes. A phonème is a latent sound/gesture embedding:

```math
p\in\mathbb R^d.
```

The finite state vector is all control points:

```math
q=(P_0,P_1,\ldots,P_n)\in\mathbb R^{2(n+1)}.
```

## 2. Real glyph function

The drawable real function is:

```math
F_\theta(s;r,p,a)=A_\theta\left(\sum_i B_i(s)P_i + \Phi_{root}(s,r)+\Phi_{rhythm}(s)+\Phi_{axiom}(s,a)\right),\quad s\in[0,1].
```

Where:

- `B_i(s)` are Bézier basis functions.
- `r` is root/etymon state.
- `p` is phonème embedding.
- `a` is axiom/family embedding.
- `Aθ` is an affine/swirling modulation field.

The derivation operator from root to visible graphème is:

```math
D_{root}F = J_F(q)\dot q + \partial_rF\,\dot r + \partial_pF\,\dot p.
```

## 3. Energy and Lagrangian

Use the finite-dimensional Lagrangian over control points:

```math
L(q,\dot q,t)=\frac12\dot q^T M\dot q - V(q,t;r,p,a)+\mathcal A(q,t)\cdot\dot q.
```

The potential is decomposed by the seven design families:

```math
V=V_{root}+V_{bridge}+V_{form}+V_{rhythm}+V_{nature}+V_{momentum}+V_{axiom}+V_{smooth}+V_{phoneme}.
```

A practical version is:

```math
V_{smooth}=\alpha\int_0^1 \lVert \gamma''(s)\rVert^2ds,
```

```math
V_{form}=\beta\int_0^1 (\lVert\gamma'(s)\rVert-v_0)^2ds,
```

```math
V_{rhythm}=\rho\int_0^1 \sin^2(2\pi\omega s+\phi(t))ds,
```

```math
V_{phoneme}=\psi\lVert E(\gamma)-p\rVert^2.
```

The vector potential `A(q,t)` encodes momentum, curl, and swirl: it lets symbols feel kinetic rather than static.

## 4. Generic ODE

Euler-Lagrange gives:

```math
\frac{d}{dt}\frac{\partial L}{\partial\dot q}-\frac{\partial L}{\partial q}=Q_{nc}.
```

With damping and forcing:

```math
M\ddot q+C\dot q+\nabla_qV(q,t)-B(q,t)\dot q=u(t).
```

As a first-order system:

```math
\frac{d}{dt}
\begin{bmatrix}q\\v\end{bmatrix}
=
\begin{bmatrix}
v\\
M^{-1}(-Cv-\nabla V(q,t)+B(q,t)v+u(t))
\end{bmatrix}.
```

The browser playground uses a reduced real-time field:

```math
\ddot x + \eta\dot x + \nabla V_\theta(x,s,t)=0,
```

with swirl, rhythm, axis pull, branching, and curvature sliders mapped into `Vθ`.

## 5. Derivation pipeline

```text
root mark → root graph → control graph q → real curve Fθ(s) → glyph SVG → font glyph → animated symbol
```

The assertive agent checks continuity, curvature spikes, contour count, family validity, and deploy safety before cluster mutations.

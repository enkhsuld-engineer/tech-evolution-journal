## Overview and Scope

This case study documents a three-phase inverter model with an inner $dq$ current-control loop. The controller combines PI regulation, cross-coupling compensation, voltage feedforward, and space-vector PWM implemented through common-mode offset injection.

The aim is to connect the electrical model to the controller implementation: how the rotating-frame equations determine the compensation terms, how the voltage command becomes a duty ratio, and how the resulting currents track their references.

> **Validation scope:** the figures and response descriptions below document the simulation model. They do not establish hardware performance, grid-connection compliance, or a measured power rating. The approximately 1 ms response is a previously reported waveform observation, not a newly measured result.

The implemented scope is the inner current loop. Application-specific outer loops, hardware deployment, and dead-time compensation remain future work.

## System Parameters

| Parameter | Value |
| --- | --- |
| DC-link voltage, $V_{\mathrm{dc}}$ | 800 V |
| Switching frequency, $f_{\mathrm{sw}}$ | 10 kHz |
| Sampling frequency, $f_{\mathrm{s}}$ | 20 kHz |
| Target current-loop bandwidth, $f_{\mathrm{c}}$ | Approximately 1 kHz |
| AC connection | Three-phase grid through per-phase series R-L components |
| Per-phase inductance, $L$ | 0.5 mH |
| Per-phase resistance, $R$ | $0.1\,\Omega$ |
| Current-reference tests | Ramp and step on $i_d^\star$ |
| Quadrature-current target | $i_q^\star=0$ |

## Power Stage and Control Architecture

### Power stage

The modeled power stage contains a six-switch inverter bridge, an 800 V DC link, per-phase series R-L coupling to the three-phase grid, and phase-current and voltage measurements. The coupling inductance controls the rate of change of the injected current, while the series resistance contributes the resistive voltage drop.

![Inverter bridge, DC link, grid connection, and measurement paths](content/projects/inv-stack/Plant.png)

*Figure 1. Power-stage model and its measurement paths.*

### Signal flow

1. Acquire phase-current measurements.
2. Transform the phase quantities into the synchronous $dq$ frame.
3. Calculate the current-reference errors.
4. Apply PI control, decoupling, and grid-voltage feedforward.
5. Transform the commanded voltage back into phase quantities.
6. Apply common-mode offset injection and duty-ratio scaling.
7. Generate the PWM commands.

![Current-controller signal flow and coordinate transformations](content/projects/inv-stack/control.png)

*Figure 2. Control architecture connecting measurements, regulation, and modulation.*

### Grid synchronization

The transformation angle is $\theta$, with electrical angular frequency $\omega=d\theta/dt$. The synchronous-reference-frame PLL aligns the rotating frame with the grid voltage by regulating the transformed grid-voltage component $v_{g,q}$ toward zero.

The current controller regulates the current flowing from the inverter through the series R-L components into the grid. Grid-voltage feedforward supplies the external-voltage term in the inverter voltage command.

![PLL signal path](content/projects/inv-stack/PLL.png)

*Figure 3. PLL path for synchronizing the rotating frame with the three-phase grid.*

## Mathematical Model

### Coordinate convention

The equations use an amplitude-invariant Park transform with a negative-sine $q$ row. The zero-sequence component is omitted, so the inverse transform below assumes a balanced three-wire system.

For any phase quantity $x$:

$$
\begin{bmatrix}
x_d\\
x_q
\end{bmatrix}
=
\frac{2}{3}
\begin{bmatrix}
\cos\theta & \cos(\theta-\frac{2\pi}{3}) & \cos(\theta+\frac{2\pi}{3})\\
-\sin\theta & -\sin(\theta-\frac{2\pi}{3}) & -\sin(\theta+\frac{2\pi}{3})
\end{bmatrix}
\begin{bmatrix}
x_a\\
x_b\\
x_c
\end{bmatrix}.
$$

The corresponding inverse is:

$$
\begin{aligned}
x_a &= x_d\cos\theta-x_q\sin\theta,\\
x_b &= x_d\cos\left(\theta-\frac{2\pi}{3}\right)
       -x_q\sin\left(\theta-\frac{2\pi}{3}\right),\\
x_c &= x_d\cos\left(\theta+\frac{2\pi}{3}\right)
       -x_q\sin\left(\theta+\frac{2\pi}{3}\right).
\end{aligned}
$$

Current measurement and voltage-command generation use the same transformation convention. The signs of the cross-coupling terms follow the negative-sine $q$ row.

### Rotating-frame plant

Let $v_d,v_q$ be inverter-side voltages and $v_{g,d},v_{g,q}$ be grid-side voltages. With positive current defined from the inverter toward the grid, the per-phase series R-L coupling gives:

$$
\begin{aligned}
v_d-v_{g,d} &= R i_d + L\frac{d i_d}{dt}-\omega L i_q,\\
v_q-v_{g,q} &= R i_q + L\frac{d i_q}{dt}+\omega L i_d.
\end{aligned}
$$

| Symbol | Meaning | Unit |
| --- | --- | --- |
| $i_d,i_q$ | Current components in the rotating frame | A |
| $v_d,v_q$ | Inverter voltage components | V |
| $v_{g,d},v_{g,q}$ | Grid-voltage components | V |
| $R$ | Per-phase series resistance | $\Omega$ |
| $L$ | Per-phase series inductance | H |
| $\omega$ | Electrical angular frequency | rad/s |
| $\theta$ | Electrical angle | rad |

Here, $R=0.1\,\Omega$ and $L=0.5\times10^{-3}\,\mathrm{H}$. The grid-voltage terms remain part of the plant model. The terms $-\omega L i_q$ and $+\omega L i_d$ arise from the rotating coordinate frame and couple the two axes.

## Current Controller Design

### PI regulation and decoupling

Define the current errors:

$$
\varepsilon_d=i_d^\star-i_d,\qquad
\varepsilon_q=i_q^\star-i_q.
$$

Using the convention above, the commanded inverter voltages are:

$$
\begin{aligned}
v_d^\star &=
K_p\varepsilon_d+K_i\int\varepsilon_d\,dt
-\omega L i_q+v_{g,d}^{\mathrm{ff}},\\
v_q^\star &=
K_p\varepsilon_q+K_i\int\varepsilon_q\,dt
+\omega L i_d+v_{g,q}^{\mathrm{ff}}.
\end{aligned}
$$

Here, the superscript $\star$ denotes a command and $\mathrm{ff}$ denotes grid-voltage feedforward.

With accurate plant parameters, matching feedforward, and no saturation, substituting these commands into the plant equations removes the nominal axis coupling. Parameter errors, measurement filtering, and angle errors leave residual coupling.

### Initial gain selection

After ideal decoupling, each axis is approximately an RL plant:

$$
G_i(s)=\frac{1}{Ls+R},
\qquad
C_i(s)=K_p+\frac{K_i}{s}.
$$

A pole-zero-cancellation starting point is:

$$
\omega_c=2\pi f_c,\qquad
K_p=L\omega_c,\qquad
K_i=R\omega_c.
$$

This places the PI zero at $-R/L$ and gives the idealized open-loop form $\omega_c/s$. It is a starting estimate, not a final discrete-time tuning result.

For $L=0.5\,\mathrm{mH}$, $R=0.1\,\Omega$, and a target $f_c=1\,\mathrm{kHz}$, the continuous-time design estimates are:

$$
\begin{aligned}
\omega_c &\approx 6283.19\,\mathrm{rad/s},\\
K_p &\approx 3.1416\,\mathrm{V/A},\\
K_i &\approx 628.32\,\frac{\mathrm{V}}{\mathrm{A}\cdot\mathrm{s}}.
\end{aligned}
$$

### Discrete-time constraints

The target bandwidth is approximately 1 kHz, with 10 kHz switching and 20 kHz sampling. The discrete-time response also depends on:

- PWM update timing and effective modulation delay.
- Sampling, zero-order hold, and computation delay.
- Current-sensor filtering and noise.
- Available voltage headroom and command limiting.
- Integrator anti-windup when commands saturate.

The target bandwidth is a frequency-domain design quantity; rise time and settling time describe the observed time-domain response.

## SVPWM and PWM Generation

### Normalization and offset injection

Transform $v_d^\star,v_q^\star$ into phase-voltage commands and normalize them using the measured or modeled DC-link voltage:

$$
m_a=\frac{v_a^\star}{V_{\mathrm{dc}}},\qquad
m_b=\frac{v_b^\star}{V_{\mathrm{dc}}},\qquad
m_c=\frac{v_c^\star}{V_{\mathrm{dc}}}.
$$

Calculate a common-mode offset:

$$
m_0=-\frac{1}{2}
\left[
\max(m_a,m_b,m_c)+\min(m_a,m_b,m_c)
\right].
$$

Apply it equally to the three phases:

$$
\widetilde m_a=m_a+m_0,\qquad
\widetilde m_b=m_b+m_0,\qquad
\widetilde m_c=m_c+m_0.
$$

For a PWM carrier normalized to $[0,1]$, the duty commands are:

$$
d_a=\frac{1}{2}+\widetilde m_a,\qquad
d_b=\frac{1}{2}+\widetilde m_b,\qquad
d_c=\frac{1}{2}+\widetilde m_c.
$$

These duty equations use a $[0,1]$ carrier convention. A centered carrier or a carrier spanning $[-1,1]$ uses a different offset or scale.

![Voltage-reference normalization and modulation path](content/projects/inv-stack/Mod.png)

*Figure 4. Voltage-command normalization and modulation path.*

![Common-mode offset calculation](content/projects/inv-stack/mod2.png)

*Figure 5. Maximum/minimum selection used to calculate the common-mode offset.*

### Linear modulation range

The shared offset does not alter the commanded line-to-line voltage:

$$
\widetilde m_a-\widetilde m_b=m_a-m_b.
$$

Under this normalization, linear operation requires:

$$
\max(m_a,m_b,m_c)-\min(m_a,m_b,m_c)\leq 1.
$$

Outside this range, duty limiting introduces distortion and the current controller may saturate. Offset injection improves DC-link utilization relative to pure sinusoidal PWM, but does not remove the voltage limit.

![Phase modulation references after offset injection](content/projects/inv-stack/SVPWM.png)

*Figure 6. The non-sinusoidal phase-reference shape produced by common-mode injection.*

### PWM generation

The PWM stage compares each duty command with a triangular carrier. The model represents this switching-command generation through a PWM block.

![PWM generation block](content/projects/inv-stack/PWM.png)

*Figure 7. PWM generation in the documented model.*

## Simulation Results

### Test sequence

| Test | Reference input | Timing |
| --- | --- | --- |
| Ramp | $i_d^\star: 0\rightarrow20\,\mathrm{A}$ | Begins at 20 ms, lasts 5 ms |
| Step | $i_d^\star: 20\rightarrow40\,\mathrm{A}$ | Applied at 40 ms |
| Quadrature axis | $i_q^\star=0$ | Maintained during the tracking test |

### Phase currents

![Simulated three-phase current waveforms](content/projects/inv-stack/Iabc.png)

*Figure 8. Simulated phase currents with approximately 120-degree separation.*

### Current tracking in the rotating frame

![Direct- and quadrature-axis current responses](content/projects/inv-stack/Idq.png)

*Figure 9. Current tracking for the ramp and step reference sequence.*

![Expanded direct-axis current response](content/projects/inv-stack/Idzoom.png)

*Figure 10. Expanded $d$-axis response, with an approximately 1 ms reported response time.*

The recorded observations are stable tracking, small apparent overshoot, and $i_q$ remaining near zero. Exact overshoot, steady-state error, and settling time have not been extracted in this document.

### Output voltage

![Simulated three-phase output-voltage waveforms](content/projects/inv-stack/Vabc.png)

*Figure 11. Simulated three-phase output-voltage traces.*

The traces support a qualitative discussion of phase sequence and waveform behavior. No numerical THD or efficiency result is claimed here.

## Scope and Limitations

- The presented results cover simulated grid-current tracking, not hardware validation.
- Quantified stability margins, THD, and efficiency are outside the presented results.
- Parameter mismatch, digital delay, sensor noise, and voltage limits affect current tracking.
- Application-specific outer loops, hardware dead-time compensation, and TI C2000 deployment remain outside the implemented scope.

The current-control architecture connects the grid-coupled $dq$ plant model, decoupling terms, PI design, and modulation scaling.

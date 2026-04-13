# 3-Phase DC-AC Inverter with dq Current Control

## System Overview

This project implements a 3-phase DC–AC inverter using dq-axis current control with feedforward and cross-coupling compensation.

The system converts an 800 V DC source into controlled AC output using a closed-loop structure.

Control objectives:

- fast current response (~1 ms)
- stable tracking under dynamic references
- decoupled Id / Iq control
- efficient DC bus utilization (SVPWM)

---

## Power Stage

![Power Stage](content/projects/inv-stack/Plant.png)

System components:

- 3-phase inverter bridge (6 switches)
- DC link (800 V)
- RL load
- current sensing (Ia, Ib, Ic)
- voltage sensing (Va, Vb, Vc)

---

## Control Architecture

![Control Diagram](content/projects/inv-stack/control.png)

Control flow:

1. Measure phase currents
2. abc → dq transformation (PLL aligned)
3. Compute current error
4. PI + decoupling + feedforward
5. dq → abc transformation
6. SVPWM modulation
7. PWM generation

---

## dq Modeling (Physical Basis)

The inductor dynamics in dq frame:

vd = L(dId/dt) + R·Id − ωL·Iq  
vq = L(dIq/dt) + R·Iq + ωL·Id  

Key point:

- −ωL·Iq and +ωL·Id create coupling between axes

Without compensation:

- Id and Iq cannot be controlled independently

---

## abc ↔ dq Transformation

### abc → dq

vd = (2/3)[va cosθ + vb cos(θ − 2π/3) + vc cos(θ + 2π/3)]  
vq = (2/3)[−va sinθ − vb sin(θ − 2π/3) − vc sin(θ + 2π/3)]

---

### dq → abc

va = vd cosθ − vq sinθ  
vb = vd cos(θ − 2π/3) − vq sin(θ − 2π/3)  
vc = vd cos(θ + 2π/3) − vq sin(θ + 2π/3)

---

## PLL (Phase Lock Loop)

![PLL](content/projects/inv-stack/PLL.png)

PLL aligns dq frame with grid voltage:

- Vq → PI → integrator → θ
- ensures synchronous rotating frame
- converts AC signals → DC quantities in dq

---

## Current Control (PI + Feedforward + Decoupling)

The controller is implemented as:

ud = Kp(Id_ref − Id) + Ki ∫(Id_ref − Id) dt − ωL·Iq + Vd_ff  
uq = Kp(Iq_ref − Iq) + Ki ∫(Iq_ref − Iq) dt + ωL·Id + Vq_ff  

Where:

- ω: electrical angular frequency (PLL output)
- L: inductance
- −ωL·Iq / +ωL·Id: cross-coupling compensation
- Vd_ff, Vq_ff: voltage feedforward terms

Effect:

- removes coupling between axes
- improves dynamic response
- allows independent control of Id and Iq

---

## Controller Design

Design parameters:

- switching frequency: 10 kHz  
- sampling frequency: 20 kHz  
- target bandwidth: ~1 kHz  

Approximate tuning:

Kp ≈ L · ωc  
Ki adjusted for zero steady-state error  

Bandwidth is limited by:

- PWM delay
- sampling delay (ZOH)
- computation delay

---

## Modulation Strategy (SVPWM via Offset Injection)

![Modulation](content/projects/inv-stack/Mod.png)
![Offset](content/projects/inv-stack/mod2.png)

Space vector PWM is implemented using offset injection.

Steps:

1. Generate phase references:
   Va_ref, Vb_ref, Vc_ref

2. Normalize:
   Va_norm = Va_ref / Vdc

3. Compute offset:

M_off = -0.5 × (max(Va_norm, Vb_norm, Vc_norm) + min(Va_norm, Vb_norm, Vc_norm))

4. Apply:

Va_mod = Va_norm + M_off  

This achieves:

- full DC bus utilization
- reduced harmonic distortion
- balanced switching

### SVPWM Modulation Waveform

![SVPWM Waveform](content/projects/inv-stack/SVPWM.png)

The phase modulation signals exhibit a characteristic flattened (non-sinusoidal) shape.

This results from offset injection, which shifts all three phases simultaneously to maximize DC bus utilization.

Unlike pure sinusoidal PWM, the waveform is intentionally distorted while maintaining correct line-to-line voltage.

---

## PWM Generation

![PWM](content/projects/inv-stack/PWM.png)

PWM implemented using:

- triangular carrier
- comparator

For clarity, represented as a PWM block.

---

## Current Response (abc)

![Phase Currents](content/projects/inv-stack/Iabc.png)

Observations:

- balanced 3-phase currents
- 120° phase shift
- stable sinusoidal waveform

---

## dq Current Tracking

![dq Currents](content/projects/inv-stack/Idq.png)

Test input:

- ramp: 0 → 20 A at 20 ms (duration: 5 ms)
- step: 20 → 40 A at 40 ms

Results:

- rise time ≈ 1 ms  
- minimal overshoot  
- stable tracking  
- Iq ≈ 0  
![Id Zoom](content/projects/inv-stack/Idzoom.png)
The fast response is achieved due to decoupled current dynamics.

---

## Output Voltage

![Output Voltage](content/projects/inv-stack/Vabc.png)

Results:

- clean sinusoidal output
- correct phase sequence
- stable amplitude

---

## Key Engineering Insights

- dq transformation converts AC system → DC control problem  
- cross-coupling terms originate from rotating reference frame  
- decoupling enables independent Id / Iq control  
- feedforward improves disturbance rejection  
- bandwidth limited by switching + delay effects  
- SVPWM improves DC bus utilization  

---

## Limitations

- delay (PWM + sampling) reduces phase margin  
- high bandwidth increases noise sensitivity 

---
## Design Scope and Extensibility

This implementation focuses on the inner current control loop.

The outer control loop is intentionally not included, as it depends on the application:

- Grid-connected inverter → DC bus voltage / power control  
- Motor drive → speed or torque control  
- Standalone inverter → output voltage control  

The current loop is designed to be modular and can be cascaded with any outer loop depending on system requirements.

---

## Possible Future Work

- integration with application-specific outer control loops (voltage, speed, power)
- robustness improvements for grid disturbances (PLL tuning, filtering)
- dead-time compensation for hardware implementation
- switching sequence optimization (sector-based SVPWM if required)
- deployment on TI C2000 platform

---

## Summary

A complete dq-controlled 3-phase inverter with feedforward and decoupling was implemented and validated.

Performance:

- ~1 ms current response  
- stable operation under dynamic inputs  
- efficient modulation using SVPWM  

The system demonstrates practical control design suitable for embedded implementation.
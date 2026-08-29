This technical note examines **PWM duty-cycle resolution in digital power control**, focusing on the difference between a controller’s requested duty command, the quantized value produced by a timer, and the pulse realized by the switching hardware.
It derives the ordinary duty resolution of edge-aligned and center-aligned PWM from the timer clock and switching frequency. It also explains effective bit resolution, duty quantization, voltage resolution, shadow-register updates, and the effect of small control corrections that are below one timer count.
The note then connects PWM quantization with proportional and integral control behavior, including residual error, count-boundary crossing, limit cycles, and anti-windup. Practical limits such as deadtime, gate-driver propagation delay, minimum pulse width, HIL input timing, and high-resolution PWM are also discussed. A worked example uses a 200 MHz timer, center-aligned PWM, and an 800 V DC input to show how switching frequency changes the achievable duty and voltage resolution.

📄 **Download full paper (PDF)**  
[Click here to view the English version](/tech-evolution-journal/documents/pwm/pwmres.pdf)

---

**Topic:** Power Electronics, Digital Control
**Keywords:** PWM, duty cycle, timer resolution, quantization, PI control, deadtime, minimum pulse width, HRPWM, HIL

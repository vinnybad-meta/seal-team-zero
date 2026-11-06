# Product Requirements Document — Seal Team Zero

## Product Overview

Seal Team Zero is a single-player, Call-of-Duty-style campaign FPS that
reenacts the May 2, 2011 Abbottabad night raid. The player is the stack
lead of a 4-operator SEAL element with war dog CAIRO, hitting a walled
compound at 01:00 on a moonless night: breach the gate, clear the guest
house and a 3-floor main house, neutralize the HVT ("GERONIMO"), collect
intel, demolish the crashed helicopter, and exfil.

This deployment hosts TWO independent builds of the same mission (Arm A
and Arm B, from a blind model comparison) behind one landing page so
players can try both. No login, no backend, no build step.

## Core experience

1. Land on the overview page, pick Arm A or Arm B.
2. Click canvas for pointer lock; WASD + mouse, click fire, right-mouse
   ADS, R reload, 1/2/3 weapons (HK416/MP7/P226), E interact/plant/intel,
   N night vision, F flashlight, G frag, Shift sprint.
3. Play O1–O9 in order with squad callouts and a HUD checklist.
4. Unarmed civilians must not be harmed (ROE fail); death fails the
   mission; restart resets.
5. Finish with the after-action report (time, shots, accuracy, grade).

## Tech

Static three.js 0.160.0 via pinned CDN import map, zero npm packages,
procedural WebAudio, all geometry and textures generated in code.
Any static file host serves it; `python3 -m http.server` locally.

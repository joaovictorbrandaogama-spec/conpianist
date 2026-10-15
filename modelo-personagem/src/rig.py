"""Pose skeleton of the character, measured on the reference image.

The reference is a front view of 735x1030 px.  One pixel is ``S`` metres and
image pixels map to model coordinates with :func:`px` (X to the viewer's
right, Z up, ground at y_px = 958).  Depth (Y, negative = towards the viewer)
is not visible in the picture and was chosen by hand.

Her right side is the viewer's left (-X): bare leg, red eye, sword hand.
"""

import numpy as np

S = 0.00185          # metres per reference pixel
PX0, PY0 = 345.0, 958.0


def px(x_px, y_px, depth=0.0):
    return np.array([(x_px - PX0) * S, depth, (PY0 - y_px) * S])


def lerp(a, b, t):
    return np.asarray(a) + (np.asarray(b) - np.asarray(a)) * t


J = {}
# --- head / neck
J['chin'] = px(351, 160, -0.050)
J['head'] = np.array([0.011, 0.012, 1.565])      # centre of the skull
J['neck_top'] = np.array([0.011, 0.022, 1.505])
J['neck_base'] = px(350, 188, 0.020)
J['chest'] = np.array([0.008, 0.0, 1.32])

# --- arms
J['shoulder_R'] = px(306, 214, 0.045)
J['elbow_R'] = px(281, 334, 0.065)
J['wrist_R'] = px(254, 467, 0.022)
J['hand_R'] = px(243, 500, 0.000)               # grip centre
J['shoulder_L'] = px(407, 216, -0.030)
J['elbow_L'] = px(432, 320, 0.000)
J['wrist_L'] = px(462, 437, -0.055)
J['hand_L'] = px(470, 480, -0.065)               # palm centre

# --- legs
J['pelvis'] = px(340, 420, 0.010)
J['hip_R'] = px(301, 425, 0.024)
J['knee_R'] = px(302, 655, -0.012)
J['ankle_R'] = px(305, 895, 0.012)
J['toe_R'] = px(292, 952, -0.120)
J['hip_L'] = px(381, 425, -0.012)
J['knee_L'] = px(412, 652, -0.095)
J['ankle_L'] = px(446, 893, -0.205)
J['toe_L'] = px(465, 952, -0.335)
# toes at ground level
J['toe_R'][2] = 0.030
J['toe_L'][2] = 0.030

HEIGHT = 1.68

"""Extra toon materials added by part authors (merged into materials.PALETTE).
name: (lit sRGB, shadow sRGB, outline sRGB, extras).  Prefix names with the part."""

EXTRA = {}

# clothing: matte black fabric (bikini, belts) with a thin rim light instead of a blob spec
EXTRA['clothing_fabric'] = ('#2A2E37', '#16181E', '#060709', dict(thr=0.40, rim=0.30))
# clothing: stitching / seam grey on white straps
EXTRA['clothing_stitch'] = ('#A9ACB8', '#80838F', '#4A4C56', dict(thr=0.40))

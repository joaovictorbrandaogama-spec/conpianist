"""Extra toon materials added by part authors (merged into materials.PALETTE).
name: (lit sRGB, shadow sRGB, outline sRGB, extras).  Prefix names with the part."""

EXTRA = {}

# clothing: matte black fabric (bikini, belts) with a thin rim light instead of a blob spec
EXTRA['clothing_fabric'] = ('#2A2E37', '#16181E', '#060709', dict(thr=0.40, rim=0.30))
# clothing: stitching / seam grey on white straps
EXTRA['clothing_stitch'] = ('#A9ACB8', '#80838F', '#4A4C56', dict(thr=0.40))

# swords: pale pink printed marks / small text on the red and black sword parts
EXTRA['swords_mark'] = ('#F6CACA', '#D99A9C', '#7A3A3E', dict(thr=0.40))
# swords: deeper glossy red of the Nightblaze scabbard / sheaths (sampled ~#B22D26)
EXTRA['swords_red'] = ('#BC2C27', '#7C1614', '#3A0606', dict(thr=0.40, spec=0.35, gloss=0.25,
                                                            spec_col='#FF9A90'))

# boots: light grey rubber band of the sneaker sole (reference ~#ADA8A9)
# boots: whitish-lavender midsole / toe and heel wrap (reference ~#E2E0E8, shade ~#BDB9C6)
EXTRA['boots_sole'] = ('#E6E4EC', '#BCB9C6', '#55525E', dict(thr=0.40, spec=0.1, gloss=0.4))
EXTRA['boots_rubber'] = ('#AEABB2', '#7E7B85', '#3C3A42', dict(thr=0.40, spec=0.15, gloss=0.4))

# accessories: matte black hard plastic / rubber (tech collar, goggle frame, straps)
EXTRA['acc_matte'] = ('#2B2F38', '#16181E', '#050608', dict(thr=0.40, spec=0.12, gloss=0.45,
                                                           rim=0.25))
# accessories: light grey edge highlight on the collar plates
EXTRA['acc_edge'] = ('#9EA3AF', '#6C707B', '#2E3036', dict(thr=0.40))
# accessories: flat bright red (collar stripe) without a specular blob
EXTRA['acc_red'] = ('#D2282D', '#8E1519', '#3A0508', dict(thr=0.40))

# hands: matte red of the left glove's finger ends and graphic panels (reference ~#D54D4C,
# shadow ~#971B19), no glossy highlight so the claws read as printed glove fabric
EXTRA['hands_red'] = ('#D8484A', '#9A1F22', '#480A0C', dict(thr=0.40))

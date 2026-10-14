"""Extra toon materials added by part authors (merged into materials.PALETTE).
name: (lit sRGB, shadow sRGB, outline sRGB, extras).  Prefix names with the part."""

EXTRA = {}

# clothing: matte black fabric (bikini, belts) with a thin rim light instead of a blob spec
EXTRA['clothing_fabric'] = ('#2A2E37', '#16181E', '#060709', dict(thr=0.40, rim=0.30))
# clothing: stitching / seam grey on white straps
EXTRA['clothing_stitch'] = ('#A9ACB8', '#80838F', '#4A4C56', dict(thr=0.40))
# clothing: glossy black (shorts, leg armour) without the blob specular: the gloss is
# painted as long streak strips (clothing_sheen) so it reads as anime latex
EXTRA['clothing_gloss'] = ('#323844', '#1A1D24', '#060709', dict(thr=0.40))
EXTRA['clothing_sheen'] = ('#6E7889', '#3C424E', '#1A1D24', dict(thr=0.40))
EXTRA['clothing_sheen_hi'] = ('#A9B3C4', '#5C6472', '#1A1D24', dict(thr=0.40))
# clothing: soft round highlight on the bikini cups
EXTRA['clothing_cuphl'] = ('#474D5A', '#2C3039', '#060709', dict(thr=0.40))
# clothing: light grey inner lining of the bikini cups (reference ~#B3B1B5)
EXTRA['clothing_lining'] = ('#BDBBC2', '#97959F', '#55535C', dict(thr=0.40))
# clothing: matte red of the forearm wrap (no streaky specular)
EXTRA['clothing_red'] = ('#D6282E', '#951A1E', '#4A070A', dict(thr=0.40))
# clothing: neon stripes of the right sleeve: soft pink halo + near-white hot core
EXTRA['clothing_glow_halo'] = ('#F8A6B2', '#E98695', '#7A1424', dict(thr=0.40))
EXTRA['clothing_glow_core'] = ('#FFD3DB', '#FFBCC8', '#7A1424', dict(emit=1.0))
# clothing: dark seam lines on the glossy shorts
EXTRA['clothing_seam'] = ('#15171C', '#0C0D10', '#000000', dict(thr=0.40))
# clothing: dark grey jambs of the leg window ladder seen from the front
EXTRA['clothing_jamb'] = ('#524C54', '#38333A', '#141216', dict(thr=0.40))

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
# swords: bright bevel highlight line on the top / outer edges of the red sheaths (~#D45A56)
EXTRA['swords_red_hi'] = ('#DE6460', '#A8302C', '#3A0606', dict(thr=0.40))
# swords: light grey rim line on the black kodachi / end cap edges (~#898C98)
EXTRA['swords_rim'] = ('#9A9DA8', '#6A6D78', '#202228', dict(thr=0.40))
# swords: shaded light-grey steel of the hip fittings (guard hanger, mount)
EXTRA['swords_steel'] = ('#C4C7CF', '#83878F', '#33363D', dict(thr=0.45, spec=0.6, gloss=0.2,
                                                              spec_col='#FFFFFF'))
# swords: near-white hot core of the scabbard glow slot
EXTRA['swords_glow_core'] = ('#FFE2E8', '#FFC6D0', '#7A1424', dict(emit=1.0))

# accessories: faceted goggle lens (deep translucent crimson): mid, dark lower facets,
# bright upper facets; no specular blob (the glints are separate white pieces)
EXTRA['acc_lens'] = ('#B8222C', '#74101A', '#2A0406', dict(thr=0.40))
EXTRA['acc_lens_dark'] = ('#5E0C14', '#360609', '#1A0204', dict(thr=0.40))
EXTRA['acc_lens_hi'] = ('#E4434D', '#B02A33', '#2A0406', dict(thr=0.40))
# boots: muted coral red of the cuff bands (official art ~#B5443E lit, ~#7A1F1F shadow)
EXTRA['boots_red'] = ('#B8463F', '#7A1F1F', '#3A0A0A', dict(thr=0.40, spec=0.12, gloss=0.4))
# boots: light bevel edge line on the black velcro straps
EXTRA['boots_edge'] = ('#7E8492', '#4E535E', '#1A1C21', dict(thr=0.40))

"""Accessories: goggles, tech collar, arm rings, buckles, clasps, clips,
hanging straps.  build() -> {name: MeshData}."""


def build():
    import outfit
    import props
    d = {}
    d.update(props.goggles())
    d.update(props.straps())
    d.update(outfit.collar())
    d.update(outfit.rings())
    return d

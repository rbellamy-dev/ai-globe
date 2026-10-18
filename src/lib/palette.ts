/**
 * The 3D globe's colors, read from the tokens in src/styles/tokens.css, the
 * one place colors are defined. Three.js and canvas need real color values,
 * not class names, so this looks them up on the page when they're used.
 * Browser only: the globe never renders on the server.
 */
export function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

export const palette = {
  get ocean() {
    return token("ocean");
  },
  get land() {
    return token("land");
  },
  get grid() {
    return token("globe-grid");
  },
  get shadow() {
    return token("globe-shadow");
  },
  get markerEdge() {
    return token("marker-edge");
  },
  get ink() {
    return token("ink");
  },
  get place() {
    return token("place");
  },
};

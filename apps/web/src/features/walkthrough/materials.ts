import * as T from 'three';

export type Finish = 'oak' | 'tile' | 'wet' | 'exterior' | 'courtyard';

const TEXTURE_PATHS: Partial<Record<Finish, string>> = {
  oak: '/textures/oak-floor.png',
  tile: '/textures/ceramic-tile.png',
  wet: '/textures/ceramic-tile.png',
  exterior: '/textures/terracotta-patio.png',
  courtyard: '/textures/courtyard-pebble.png',
};

const loadedTextures = new Map<string, T.Texture>();
const pendingLoads = new Map<string, Promise<T.Texture | null>>();

function loadSharedTexture(url: string): Promise<T.Texture | null> {
  const existing = loadedTextures.get(url);
  if (existing) return Promise.resolve(existing);
  const inflight = pendingLoads.get(url);
  if (inflight) return inflight;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(null);
  const promise = new Promise<T.Texture | null>(resolve => {
    const loader = new T.TextureLoader();
    loader.load(
      url,
      texture => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        loadedTextures.set(url, texture);
        pendingLoads.delete(url);
        resolve(texture);
      },
      undefined,
      () => {
        pendingLoads.delete(url);
        resolve(null);
      },
    );
  });
  pendingLoads.set(url, promise);
  return promise;
}

export function floorFinish(name: string): Finish {
  const label = name.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '');
  if (/tieu canh|gieng troi|san vuon|courtyard|garden/.test(label)) return 'courtyard';
  if (/san gach|san truoc|san sau|ngo sau|san phoi|balcon|terrace|patio|hien|ban cong|lo gia/.test(label)) return 'exterior';
  if (/\bwc\b|ve sinh|bath|toilet|tam|giat/.test(label)) return 'wet';
  if (/phong ngu|ngu|bed|study|lam viec|doc sach/.test(label)) return 'oak';
  return 'tile';
}

export function modelFinishes() {
  const localTextures: T.Texture[] = [];
  let active = true;
  let seed = 2468;
  const sample = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);

  function fallbackMaps(finish: Finish) {
    if (typeof document === 'undefined') return { map: null, bumpMap: null };
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = 256;
    const ctx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = bumpCanvas.height = 256;
    const bctx = bumpCanvas.getContext('2d')!;
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 256);

    if (finish === 'oak') {
      ctx.fillStyle = '#ac885f';
      ctx.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 8; row++) {
        for (let col = -1; col < 2; col++) {
          const left = col * 128 + 32 * (row % 4), top = row * 32;
          ctx.fillStyle = 'hsl(34 38% ' + [66, 72, 77, 69][(row + (col + 2) * 2) % 4] + '%)';
          ctx.fillRect(left, top, 127, 31);
          bctx.fillStyle = '#929292';
          bctx.fillRect(left + 1, top + 1, 125, 29);
        }
      }
      for (let i = 0; i < 950; i++) {
        const x = sample() * 256, y = sample() * 256, span = 8 + sample() * 52;
        ctx.fillStyle = i % 2 ? '#65442c20' : '#fff8de40';
        ctx.fillRect(x, y, span, .7);
        if (x + span > 256) ctx.fillRect(x - 256, y, span, .7);
      }
    } else if (finish === 'courtyard') {
      ctx.fillStyle = '#918d83';
      ctx.fillRect(0, 0, 256, 256);
      bctx.fillStyle = '#5a5a5a';
      bctx.fillRect(0, 0, 256, 256);
      const stones = ['#aca89d', '#c2beb2', '#807c74', '#9c9689'];
      for (let i = 0; i < 180; i++) {
        const cx = sample() * 256, cy = sample() * 256, r = 4 + sample() * 8;
        ctx.fillStyle = stones[i % stones.length];
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        bctx.fillStyle = '#c8c8c8';
        bctx.beginPath();
        bctx.arc(cx, cy, r * .85, 0, Math.PI * 2);
        bctx.fill();
      }
    } else {
      const outdoor = finish === 'exterior';
      const wet = finish === 'wet';
      ctx.fillStyle = outdoor ? '#c9b19c' : wet ? '#aeb8b6' : '#c6c5bd';
      ctx.fillRect(0, 0, 256, 256);
      const palette = outdoor
        ? ['#b67052', '#ac6246', '#c57f5a', '#bb7353']
        : wet
          ? ['#cdd9d7', '#d7e2e0', '#c7d4d2', '#d2dddb']
          : ['#e3e1d8', '#ebe8df', '#e5e2d9', '#efece4'];
      const n = wet ? 4 : 2;
      const cell = 256 / n;
      for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
        ctx.fillStyle = palette[(row * n + col) % palette.length];
        ctx.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
        bctx.fillStyle = '#a8a8a8';
        bctx.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
      }
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 ? '#775c481c' : '#fffcf428';
        ctx.fillRect(sample() * 256, sample() * 256, 1, 1);
      }
    }

    const map = new T.CanvasTexture(colorCanvas);
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = 4;

    const bumpMap = new T.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = bumpMap.wrapT = T.RepeatWrapping;
    bumpMap.anisotropy = 4;

    localTextures.push(map, bumpMap);
    return { map, bumpMap };
  }

  function surface(finish: Finish) {
    const { map: fallbackMap, bumpMap } = fallbackMaps(finish);
    const roughness = finish === 'tile' ? .56 : finish === 'oak' ? .72 : finish === 'wet' ? .78 : finish === 'exterior' ? .88 : .92;
    const material = new T.MeshStandardMaterial({
      map: fallbackMap,
      bumpMap,
      bumpScale: finish === 'courtyard' ? .02 : finish === 'exterior' ? .015 : .008,
      color: finish === 'wet' ? '#d8e4e2' : '#ffffff',
      roughness,
    });
    const url = TEXTURE_PATHS[finish];
    if (url) {
      const cached = loadedTextures.get(url);
      if (cached) {
        material.map = cached;
        material.needsUpdate = true;
      } else {
        void loadSharedTexture(url).then(texture => {
          if (!active || !texture) return;
          material.map = texture;
          material.needsUpdate = true;
        });
      }
    }
    return material;
  }

  const surfaces: Record<Finish, T.MeshStandardMaterial> = {
    oak: surface('oak'),
    tile: surface('tile'),
    wet: surface('wet'),
    exterior: surface('exterior'),
    courtyard: surface('courtyard'),
  };

  return {
    surfaces,
    // UVs are derived from the model's world meters.
    repeats: {
      oak: 1 / 1.6,
      tile: 1 / 1.45,
      wet: 1 / .85,
      exterior: 1 / 1.1,
      courtyard: 1 / 1.1,
    },
    dispose() {
      active = false;
      localTextures.forEach(texture => texture.dispose());
      Object.values(surfaces).forEach(material => material.dispose());
    },
  };
}

/**
 * Shad11t — hero-фон на Three.js: рой фосфорных частиц.
 * Частицы дрейфуют, мерцают и разбегаются от курсора (шейдер).
 * Загружается лениво и только на главной (dynamic import из main.js).
 */

import * as THREE from 'three';
import { $, isReducedMotion } from './utils.js';

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vGlow;
  varying float vSeed;
  void main() {
    vColor = aColor;
    vSeed = aSeed;
    vec3 p = position;
    float t = uTime * (0.25 + aSeed * 0.6);
    p.x += sin(t + aSeed * 6.2831) * 0.28;
    p.y += cos(t * 0.8 + aSeed * 6.2831) * 0.28;
    vec2 diff = p.xy - uMouse.xy;
    float d = length(diff);
    float f = smoothstep(2.8, 0.0, d);
    p.xy += (diff / max(d, 0.0001)) * f * 0.85;
    vGlow = f;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 3.4 + f * 3.4) * uPixelRatio * (11.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  varying float vGlow;
  varying float vSeed;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.06, length(uv));
    float tw = 0.7 + 0.3 * sin(uTime * (1.5 + vSeed * 2.5) + vSeed * 40.0);
    vec3 col = vColor + vec3(0.3, 0.28, 0.2) * vGlow;
    gl_FragColor = vec4(col, a * tw * 0.92);
  }
`;

export function initHero() {
  const canvas = $('[data-hero-3d]');
  if (!canvas || isReducedMotion()) return () => {};

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    canvas.style.display = 'none';
    return () => {};
  }

  const hero = canvas.closest('[data-hero]') || canvas.parentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 8;

  const COUNT = window.innerWidth < 768 ? 200 : 620;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const col = new Float32Array(COUNT * 3);
  const palette = [
    new THREE.Color('#c6ff3d'), new THREE.Color('#c6ff3d'), new THREE.Color('#c6ff3d'),
    new THREE.Color('#7fb800'), new THREE.Color('#ff5a1f'), new THREE.Color('#ece9df'),
  ];
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 19;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 11;
    pos[i * 3 + 2] = -3 + Math.random() * 4;
    seed[i] = Math.random();
    const c = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(geo, mat));

  const resize = () => {
    const w = hero.clientWidth || window.innerWidth;
    const h = hero.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  };
  resize();

  // мышь → мировая точка на плоскости z=0
  const ndc = new THREE.Vector2(999, 999);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };
  const onLeave = () => {
    ndc.x = 999;
    ndc.y = 999;
  };
  hero.addEventListener('mousemove', onMove, { passive: true });
  hero.addEventListener('mouseleave', onLeave, { passive: true });

  // spotlight-слой: двигаем маску за курсором
  const spot = hero.querySelector('.spot-hidden');
  const onSpot = (e) => {
    if (!spot) return;
    const r = hero.getBoundingClientRect();
    spot.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    spot.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  hero.addEventListener('mousemove', onSpot, { passive: true });

  let running = true;
  let raf = 0;
  const clock = new THREE.Clock();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    uniforms.uTime.value = clock.getElapsedTime();
    if (ndc.x < 900) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
    } else {
      uniforms.uMouse.value.set(999, 999, 0);
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  const io = new IntersectionObserver((entries) => {
    running = entries[0]?.isIntersecting ?? true;
  });
  io.observe(canvas);

  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', resize);
    hero.removeEventListener('mousemove', onMove);
    hero.removeEventListener('mouseleave', onLeave);
    hero.removeEventListener('mousemove', onSpot);
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}

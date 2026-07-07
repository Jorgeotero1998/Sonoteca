import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useAudioStore } from "../store/audioStore";

function cssAccent(): THREE.Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#d4a574";
  return new THREE.Color(v);
}

/**
 * Subtle WebGL gradient mesh background — animates gently and
 * reacts to preview audio energy when playing.
 */
export function AmbientMesh() {
  const mountRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef(0);

  useEffect(() => {
    const unsub = useAudioStore.subscribe((s) => {
      energyRef.current = s.energy;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.domElement.style.pointerEvents = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 2.2;

    const geo = new THREE.PlaneGeometry(5, 5, 48, 48);
    const accent = cssAccent();

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uColor: { value: accent },
        uColor2: { value: new THREE.Color("#0c0a09") },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uEnergy;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(pos.x * 2.5 + uTime * 0.6) * 0.08
                     + sin(pos.y * 3.0 + uTime * 0.45) * 0.06
                     + uEnergy * 0.12 * sin(pos.x * 8.0 + uTime * 2.0);
          pos.z += wave;
          vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uColor2;
        uniform float uTime;
        uniform float uEnergy;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float glow = smoothstep(0.0, 1.0, vUv.y + vWave * 2.0);
          vec3 col = mix(uColor2, uColor, glow * (0.35 + uEnergy * 0.4));
          float alpha = 0.22 + uEnergy * 0.18;
          gl_FragColor = vec4(col, alpha * (0.6 + glow * 0.4));
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -0.35;
    scene.add(mesh);

    let frame = 0;
    let running = true;

    const animate = (t: number) => {
      if (!running) return;
      frame = requestAnimationFrame(animate);
      const time = t * 0.001;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uEnergy.value += (energyRef.current - mat.uniforms.uEnergy.value) * 0.12;

      // Refresh accent from CSS every ~2s
      if (Math.floor(time * 10) % 20 === 0) {
        mat.uniforms.uColor.value = cssAccent();
      }

      mesh.rotation.z = Math.sin(time * 0.15) * 0.08;
      renderer.render(scene, camera);
    };

    frame = requestAnimationFrame(animate);

    const onResize = () => {
      const rw = mount.clientWidth || window.innerWidth;
      const rh = mount.clientHeight || window.innerHeight;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="ambientMesh" aria-hidden />;
}

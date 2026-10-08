// M2 - hero 3D scene (React Three Fiber). Bundled to /js/dist/hero3d.js.
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

function Particles({ count = 460 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 2.4 + Math.random() * 3.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi) * 0.5;
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    if (document.hidden || !ref.current) return;
    ref.current.rotation.y += delta * 0.035;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8f7bff" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Knot() {
  const ref = useRef();
  useFrame((state, delta) => {
    if (document.hidden || !ref.current) return;
    ref.current.rotation.x += delta * 0.16;
    ref.current.rotation.y += delta * 0.22;
    ref.current.position.x = 1.9 + state.pointer.x * 0.35;
    ref.current.position.y = 0.35 + state.pointer.y * 0.25;
  });
  return (
    <mesh ref={ref} position={[1.9, 0.35, 0]} scale={1.05}>
      <torusKnotGeometry args={[1, 0.26, 150, 24]} />
      <meshStandardMaterial color="#e02fa0" roughness={0.3} metalness={0.35} />
    </mesh>
  );
}

const root = document.getElementById('hero-3d-root');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (root && !reduced) {
  try {
    const reactRoot = createRoot(root);
    reactRoot.render(
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7], fov: 46 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-4, -2, 2]} intensity={0.8} color="#7ef0c0" />
        <group position={[-1.4, 0.2, 0]}>
          <Particles />
          <Knot />
        </group>
      </Canvas>,
    );
    window.addEventListener('pagehide', () => reactRoot.unmount(), { once: true });
  } catch {
    /* no WebGL — the hero simply renders without decoration */
  }
}

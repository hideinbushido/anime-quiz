import { useEffect, useRef } from "react";

export function TitleReadyScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentCanvas = canvas;
    let disposed = false;
    let stopScene: (() => void) | undefined;

    async function setupScene() {
      const THREE = await import("three");
      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.16, 5.6);

      const renderer = new THREE.WebGLRenderer({
        canvas: currentCanvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const group = new THREE.Group();
      scene.add(group);

      const ambient = new THREE.AmbientLight(0x9ab6ff, 1.15);
      const key = new THREE.PointLight(0xff4058, 19, 8);
      key.position.set(-2.6, 2.3, 3.2);
      const rim = new THREE.PointLight(0x82f6ff, 24, 9);
      rim.position.set(2.7, -0.4, 2.8);
      scene.add(ambient, key, rim);

      const dark = new THREE.MeshStandardMaterial({
        color: 0x090d19,
        roughness: 0.52,
        metalness: 0.62,
      });
      const cyan = new THREE.MeshStandardMaterial({
        color: 0x82f6ff,
        emissive: 0x0d7a8f,
        emissiveIntensity: 1.15,
        roughness: 0.16,
        metalness: 0.42,
      });
      const red = new THREE.MeshStandardMaterial({
        color: 0xff334e,
        emissive: 0x820015,
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.4,
      });
      const gold = new THREE.MeshStandardMaterial({
        color: 0xffcf43,
        emissive: 0x7a5200,
        emissiveIntensity: 0.65,
        roughness: 0.22,
        metalness: 0.48,
      });
      const violet = new THREE.MeshStandardMaterial({
        color: 0x8f5dff,
        emissive: 0x30136f,
        emissiveIntensity: 0.7,
        roughness: 0.24,
        metalness: 0.42,
      });

      const textures: Array<InstanceType<typeof THREE.Texture>> = [];
      const cardGroups: Array<InstanceType<typeof THREE.Group>> = [];
      const chips: Array<InstanceType<typeof THREE.Mesh>> = [];

      function roundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
      }

      function createCardTexture(label: string, title: string, accent: string) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 640;
        labelCanvas.height = 896;
        const ctx = labelCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        const gradient = ctx.createLinearGradient(0, 0, 640, 896);
        gradient.addColorStop(0, "#111a35");
        gradient.addColorStop(0.55, "#071023");
        gradient.addColorStop(1, "#0f1028");
        ctx.fillStyle = gradient;
        roundedRect(ctx, 28, 28, 584, 840, 46);
        ctx.fill();

        ctx.strokeStyle = accent;
        ctx.lineWidth = 10;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 24;
        roundedRect(ctx, 42, 42, 556, 812, 34);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,.08)";
        for (let i = 0; i < 7; i += 1) {
          ctx.fillRect(96 + i * 70, 112, 4, 620);
        }

        ctx.fillStyle = accent;
        ctx.font = "900 238px Outfit, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 320, 362);

        ctx.fillStyle = "rgba(248,251,255,.92)";
        ctx.font = "800 62px Rajdhani, Arial, sans-serif";
        ctx.fillText(title, 320, 640);

        ctx.fillStyle = "rgba(248,251,255,.56)";
        ctx.font = "700 34px Rajdhani, Arial, sans-serif";
        ctx.fillText("QUIZ CARD", 320, 724);

        const texture = new THREE.CanvasTexture(labelCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);
        return texture;
      }

      function addCard(
        label: string,
        title: string,
        accent: string,
        position: [number, number, number],
        rotation: [number, number, number],
        scale = 1
      ) {
        const card = new THREE.Group();
        card.position.set(position[0], position[1], position[2]);
        card.rotation.set(rotation[0], rotation[1], rotation[2]);
        card.scale.setScalar(scale);

        const back = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.64, 0.08), dark);
        back.position.z = -0.035;
        card.add(back);

        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(1.08, 1.54),
          new THREE.MeshBasicMaterial({
            map: createCardTexture(label, title, accent),
            transparent: true,
            side: THREE.DoubleSide,
          })
        );
        face.position.z = 0.02;
        card.add(face);

        group.add(card);
        cardGroups.push(card);
        return card;
      }

      addCard("?", "QUESTION", "#82f6ff", [0, 0.3, 0.35], [-0.1, 0, 0], 1.18);
      addCard("♪", "OPENING", "#ffcf43", [-1.1, 0.1, -0.05], [-0.16, 0.38, -0.22], 0.78);
      addCard("“”", "CITATION", "#ff334e", [1.08, 0.08, -0.08], [-0.16, -0.38, 0.22], 0.78);
      addCard("XP", "SCORE", "#8f5dff", [0.04, -0.36, -0.28], [-0.42, 0, 0.05], 0.7);

      const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.42, 0.2, 6), dark);
      deck.position.y = -1.18;
      deck.rotation.y = Math.PI / 6;
      group.add(deck);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.025, 10, 128), cyan);
      ring.position.y = -0.2;
      ring.rotation.x = Math.PI / 2.35;
      group.add(ring);

      const chipData = [
        { label: "A", x: -1.46, y: -0.76, material: red },
        { label: "B", x: -0.5, y: -0.9, material: gold },
        { label: "C", x: 0.5, y: -0.9, material: cyan },
        { label: "D", x: 1.46, y: -0.76, material: violet },
      ];

      chipData.forEach(({ label, x, y, material }) => {
        const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 40), material);
        chip.position.set(x, y, 0.46);
        chip.rotation.x = Math.PI / 2;
        group.add(chip);
        chips.push(chip);

        const chipCanvas = document.createElement("canvas");
        chipCanvas.width = 256;
        chipCanvas.height = 256;
        const ctx = chipCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#080a12";
          ctx.font = "900 132px Outfit, Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, 128, 132);
        }
        const texture = new THREE.CanvasTexture(chipCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);

        const letter = new THREE.Mesh(
          new THREE.PlaneGeometry(0.28, 0.28),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
        );
        letter.position.set(x, y, 0.51);
        group.add(letter);
      });

      const particles = new Float32Array(130 * 3);
      for (let i = 0; i < 130; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.45 + Math.random() * 0.86;
        particles[i * 3] = Math.cos(angle) * radius;
        particles[i * 3 + 1] = (Math.random() - 0.5) * 2.6;
        particles[i * 3 + 2] = Math.sin(angle) * 0.22 - 0.32;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particles, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x91f4ff,
        size: 0.03,
        transparent: true,
        opacity: 0.58,
      });
      const particleField = new THREE.Points(particleGeometry, particleMaterial);
      group.add(particleField);

      const pointer = { x: 0, y: 0 };
      function handlePointerMove(event: PointerEvent) {
        const rect = currentCanvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.38;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -0.28;
      }

      const resizeObserver = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      });

      resizeObserver.observe(currentCanvas);
      currentCanvas.addEventListener("pointermove", handlePointerMove);

      let frame = 0;
      const clock = new THREE.Clock();

      function animate() {
        frame = window.requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        group.rotation.y += (pointer.x - group.rotation.y) * 0.05;
        group.rotation.x += (pointer.y - group.rotation.x) * 0.05;
        group.position.y = Math.sin(t * 1.1) * 0.04;
        ring.rotation.z = t * 0.5;
        particleField.rotation.z = t * 0.08;

        cardGroups.forEach((card, index) => {
          card.position.y += Math.sin(t * 1.4 + index) * 0.0018;
          card.rotation.z += Math.sin(t * 1.1 + index) * 0.0008;
        });
        chips.forEach((chip, index) => {
          chip.position.y += Math.sin(t * 2 + index) * 0.0016;
          chip.rotation.z = t * (0.35 + index * 0.05);
        });

        renderer.render(scene, camera);
      }

      animate();

      stopScene = () => {
        window.cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        currentCanvas.removeEventListener("pointermove", handlePointerMove);
        renderer.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        textures.forEach((texture) => texture.dispose());
        [dark, cyan, red, gold, violet].forEach((material) => material.dispose());
        group.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      };
    }

    void setupScene();

    return () => {
      disposed = true;
      stopScene?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="title-ready-scene" />;
}

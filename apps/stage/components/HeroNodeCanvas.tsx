import { css } from '@emotion/react';
import { useEffect, useRef } from 'react';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	alpha: number;
	isHub: boolean;
}

const EDGE_DISTANCE = 160;
const PARTICLE_COUNT = 70;

const HeroNodeCanvas = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let animId: number;
		const particles: Particle[] = [];

		const resize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};

		const init = () => {
			particles.length = 0;
			for (let i = 0; i < PARTICLE_COUNT; i++) {
				const isHub = Math.random() < 0.12;
				particles.push({
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					vx: (Math.random() - 0.5) * (isHub ? 0.06 : 0.11),
					vy: (Math.random() - 0.5) * (isHub ? 0.06 : 0.11),
					radius: isHub ? Math.random() * 3 + 4 : Math.random() * 2 + 1.5,
					alpha: isHub ? 0.9 : Math.random() * 0.4 + 0.4,
					isHub,
				});
			}
		};

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Edges
			for (let i = 0; i < particles.length; i++) {
				for (let j = i + 1; j < particles.length; j++) {
					const a = particles[i];
					const b = particles[j];
					const dx = a.x - b.x;
					const dy = a.y - b.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist < EDGE_DISTANCE) {
						const strength = 1 - dist / EDGE_DISTANCE;
						const edgeAlpha = strength * (a.isHub || b.isHub ? 0.5 : 0.22);
						ctx.beginPath();
						ctx.strokeStyle = `rgba(78, 185, 230, ${edgeAlpha})`;
						ctx.lineWidth = a.isHub || b.isHub ? 1.2 : 0.7;
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(b.x, b.y);
						ctx.stroke();
					}
				}
			}

			// Nodes
			for (const p of particles) {
				// Outer glow
				const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * (p.isHub ? 5 : 3.5));
				glow.addColorStop(0, `rgba(78, 185, 230, ${p.alpha * 0.35})`);
				glow.addColorStop(1, `rgba(78, 185, 230, 0)`);
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius * (p.isHub ? 5 : 3.5), 0, Math.PI * 2);
				ctx.fillStyle = glow;
				ctx.fill();

				// Core
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fillStyle = p.isHub
					? `rgba(110, 201, 208, ${p.alpha})`
					: `rgba(150, 215, 240, ${p.alpha})`;
				ctx.fill();

				p.x += p.vx;
				p.y += p.vy;
				if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
				if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
			}

			animId = requestAnimationFrame(draw);
		};

		const onResize = () => {
			resize();
			init();
		};

		resize();
		init();
		draw();

		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', onResize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			css={css`
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
				display: block;
			`}
		/>
	);
};

export default HeroNodeCanvas;

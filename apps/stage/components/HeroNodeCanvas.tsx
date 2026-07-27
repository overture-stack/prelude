import { css } from '@emotion/react';
import { useEffect, useRef } from 'react';

const HeroNodeCanvas = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let animId: number;
		let phase = 0;

		const resize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const w = canvas.width;
			const h = canvas.height;
			const amplitude = h * 0.3;
			const centerY = h * 0.5;
			const wavelength = 180;

			phase += 0.003;

			// Base pair rungs — drawn behind the strands
			for (let x = 0; x < w; x += 14) {
				const angle = (x / wavelength) * Math.PI * 2 + phase;
				const y1 = centerY + Math.sin(angle) * amplitude;
				const y2 = centerY + Math.sin(angle + Math.PI) * amplitude;

				// Depth cue: rung is most visible when strands are farthest apart
				const depth = Math.abs(Math.cos(angle));
				const alpha = depth * 0.3 + 0.04;

				ctx.beginPath();
				ctx.moveTo(x, y1);
				ctx.lineTo(x, y2);
				ctx.strokeStyle = `rgba(140, 210, 235, ${alpha})`;
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// Small nucleotide dots at rung ends when depth is significant
				if (depth > 0.4) {
					ctx.beginPath();
					ctx.arc(x, y1, 2, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(140, 215, 245, ${alpha * 1.6})`;
					ctx.fill();

					ctx.beginPath();
					ctx.arc(x, y2, 2, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(100, 200, 210, ${alpha * 1.6})`;
					ctx.fill();
				}
			}

			// Strand 1
			ctx.beginPath();
			for (let x = 0; x <= w; x += 2) {
				const y = centerY + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
				x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
			}
			ctx.strokeStyle = 'rgba(78, 185, 230, 0.55)';
			ctx.lineWidth = 2.5;
			ctx.stroke();

			// Strand 2 (complementary, 180° offset)
			ctx.beginPath();
			for (let x = 0; x <= w; x += 2) {
				const y = centerY + Math.sin((x / wavelength) * Math.PI * 2 + phase + Math.PI) * amplitude;
				x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
			}
			ctx.strokeStyle = 'rgba(100, 205, 200, 0.5)';
			ctx.lineWidth = 2.5;
			ctx.stroke();

			animId = requestAnimationFrame(draw);
		};

		resize();
		draw();

		window.addEventListener('resize', resize);
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', resize);
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

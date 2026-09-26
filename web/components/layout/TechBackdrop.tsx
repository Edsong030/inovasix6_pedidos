/**
 * Fundo tecnológico do Dashboard e de Relatórios: azul-marinho, trilhas de
 * circuito com nós luminosos, feixes neon azul/roxo e textura de pontos.
 * Os desenhos ficam ancorados no topo, nas laterais e nos cantos, sem
 * esticar; o centro fica mais limpo para os painéis.
 */

const TRACE = '#4d7cff'
const NODE  = '#8fb0ff'

type Node = [number, number, number?]

function Nodes({ points, color = NODE }: { points: Node[]; color?: string }) {
  return (
    <g filter="url(#tb-glow)">
      {points.map(([x, y, r = 2.6], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={color} />
      ))}
    </g>
  )
}

function Traces({ d, opacity = 0.7, width = 1.4, color = TRACE }: { d: string[]; opacity?: number; width?: number; color?: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" opacity={opacity}>
      {d.map((p, i) => <path key={i} d={p} />)}
    </g>
  )
}

/** Matriz de pontos (textura digital). */
function DotMatrix({ x, y, cols, rows, gap = 9, r = 1.1, color = '#6f93ff', opacity = 0.45 }: {
  x: number; y: number; cols: number; rows: number; gap?: number; r?: number; color?: string; opacity?: number
}) {
  const dots: JSX.Element[] = []
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      dots.push(<circle key={`${i}-${j}`} cx={x + i * gap} cy={y + j * gap} r={r} />)
    }
  }
  return <g fill={color} opacity={opacity}>{dots}</g>
}

function Beam({ d, color, width = 2.2, opacity = 0.9 }: { d: string; color: string; width?: number; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path d={d} stroke={color} strokeWidth={width * 4} strokeLinecap="round" opacity={0.18} filter="url(#tb-blur)" fill="none" />
      <path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
    </g>
  )
}

const piece = 'absolute pointer-events-none'

export function TechBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none print:hidden" style={{ zIndex: 0 }}>
      {/* Base azul-marinho com luzes difusas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1000px 460px at 58% -10%, rgba(50, 90, 240, 0.38), transparent 70%),' +
            'radial-gradient(760px 560px at -5% 105%, rgba(120, 70, 240, 0.36), transparent 70%),' +
            'radial-gradient(600px 500px at 105% 100%, rgba(70, 60, 220, 0.20), transparent 70%),' +
            'radial-gradient(560px 440px at 100% 0%, rgba(40, 110, 255, 0.32), transparent 70%),' +
            'linear-gradient(180deg, #0b1438 0%, #091030 45%, #0a0f30 100%)',
        }}
      />

      {/* Textura digital de pontos, visível só perto das bordas */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(110, 145, 255, 0.22) 1px, transparent 1.2px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, black 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, black 100%)',
        }}
      />

      {/* Definições compartilhadas */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="tb-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="tb-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <linearGradient id="tb-beam-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b8cff" stopOpacity="0" />
            <stop offset="45%" stopColor="#4f7dff" stopOpacity="1" />
            <stop offset="100%" stopColor="#7aa2ff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="tb-beam-violet" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tb-beam-mix" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#6d5cff" stopOpacity="0" />
            <stop offset="50%" stopColor="#4f7dff" stopOpacity="1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Topo: trilhas de circuito ───────────────────────────────────── */}
      <svg className={piece} style={{ top: 0, left: 720, width: 1040, height: 170 }} viewBox="0 0 1040 170">
        <Traces d={[
          'M0 46 H210 L240 76 H420 L450 46 H640',
          'M300 0 V22 L330 52 H520 L548 24 H770 L800 56 H1040',
          'M120 0 V32 L150 62 H262',
          'M580 0 V70 L610 100 H720',
          'M860 0 V36 L890 66 H1000',
          'M430 170 V130 L460 100 H560',
        ]} />
        <Traces d={['M40 110 H150 L175 135 H330', 'M680 140 H820 L850 110 H930']} opacity={0.3} />
        <Nodes points={[[210, 46], [420, 76], [640, 46, 3.2], [520, 52], [770, 24, 3.2], [262, 62], [720, 100], [1000, 66], [560, 100], [330, 135], [930, 110], [150, 110]]} />
        <DotMatrix x={940} y={96} cols={9} rows={6} />
        <DotMatrix x={30} y={10} cols={7} rows={4} opacity={0.3} />
      </svg>

      {/* ── Canto superior direito: feixes neon ─────────────────────────── */}
      <svg className={piece} style={{ top: 0, right: 0, width: 560, height: 380 }} viewBox="0 0 560 380">
        <Beam d="M170 0 L560 300" color="url(#tb-beam-blue)" width={2.4} />
        <Beam d="M270 0 L560 220" color="url(#tb-beam-blue)" width={1.6} opacity={0.75} />
        <Beam d="M100 0 L560 360" color="url(#tb-beam-blue)" width={1.1} opacity={0.5} />
        <Traces d={['M560 110 H470 L440 80 H360', 'M560 170 H500 L470 200 V260']} opacity={0.45} />
        <Nodes points={[[360, 80], [470, 260], [440, 80]]} />
        <DotMatrix x={420} y={16} cols={12} rows={5} opacity={0.35} />
      </svg>

      {/* ── Sidebar: circuito visível através do fundo translúcido ───────── */}
      <svg className={piece} style={{ top: 300, left: 0, width: 280, height: 520 }} viewBox="0 0 280 520">
        <Traces d={[
          'M280 20 H236 L214 42 V180 L236 202 H280',
          'M280 260 H200 L176 284 V420',
          'M160 520 V470 L190 440 H280',
        ]} opacity={0.5} />
        <Nodes points={[[236, 20], [214, 180], [176, 420, 3.2], [190, 440], [200, 260]]} />
        <DotMatrix x={228} y={300} cols={5} rows={8} opacity={0.3} />
      </svg>

      {/* ── Lateral esquerda (logo após a sidebar): trilhas verticais ───── */}
      <svg className={piece} style={{ top: 120, left: 280, width: 190, height: 760 }} viewBox="0 0 190 760">
        <Traces d={[
          'M0 60 H40 L70 90 V300 L40 330 H0',
          'M0 400 H60 L92 432 V600',
          'M22 0 V40 L52 70 V160',
          'M150 470 V560 L120 590 V760',
        ]} opacity={0.5} />
        <Nodes points={[[40, 60], [70, 300], [92, 600, 3.2], [52, 160], [150, 470], [60, 400]]} />
        <DotMatrix x={110} y={200} cols={4} rows={10} opacity={0.3} />
      </svg>

      {/* ── Canto inferior esquerdo: feixes + circuito + matriz ─────────── */}
      <svg className={piece} style={{ bottom: 0, left: 0, width: 660, height: 480 }} viewBox="0 0 660 480">
        <Beam d="M0 470 L330 150" color="url(#tb-beam-mix)" width={3.2} />
        <Beam d="M120 480 L520 80" color="url(#tb-beam-blue)" width={2.2} opacity={0.85} />
        <Beam d="M40 480 L400 120" color="url(#tb-beam-violet)" width={2.4} opacity={0.95} />
        <Beam d="M0 380 L220 160" color="url(#tb-beam-violet)" width={1.2} opacity={0.6} />
        <Traces d={[
          'M0 330 H90 L130 290 H230 L270 250 H370',
          'M0 410 H150 L190 370 H300',
          'M170 480 V440 L210 400 H340 L370 370 H470',
          'M60 480 V450 L90 420',
        ]} opacity={0.55} />
        <Nodes points={[[90, 330], [230, 290], [370, 250, 3.4], [150, 410], [300, 370], [340, 400], [470, 370, 3.2], [90, 420]]} />
        <Nodes points={[[250, 200, 2], [410, 300, 2], [520, 420, 2.4]]} color="#b39bff" />
        <DotMatrix x={24} y={200} cols={12} rows={9} opacity={0.4} />
      </svg>

      {/* ── Lateral direita ─────────────────────────────────────────────── */}
      <svg className={piece} style={{ top: '38%', right: 0, width: 170, height: 420 }} viewBox="0 0 170 420">
        <Traces d={['M170 40 H120 L90 70 V230 L120 260 H170', 'M170 320 H100 L70 350 V420', 'M40 0 V120 L70 150']} opacity={0.45} />
        <Nodes points={[[120, 40], [90, 230], [100, 320], [70, 150]]} />
        <DotMatrix x={20} y={200} cols={4} rows={8} opacity={0.3} />
      </svg>

      {/* ── Canto inferior direito: feixe roxo ──────────────────────────── */}
      <svg className={piece} style={{ bottom: 0, right: 0, width: 440, height: 340 }} viewBox="0 0 440 340">
        <Beam d="M440 60 L160 340" color="url(#tb-beam-violet)" width={2} opacity={0.8} />
        <Beam d="M440 170 L270 340" color="url(#tb-beam-mix)" width={1.3} opacity={0.6} />
        <Traces d={['M440 250 H360 L330 280 H250']} opacity={0.4} />
        <Nodes points={[[250, 280], [360, 250]]} color="#b39bff" />
      </svg>

      {/* Pontos luminosos soltos */}
      <svg className={piece} style={{ inset: 0, width: '100%', height: '100%' }}>
        <g filter="url(#tb-glow)" fill="#9db8ff">
          {[[8, 22], [15, 70], [33, 6], [48, 12], [71, 9], [88, 30], [95, 58], [62, 96], [40, 92], [4, 48]].map(([x, y], i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 2 : 1.4} opacity={0.8} />
          ))}
        </g>
      </svg>
    </div>
  )
}

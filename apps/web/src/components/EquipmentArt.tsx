import { useId } from 'react';

// Original category illustrations, not photographs of the named model. Name matching
// precedes category matching so a tripod in Cameras still has the right silhouette.
function equipmentKind(text: string) {
  if (/tripod|monopod|stand/.test(text)) return 'tripod';
  if (/headphone|headset/.test(text)) return 'headphones';
  if (/lens/.test(text)) return 'lens';
  if (/camera|photo|eos|sony.*alpha/.test(text)) return 'camera';
  if (/audio|mic|sound|recorder/.test(text)) return 'audio';
  if (/light|flash|softbox/.test(text)) return 'light';
  if (/laptop|computer|macbook|tablet/.test(text)) return 'computer';
  return null;
}

export function EquipmentArt({
  category = '',
  name = '',
  large = false,
}: {
  category?: string;
  name?: string;
  large?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const kind = equipmentKind(name.toLowerCase()) ?? equipmentKind(category.toLowerCase()) ?? 'case';
  const fill = (key: string) => `url(#${id}-${key})`;
  return (
    <div className={`equipment-art art-${kind}${large ? ' art-large' : ''}`} aria-hidden="true">
      <div className="art-orbit" />
      <svg viewBox="0 0 480 320" fill="none">
        <defs>
          <linearGradient
            id={`${id}-body`}
            x1="100"
            y1="60"
            x2="290"
            y2="270"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#626965" />
            <stop offset=".42" stopColor="#292e2c" />
            <stop offset="1" stopColor="#111615" />
          </linearGradient>
          <linearGradient
            id={`${id}-metal`}
            x1="160"
            y1="50"
            x2="290"
            y2="230"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f1f1e8" />
            <stop offset=".3" stopColor="#9aa6a2" />
            <stop offset=".52" stopColor="#d9dfda" />
            <stop offset="1" stopColor="#586963" />
          </linearGradient>
          <radialGradient id={`${id}-glass`} cx=".35" cy=".3" r=".75">
            <stop stopColor="#95b7a9" />
            <stop offset=".25" stopColor="#3f6864" />
            <stop offset=".5" stopColor="#182f30" />
            <stop offset=".75" stopColor="#0c1719" />
            <stop offset="1" stopColor="#426252" />
          </radialGradient>
          <linearGradient
            id={`${id}-diffuser`}
            x1="140"
            y1="50"
            x2="300"
            y2="230"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fffff5" />
            <stop offset=".55" stopColor="#e8e1c9" />
            <stop offset="1" stopColor="#aaa48f" />
          </linearGradient>
          <linearGradient
            id={`${id}-screen`}
            x1="160"
            y1="70"
            x2="320"
            y2="215"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#112f2c" />
            <stop offset=".5" stopColor="#3c7062" />
            <stop offset="1" stopColor="#b6cd8c" />
          </linearGradient>
          <pattern id={`${id}-mesh`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 1h6M1 0v6" stroke="#161e1c" strokeWidth="1.5" opacity=".7" />
          </pattern>
          <filter id={`${id}-shadow`} x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <ellipse
          cx="247"
          cy="269"
          rx={kind === 'tripod' ? 95 : 128}
          ry="13"
          fill="#14251b"
          opacity=".22"
          filter={fill('shadow')}
        />
        {kind === 'camera' && (
          <g transform="rotate(-9 240 165)">
            <path
              d="m106 104 35-13h182l34 21v115l-27 17H113l-17-18V120z"
              fill={fill('body')}
              stroke="#68736c"
            />
            <path d="m109 105 35-14h180l29 19-24 14H103z" fill="#626c64" />
            <path d="m164 98 15-28h59l23 31" fill={fill('body')} stroke="#6a756e" />
            <rect x="117" y="124" width="46" height="104" rx="12" fill="#1d2320" />
            <path d="M126 136v79m6-79v79m6-79v79m6-79v79" stroke="#3a423c" strokeWidth="2" />
            <ellipse cx="304" cy="98" rx="22" ry="7" fill="#121b16" stroke="#8b9689" />
            <path d="M288 96h30M294 91v12M302 91v12M310 91v12" stroke="#70806c" />
            <rect x="180" y="80" width="44" height="16" rx="3" fill="#19231f" />
            <circle cx="246" cy="177" r="69" fill="#101713" stroke="#737e70" strokeWidth="3" />
            <circle
              cx="246"
              cy="177"
              r="60"
              fill={fill('body')}
              stroke="#4e5c50"
              strokeWidth="8"
              strokeDasharray="2 3"
            />
            <circle
              cx="246"
              cy="177"
              r="48"
              fill={fill('glass')}
              stroke="#869184"
              strokeWidth="2"
            />
            <circle cx="246" cy="177" r="32" stroke="#82a493" strokeOpacity=".3" />
            <circle cx="246" cy="177" r="19" fill="#0c1818" />
            <ellipse
              cx="229"
              cy="156"
              rx="16"
              ry="9"
              transform="rotate(-35 229 156)"
              fill="#d8ead6"
              opacity=".4"
            />
            <rect x="319" y="133" width="17" height="6" rx="1" fill="#d1ddc4" />
            <circle cx="322" cy="152" r="3" fill="#bed65c" />
          </g>
        )}
        {kind === 'lens' && (
          <g transform="rotate(-22 240 160)">
            <path d="M169 90h142v150H169z" fill={fill('body')} stroke="#879184" />
            <ellipse cx="240" cy="240" rx="71" ry="24" fill="#202a24" stroke="#687867" />
            <path
              d="M169 141h142M169 149h142M169 157h142M169 165h142M169 173h142M169 181h142M169 189h142M169 197h142"
              stroke="#83907e"
              strokeWidth="3"
            />
            <ellipse
              cx="240"
              cy="90"
              rx="71"
              ry="31"
              fill="#18251d"
              stroke="#a4afa0"
              strokeWidth="3"
            />
            <ellipse cx="240" cy="90" rx="57" ry="24" fill={fill('glass')} stroke="#8e9d83" />
            <ellipse cx="228" cy="84" rx="23" ry="7" fill="#d3e9d1" opacity=".3" />
            <path d="M179 221h122" stroke="#b9cc6b" strokeWidth="4" />
          </g>
        )}
        {kind === 'audio' && (
          <g transform="rotate(16 240 155)">
            <path d="M237 219v50m-42 0h90" stroke="#37463e" strokeWidth="9" />
            <path d="M182 147v29c0 71 116 71 116 0v-29" stroke={fill('metal')} strokeWidth="10" />
            <rect
              x="199"
              y="45"
              width="82"
              height="166"
              rx="40"
              fill={fill('metal')}
              stroke="#89968b"
            />
            <path d="M199 86a41 41 0 0 1 82 0v43h-82z" fill={fill('mesh')} />
            <path d="M200 133h80" stroke="#ecf1de" strokeWidth="4" />
            <rect x="224" y="155" width="32" height="33" rx="4" fill="#21382c" />
            <path d="M232 164h16m-16 6h16" stroke="#aebfa3" strokeWidth="2" />
            <circle cx="240" cy="180" r="3" fill="#d2e58d" />
          </g>
        )}
        {kind === 'headphones' && (
          <g transform="rotate(-12 240 160)">
            <path d="M148 186v-53a92 92 0 0 1 184 0v53" stroke="#242e28" strokeWidth="24" />
            <path d="M148 137a92 92 0 0 1 184 0" stroke="#a3afa1" strokeWidth="6" />
            <rect
              x="127"
              y="150"
              width="61"
              height="104"
              rx="25"
              fill={fill('body')}
              stroke="#74816f"
            />
            <rect
              x="292"
              y="150"
              width="61"
              height="104"
              rx="25"
              fill={fill('body')}
              stroke="#74816f"
            />
            <rect x="169" y="156" width="24" height="91" rx="12" fill="#141d18" />
            <rect x="287" y="156" width="24" height="91" rx="12" fill="#141d18" />
            <path d="M145 175v49m190-49v49" stroke="#bbd36b" strokeWidth="3" />
          </g>
        )}
        {kind === 'light' && (
          <g>
            <path d="M255 207v62m0-24-54 36m54-36 50 36" stroke="#384139" strokeWidth="7" />
            <path
              d="m241 44 82 27 39 69-28 74-78 25-82-30-31-70 27-67z"
              fill={fill('body')}
              stroke="#6b7062"
              strokeWidth="2"
            />
            <path
              d="m226 39 78 27 32 68-28 66-77 24-77-29-27-65 27-65z"
              fill={fill('diffuser')}
              stroke="#f7f3dc"
              strokeWidth="4"
            />
            <path
              d="m226 39 5 185M127 130l209 4M154 65l154 135M304 66 154 195"
              stroke="#918c79"
              opacity=".25"
            />
            <path d="m184 101 77-9 29 63-63 29-47-37z" fill="#fffef1" opacity=".35" />
          </g>
        )}
        {kind === 'computer' && (
          <g transform="rotate(-7 240 175)">
            <path
              d="M129 62h240l-24 166H105z"
              fill={fill('body')}
              stroke="#9eafa5"
              strokeWidth="3"
            />
            <path d="M140 74h214l-20 141H120z" fill={fill('screen')} />
            <path
              d="M141 179c59-102 102 90 211-65M135 196c71-99 90 72 211-53"
              stroke="#cadf99"
              strokeWidth="2"
              opacity=".35"
            />
            <path d="M105 228h240l-43 46H61z" fill={fill('metal')} stroke="#a2afa4" />
            <path d="m61 274 11 7h228l2-7" fill="#3c4a41" />
            <path d="M123 237h192l-15 17H108z" fill="#34463b" />
            <path
              d="M137 237l-14 17m32-17-14 17m32-17-14 17m32-17-14 17m32-17-14 17m32-17-14 17m32-17-14 17m32-17-14 17M116 244h192m-197 5h192"
              stroke="#a3b3a5"
              strokeWidth="1.5"
            />
            <path d="M172 258h65l-10 11h-66z" stroke="#788e7e" />
          </g>
        )}
        {kind === 'tripod' && (
          <g>
            <path
              d="M239 116v86m0-36-87 108m87-108 87 108m-87-108 8 114"
              stroke="#252f2a"
              strokeWidth="10"
            />
            <path
              d="m212 198-45 57m99-57 45 57m-70-57 4 56"
              stroke={fill('metal')}
              strokeWidth="6"
            />
            <path d="m185 223 57-23 48 23" stroke="#536756" strokeWidth="3" />
            <path d="M223 85h31v43h-31z" fill={fill('body')} stroke="#91a185" />
            <rect x="207" y="63" width="66" height="24" rx="4" fill={fill('metal')} />
            <rect x="213" y="55" width="53" height="12" rx="3" fill="#1d2e23" />
            <path d="m253 96 67-31 16 3" stroke="#29382d" strokeWidth="6" />
            <circle cx="239" cy="103" r="9" fill="#c1d786" stroke="#233d2d" strokeWidth="4" />
            <path d="M145 276h19m155 0h18m-99 7h19" stroke="#18281d" strokeWidth="7" />
          </g>
        )}
        {kind === 'case' && (
          <g transform="rotate(-8 240 170)">
            <path
              d="m112 102 23-17h211l23 19v126l-21 17H126l-14-15z"
              fill={fill('body')}
              stroke="#788370"
              strokeWidth="2"
            />
            <path d="M205 87V64h72v23" stroke="#354837" strokeWidth="12" />
            <path d="M112 139h257" stroke="#839077" strokeWidth="3" />
            <path d="M144 156v65m18-65v65m158-65v65m18-65v65" stroke="#4c5d48" strokeWidth="8" />
            <rect x="173" y="126" width="25" height="35" rx="3" fill={fill('metal')} />
            <rect x="288" y="126" width="25" height="35" rx="3" fill={fill('metal')} />
            <rect x="209" y="181" width="68" height="28" fill="#bdcf80" />
            <path d="M219 190h47m-47 9h28" stroke="#30402d" strokeWidth="3" />
          </g>
        )}
      </svg>
    </div>
  );
}

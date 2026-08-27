// SVG-string versions of the backpack art, for the print/PDF documents (the
// on-screen React components can't be reused inside a printed window).

import { isCustomItem, itemName } from "@shared/content";
import { esc } from "@/lib/print";

// Item illustrations as raw SVG inner markup (fixed colours; match item-icon.tsx).
const SHAPES: Record<string, string> = {
  map: `<path d="M9 13 18 10 30 13 39 10 39 37 30 40 18 37 9 40 Z" fill="#efe2c6"/><path d="M18 10 V37" stroke-width="1.6"/><path d="M30 13 V40" stroke-width="1.6"/><path d="M13 31 Q19 23 25 27 T33 19" stroke="#b9542f" stroke-width="1.8" fill="none" stroke-dasharray="2 2.5"/><circle cx="33" cy="19" r="2.4" fill="#b9542f" stroke-width="1.4"/>`,
  compass: `<circle cx="24" cy="24" r="15" fill="#d9b25f"/><circle cx="24" cy="24" r="10.5" fill="#f6efdd"/><path d="M24 15 27 24 24 24 Z" fill="#b9542f"/><path d="M24 33 21 24 24 24 Z" fill="#c9925a"/><circle cx="24" cy="24" r="1.6" fill="#4a3720" stroke="none"/>`,
  flashlight: `<path d="M20 13 28 13 33 5 15 5 Z" fill="#f4e3a3" opacity="0.55" stroke="none"/><path d="M18 20 30 20 27 13 21 13 Z" fill="#bd8850"/><ellipse cx="24" cy="13" rx="3.4" ry="1.4" fill="#f6e3a0"/><rect x="19" y="20" width="10" height="20" rx="2" fill="#9a6b38"/><path d="M19 29 H29"/>`,
  tent: `<path d="M24 10 42 40 6 40 Z" fill="#8ea262"/><path d="M24 19 32 40 16 40 Z" fill="#63723f"/><path d="M24 7 V11"/>`,
  notebook: `<rect x="13" y="9" width="23" height="30" rx="2" fill="#f4ecd6"/><rect x="13" y="9" width="7" height="30" rx="2" fill="#b9542f"/><path d="M24 17 H33 M24 23 H33 M24 29 H33" stroke-width="1.6"/><circle cx="16.5" cy="15" r="1" fill="#4a3720" stroke="none"/><circle cx="16.5" cy="24" r="1" fill="#4a3720" stroke="none"/><circle cx="16.5" cy="33" r="1" fill="#4a3720" stroke="none"/>`,
  star: `<path d="M24 6 27.6 17 40 18 30 25 33.6 38 24 30.6 14.4 38 18 25 8 18 20.4 17 Z" fill="#e2b24a"/>`,
  firstaid: `<path d="M18 15 V12 H30 V15" fill="#e9e0cd"/><rect x="8" y="15" width="32" height="22" rx="3" fill="#e9e0cd"/><path d="M22 20 H26 V24 H30 V28 H26 V32 H22 V28 H18 V24 H22 Z" fill="#c0392b"/>`,
  binoculars: `<rect x="9" y="14" width="11" height="4" rx="2" fill="#6f4e28"/><rect x="28" y="14" width="11" height="4" rx="2" fill="#6f4e28"/><rect x="9" y="16" width="11" height="20" rx="5" fill="#9a6b38"/><rect x="28" y="16" width="11" height="20" rx="5" fill="#9a6b38"/><path d="M19 20 H29 V25 H19 Z" fill="#9a6b38"/><circle cx="14.5" cy="32" r="3" fill="#bcd0d6"/><circle cx="33.5" cy="32" r="3" fill="#bcd0d6"/>`,
  water: `<rect x="19" y="5" width="10" height="3" rx="1" fill="#4a3720"/><rect x="20" y="8" width="8" height="7" fill="#6f9aa0"/><rect x="18" y="14" width="12" height="26" rx="4" fill="#6f9aa0"/><path d="M18 22 H30" stroke-width="1.6"/>`,
  snacks: `<circle cx="24" cy="27" r="12" fill="#c0392b"/><path d="M24 15 V11"/><path d="M24 13 q4-3 7-1" fill="#8ea262" stroke="none"/><path d="M24 13 q4-3 7-1"/>`,
  matches: `<rect x="22" y="18" width="4" height="22" rx="1.5" fill="#caa26a"/><path d="M24 8 c3 3 4 5 4 7 a4 4 0 0 1-8 0 c0-2 1-4 4-7 Z" fill="#e07b3a"/><path d="M24 12 c1.5 1.5 2 2.6 2 3.6 a2 2 0 0 1-4 0 c0-1 .7-2 2-3.6 Z" fill="#f2c14e" stroke="none"/>`,
  boots: `<path d="M17 8 h6 v14 l7 4 c2.5 1.4 2 5 -1 5 H17 a2 2 0 0 1-2-2 V10 a2 2 0 0 1 2-2 Z" fill="#7a5230"/><path d="M14 27 H31" stroke-width="1.8"/>`,
  powerbank: `<rect x="15" y="8" width="18" height="32" rx="3" fill="#5a6472"/><rect x="19" y="12" width="10" height="4" rx="1" fill="#9aa6b5"/><path d="M25 21 20 30 24 30 23 36 29 26 25 26 26 21 Z" fill="#e2b24a" stroke="none"/><rect x="21" y="37" width="6" height="3" rx="1" fill="#3a2a1a"/>`,
  swissknife: `<path d="M31 23 L44 12 Q46 11 45.5 14.5 L34 26 Z" fill="#cdd0d5"/><rect x="7" y="18" width="27" height="12" rx="6" fill="#c0392b"/><rect x="18" y="20" width="4" height="8" rx="1.2" fill="#f4ecd6" stroke="none"/><rect x="16" y="22" width="8" height="4" rx="1.2" fill="#f4ecd6" stroke="none"/>`,
  clock: `<circle cx="14" cy="12" r="4" fill="#d9b25f"/><circle cx="34" cy="12" r="4" fill="#d9b25f"/><rect x="22" y="6" width="4" height="4" rx="1" fill="#9a6b38"/><circle cx="24" cy="27" r="14" fill="#e9e0cd"/><circle cx="24" cy="27" r="10" fill="#f6efdd"/><path d="M24 27 V19"/><path d="M24 27 L30 29"/><circle cx="24" cy="27" r="1.6" fill="#4a3720" stroke="none"/><path d="M15 39 L12 43"/><path d="M33 39 L36 43"/>`,
};

const CUSTOM_SHAPE = `<circle cx="24" cy="24" r="15" fill="#c9925a"/><text x="24" y="32" text-anchor="middle" font-size="21" font-weight="700" font-family="Georgia, 'Times New Roman', serif" fill="#4a3720" stroke="none">?</text>`;

function itemIconSvg(id: string, size: number): string {
  const inner = isCustomItem(id) ? CUSTOM_SHAPE : (SHAPES[id] ?? `<circle cx="24" cy="24" r="12" fill="#c9925a"/>`);
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="#4a3720" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function bigBackpackSvg(width: number): string {
  const height = Math.round((width * 236) / 240);
  return `<svg width="${width}" height="${height}" viewBox="0 0 240 236" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="120" cy="216" rx="82" ry="13" fill="rgba(0,0,0,.13)"/>
    <path d="M84 60 C 72 100, 72 160, 92 202" stroke="#a9773f" stroke-width="11"/>
    <path d="M156 60 C 168 100, 168 160, 148 202" stroke="#a9773f" stroke-width="11"/>
    <path d="M64 108 Q64 74 100 70 L140 70 Q176 74 176 108 L176 186 Q176 208 152 208 L88 208 Q64 208 64 186 Z" fill="#cf9a63" stroke="#4a3720" stroke-width="4"/>
    <path d="M106 72 Q106 54 120 54 Q134 54 134 72" stroke="#4a3720" stroke-width="5"/>
    <path d="M66 104 Q66 84 102 82 L138 82 Q174 84 174 104 L174 134 Q174 148 158 148 L82 148 Q66 148 66 134 Z" fill="#bd8850" stroke="#4a3720" stroke-width="4"/>
    <line x1="120" y1="130" x2="120" y2="140" stroke="#4a3720" stroke-width="4"/>
    <rect x="110" y="140" width="20" height="18" rx="4" fill="#9a6b38" stroke="#4a3720" stroke-width="3"/>
    <path d="M92 162 Q92 154 104 154 L136 154 Q148 154 148 162 L148 194 Q148 202 138 202 L102 202 Q92 202 92 194 Z" fill="#c9925a" stroke="#4a3720" stroke-width="4"/>
    <path d="M92 168 L148 168" stroke="#4a3720" stroke-width="3"/>
  </svg>`;
}

/** A drawn backpack on grass with its packed items — one card for the print doc. */
export function backpackImageHtml(title: string, items: string[], maxItems: number): string {
  const slots = Array.from({ length: maxItems }).map((_, i) => {
    const id = items[i];
    const icon = id ? itemIconSvg(id, 30) : `<span style="color:#8a6a3e;font-size:18px;">—</span>`;
    const name = id ? esc(itemName(id)) : "";
    return `<div style="flex:1;background:rgba(255,255,255,.72);border:1px solid rgba(74,55,32,.25);border-radius:10px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;min-height:64px;justify-content:center;">${icon}<span style="font:500 11px/1.05 Georgia,serif;color:#3a2a1a;text-align:center;">${name}</span></div>`;
  }).join("");
  return `<div style="break-inside:avoid;">
    <div style="font:600 11px/1.2 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#a3451c;margin-bottom:6px;">${esc(title)}</div>
    <div style="background:linear-gradient(180deg,#d3dcb4,#c4cfa4);border:1px solid #cbb99d;border-radius:16px;padding:14px 12px;text-align:center;">
      ${bigBackpackSvg(150)}
      <div style="display:flex;gap:6px;margin-top:8px;">${slots}</div>
    </div></div>`;
}

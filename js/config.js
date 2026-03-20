// ═══════════════════════════════════════════════════════
// API KEYS — loaded from js/keys.js (gitignored)
// Fallback to empty strings if keys.js not loaded
// ═══════════════════════════════════════════════════════
if(typeof KIE_API_KEY === 'undefined') var KIE_API_KEY = localStorage.getItem('kie_api_key') || '';
if(typeof CLAUDE_API_KEY === 'undefined') var CLAUDE_API_KEY = localStorage.getItem('claude_api_key') || '';

// Helper: get active Claude key (keys.js → localStorage)
function getClaudeKey(){ return CLAUDE_API_KEY || localStorage.getItem('claude_api_key') || ''; }
function setClaudeKey(k){ localStorage.setItem('claude_api_key', k); CLAUDE_API_KEY = k; }

// ═══════════════════════════════════════════════════════
// REVENUE MODELS — per item type
// ═══════════════════════════════════════════════════════
// model: 'hourly' = rate/hour * hours/day * load * 30 days
//        'nightly' = rate/night * load * 30 days
//        'session' = rate/session * sessions_per_day * load * 30 days
//        'none' = no direct revenue (infra, prep, equipment)
const REVENUE_CONFIG = {
  // ── RACKET ──
  padel_std:      { model:'hourly', rate:4000 },
  padel_pano:     { model:'hourly', rate:5000 },
  padel_single:   { model:'hourly', rate:3000 },
  tennis_hard:    { model:'hourly', rate:4000 },
  tennis_grass:   { model:'hourly', rate:3500 },
  tennis_clay:    { model:'hourly', rate:3500 },
  // ── TEAM ──
  ice:            { model:'hourly', rate:20000 },
  football_5:     { model:'hourly', rate:6000 },
  football_7:     { model:'hourly', rate:10000 },
  football_11:    { model:'hourly', rate:15000 },
  football_indoor:{ model:'hourly', rate:8000 },
  basketball:     { model:'hourly', rate:4000 },
  volleyball:     { model:'hourly', rate:3000 },
  universal:      { model:'hourly', rate:5000 },
  // ── ATHLETICS ──
  workout_s:      { model:'none' },
  workout_m:      { model:'none' },
  workout_l:      { model:'none' },
  run_400:        { model:'hourly', rate:5000 },
  run_200:        { model:'none' },
  run_100:        { model:'none' },
  ocr_s:          { model:'session', rate:800, sessions:15 },
  ocr_l:          { model:'session', rate:800, sessions:15 },
  // ── FUN ──
  tribune:        { model:'none' },
  climb:          { model:'session', rate:800, sessions:20 },
  trampoline:     { model:'session', rate:600, sessions:30 },
  // ── GLAMPING ──
  glamp_dome_s:   { model:'nightly', rate:5000 },
  glamp_dome_m:   { model:'nightly', rate:7000 },
  glamp_aframe:   { model:'nightly', rate:7000 },
  glamp_modular:  { model:'nightly', rate:8000 },
  glamp_safari:   { model:'nightly', rate:6000 },
  // ── WELLNESS ──
  pool_indoor:    { model:'session', rate:800, sessions:40 },
  pool_outdoor:   { model:'session', rate:600, sessions:50 },
  hammam:         { model:'session', rate:2500, sessions:6 },
  sauna:          { model:'session', rate:2500, sessions:6 },
  banya:          { model:'session', rate:3000, sessions:6 },
  salt_room:      { model:'session', rate:1200, sessions:8 },
  // ── INFRA / PREP — no revenue ──
};

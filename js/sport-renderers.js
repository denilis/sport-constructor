// ═══════════════════════════════════════════════════════
// HANGAR INTERIOR EDITOR — SPORT OBJECT RENDERERS
// ═══════════════════════════════════════════════════════

// Draw functions: ctx, x, y — top-left corner in PIXELS; w, h — object size in PIXELS
// Each draws a recognizable top-down view with markings

const SPORT_DRAW = {
  // ── PADEL COURT (10×20m real) ──
  padel(ctx, x, y, w, h) {
    // Floor
    ctx.fillStyle='#1a5c3a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.strokeRect(x+2,y+2,w-4,h-4);
    // Glass walls (blue bands on short sides)
    ctx.fillStyle='rgba(100,180,255,.5)';
    ctx.fillRect(x,y,w,h*.15); ctx.fillRect(x,y+h*.85,w,h*.15);
    // Side glass partial
    ctx.fillRect(x,y,w*.06,h); ctx.fillRect(x+w*.94,y,w*.06,h);
    // Center net line
    ctx.strokeStyle='#fff'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke();
    // Service lines
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.7)';
    const sl=h*.25;
    ctx.strokeRect(x+w*.1,y+sl,w*.8,h-sl*2);
    // Center marks
    ctx.beginPath(); ctx.moveTo(x+w/2,y+h*.15); ctx.lineTo(x+w/2,y+h*.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2,y+h*.75); ctx.lineTo(x+w/2,y+h*.85); ctx.stroke();
    // Label
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(8,w*.11)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PADEL',x+w/2,y+h/2);
  },

  // ── TENNIS COURT (18×36m real) ──
  tennis(ctx, x, y, w, h, surface='hard') {
    const colors={hard:'#3369a1',grass:'#2d7a3e',clay:'#c4713b'};
    ctx.fillStyle=colors[surface]||colors.hard; ctx.fillRect(x,y,w,h);
    // Outer boundary
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    const mx=w*.08, my=h*.06;
    ctx.strokeRect(x+mx,y+my,w-mx*2,h-my*2);
    // Singles lines
    const sx=w*.17;
    ctx.beginPath(); ctx.moveTo(x+sx,y+my); ctx.lineTo(x+sx,y+h-my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-sx,y+my); ctx.lineTo(x+w-sx,y+h-my); ctx.stroke();
    // Net
    ctx.lineWidth=2.5; ctx.strokeStyle='#fff';
    ctx.beginPath(); ctx.moveTo(x+mx*.3,y+h/2); ctx.lineTo(x+w-mx*.3,y+h/2); ctx.stroke();
    // Service boxes
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.8)';
    const svy=h*.28;
    ctx.beginPath(); ctx.moveTo(x+sx,y+svy); ctx.lineTo(x+w-sx,y+svy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+sx,y+h-svy); ctx.lineTo(x+w-sx,y+h-svy); ctx.stroke();
    // Center service line
    ctx.beginPath(); ctx.moveTo(x+w/2,y+svy); ctx.lineTo(x+w/2,y+h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2,y+h/2); ctx.lineTo(x+w/2,y+h-svy); ctx.stroke();
    // Center mark
    ctx.beginPath(); ctx.moveTo(x+w/2,y+my); ctx.lineTo(x+w/2,y+my+h*.03); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2,y+h-my); ctx.lineTo(x+w/2,y+h-my-h*.03); ctx.stroke();
    // Label
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(9,w*.08)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('TENNIS',x+w/2,y+h/2);
  },

  // ── ICE ARENA ──
  ice(ctx, x, y, w, h) {
    // Ice surface (white-blue)
    ctx.fillStyle='#e8f0f8'; ctx.fillRect(x,y,w,h);
    // Rounded corners
    ctx.strokeStyle='#c00'; ctx.lineWidth=2;
    ctx.strokeRect(x+2,y+2,w-4,h-4);
    // Center red line
    ctx.strokeStyle='#c00'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke();
    // Blue lines
    ctx.strokeStyle='#0055a4'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y+h*.33); ctx.lineTo(x+w,y+h*.33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y+h*.67); ctx.lineTo(x+w,y+h*.67); ctx.stroke();
    // Center circle
    const cr=Math.min(w,h)*.12;
    ctx.strokeStyle='#0055a4'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,cr,0,Math.PI*2); ctx.stroke();
    // Center dot
    ctx.fillStyle='#0055a4'; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,3,0,Math.PI*2); ctx.fill();
    // Face-off circles
    const fcr=cr*.8;
    const spots=[[.25,.33],[.75,.33],[.25,.67],[.75,.67]];
    spots.forEach(([sx,sy])=>{
      ctx.strokeStyle='#c00'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(x+w*sx,y+h*sy,fcr,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#c00'; ctx.beginPath(); ctx.arc(x+w*sx,y+h*sy,2.5,0,Math.PI*2); ctx.fill();
    });
    // Goals (red rectangles)
    ctx.fillStyle='rgba(200,0,0,.3)';
    ctx.fillRect(x+w*.4,y+2,w*.2,h*.05);
    ctx.fillRect(x+w*.4,y+h-2-h*.05,w*.2,h*.05);
    // Label
    ctx.fillStyle='rgba(0,50,120,.8)'; ctx.font=`bold ${Math.max(9,w*.07)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('ICE ARENA',x+w/2,y+h/2);
  },

  // ── FOOTBALL (generic for 5×5, 7×7, 11×11, futsal) ──
  football(ctx, x, y, w, h) {
    ctx.fillStyle='#2d7a3e'; ctx.fillRect(x,y,w,h);
    const mx=w*.06, my=h*.06;
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.strokeRect(x+mx,y+my,w-mx*2,h-my*2);
    // Halfway line
    ctx.beginPath(); ctx.moveTo(x+mx,y+h/2); ctx.lineTo(x+w-mx,y+h/2); ctx.stroke();
    // Center circle
    const cr=Math.min(w,h)*.1;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,cr,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,2,0,Math.PI*2); ctx.fill();
    // Penalty areas
    const pw=w*.36, ph=h*.15;
    ctx.strokeRect(x+(w-pw)/2,y+my,pw,ph);
    ctx.strokeRect(x+(w-pw)/2,y+h-my-ph,pw,ph);
    // Goal areas
    const gw=w*.18, gh=h*.06;
    ctx.strokeRect(x+(w-gw)/2,y+my,gw,gh);
    ctx.strokeRect(x+(w-gw)/2,y+h-my-gh,gw,gh);
    // Goals
    ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.fillRect(x+(w-gw*.6)/2,y+my-h*.02,gw*.6,h*.02);
    ctx.fillRect(x+(w-gw*.6)/2,y+h-my,gw*.6,h*.02);
    // Label
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(9,w*.07)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('FOOTBALL',x+w/2,y+h/2);
  },

  // ── BASKETBALL (28×15m) ──
  basketball(ctx, x, y, w, h) {
    ctx.fillStyle='#c4823b'; ctx.fillRect(x,y,w,h);
    // Court outline
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    const mx=w*.04, my=h*.04;
    ctx.strokeRect(x+mx,y+my,w-mx*2,h-my*2);
    // Half court line
    ctx.beginPath(); ctx.moveTo(x+mx,y+h/2); ctx.lineTo(x+w-mx,y+h/2); ctx.stroke();
    // Center circle
    const cr=Math.min(w,h)*.1;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,cr,0,Math.PI*2); ctx.stroke();
    // 3-point arcs
    const arcR=Math.min(w,h)*.28;
    ctx.beginPath(); ctx.arc(x+w/2,y+my,arcR,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+w/2,y+h-my,arcR,1.15*Math.PI,1.85*Math.PI); ctx.stroke();
    // Free throw lanes (rectangles)
    const fw=w*.3, fh=h*.16;
    ctx.strokeRect(x+(w-fw)/2,y+my,fw,fh);
    ctx.strokeRect(x+(w-fw)/2,y+h-my-fh,fw,fh);
    // Backboards + hoops
    ctx.fillStyle='#fff';
    ctx.fillRect(x+w*.44,y+my,w*.12,2);
    ctx.fillRect(x+w*.44,y+h-my-2,w*.12,2);
    ctx.strokeStyle='#f60'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x+w/2,y+my+h*.04,h*.02,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+w/2,y+h-my-h*.04,h*.02,0,Math.PI*2); ctx.stroke();
    // Label
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(8,w*.08)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('BASKET',x+w/2,y+h/2);
  },

  // ── VOLLEYBALL (24×15m with zones) ──
  volleyball(ctx, x, y, w, h) {
    ctx.fillStyle='#d4a35a'; ctx.fillRect(x,y,w,h);
    // Court
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    const mx=w*.1, my=h*.1;
    ctx.strokeRect(x+mx,y+my,w-mx*2,h-my*2);
    // Net line
    ctx.lineWidth=2.5; ctx.strokeStyle='#fff';
    ctx.beginPath(); ctx.moveTo(x+mx*.3,y+h/2); ctx.lineTo(x+w-mx*.3,y+h/2); ctx.stroke();
    // Attack lines (3m from net)
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.7)';
    const al=h*.12;
    ctx.beginPath(); ctx.moveTo(x+mx,y+h/2-al); ctx.lineTo(x+w-mx,y+h/2-al); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+mx,y+h/2+al); ctx.lineTo(x+w-mx,y+h/2+al); ctx.stroke();
    // Label
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(8,w*.09)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('VOLLEY',x+w/2,y+h/2);
  },

  // ── UNIVERSAL COURT ──
  universal(ctx, x, y, w, h) {
    ctx.fillStyle='#4a7a5a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.strokeRect(x+3,y+3,w-6,h-6);
    ctx.beginPath(); ctx.moveTo(x+3,y+h/2); ctx.lineTo(x+w-3,y+h/2); ctx.stroke();
    const cr=Math.min(w,h)*.1;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,cr,0,Math.PI*2); ctx.stroke();
    // Multi-colored lines to show versatility
    ctx.strokeStyle='rgba(255,200,0,.5)'; ctx.lineWidth=1;
    ctx.strokeRect(x+w*.15,y+h*.15,w*.7,h*.7);
    ctx.strokeStyle='rgba(255,100,0,.5)';
    ctx.strokeRect(x+w*.2,y+h*.2,w*.6,h*.6);
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(8,w*.07)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('UNIVERSAL',x+w/2,y+h/2);
  },

  // ── RECEPTION ──
  reception(ctx, x, y, w, h) {
    ctx.fillStyle='#3a4a6a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#7a90c0'; ctx.lineWidth=1;
    ctx.strokeRect(x+1,y+1,w-2,h-2);
    // Desk shape
    ctx.fillStyle='#5a6a8a';
    ctx.fillRect(x+w*.15,y+h*.3,w*.7,h*.15);
    // Chairs
    ctx.fillStyle='#8a9aba';
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+w*(.25+i*.25),y+h*.65,Math.min(w,h)*.06,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font=`bold ${Math.max(7,w*.12)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('RECEPTION',x+w/2,y+h*.15);
  },

  // ── BAR / CAFE ──
  cafe(ctx, x, y, w, h) {
    ctx.fillStyle='#4a3528'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#8a6a50'; ctx.lineWidth=1;
    ctx.strokeRect(x+1,y+1,w-2,h-2);
    // Bar counter (L-shape)
    ctx.fillStyle='#6a5040';
    ctx.fillRect(x+w*.1,y+h*.15,w*.8,h*.1);
    ctx.fillRect(x+w*.1,y+h*.15,w*.08,h*.5);
    // Bar stools
    ctx.fillStyle='#9a8070';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x+w*(.25+i*.17),y+h*.38,Math.min(w,h)*.04,0,Math.PI*2);ctx.fill();}
    // Tables
    ctx.fillStyle='#7a6050';
    ctx.fillRect(x+w*.3,y+h*.6,w*.15,h*.15);
    ctx.fillRect(x+w*.6,y+h*.6,w*.15,h*.15);
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font=`bold ${Math.max(7,w*.12)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('BAR',x+w/2,y+h*.85);
  },

  // ── TRAMPOLINE PARK ──
  trampoline(ctx, x, y, w, h) {
    ctx.fillStyle='#2a2a4a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#5a5a8a'; ctx.lineWidth=1; ctx.strokeRect(x+1,y+1,w-2,h-2);
    // Trampoline pads (grid)
    const cols=3, rows=3, pad=w*.04;
    const cw=(w-pad*(cols+1))/cols, ch=(h-pad*(rows+1))/rows;
    for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){
      ctx.fillStyle=`hsl(${200+r*40+c*20},60%,50%)`;
      ctx.fillRect(x+pad+c*(cw+pad),y+pad+r*(ch+pad),cw,ch);
      ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.strokeRect(x+pad+c*(cw+pad),y+pad+r*(ch+pad),cw,ch);
    }}
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(7,w*.09)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('TRAMPOLINE',x+w/2,y+h/2);
  },

  // ── CLIMBING WALL ──
  climb(ctx, x, y, w, h) {
    ctx.fillStyle='#5a4a3a'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#8a7a6a'; ctx.lineWidth=1; ctx.strokeRect(x+1,y+1,w-2,h-2);
    // Wall sections
    for(let i=0;i<3;i++){
      ctx.fillStyle=`hsl(${30+i*15},40%,${35+i*5}%)`;
      ctx.fillRect(x+w*(.05+i*.32),y+h*.1,w*.28,h*.8);
    }
    // Holds (dots)
    ctx.fillStyle='#e8c840';
    for(let i=0;i<12;i++){
      const cx2=x+w*(.1+Math.random()*.8), cy2=y+h*(.15+Math.random()*.7);
      ctx.beginPath(); ctx.arc(cx2,cy2,Math.min(w,h)*.025,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font=`bold ${Math.max(7,w*.1)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('CLIMB',x+w/2,y+h*.08);
  },

  // ── DEFAULT (generic box) ──
  default(ctx, x, y, w, h, label) {
    ctx.fillStyle='#3a4050'; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#6a7080'; ctx.lineWidth=1; ctx.strokeRect(x+1,y+1,w-2,h-2);
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font=`bold ${Math.max(7,Math.min(w*.1,h*.15))}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label||'?',x+w/2,y+h/2);
  }
};

// Map catalog item id -> draw function + surface hint
function getDrawFunc(itemId){
  if(itemId.startsWith('padel')) return (ctx,x,y,w,h)=>SPORT_DRAW.padel(ctx,x,y,w,h);
  if(itemId==='tennis_hard') return (ctx,x,y,w,h)=>SPORT_DRAW.tennis(ctx,x,y,w,h,'hard');
  if(itemId==='tennis_grass') return (ctx,x,y,w,h)=>SPORT_DRAW.tennis(ctx,x,y,w,h,'grass');
  if(itemId==='tennis_clay') return (ctx,x,y,w,h)=>SPORT_DRAW.tennis(ctx,x,y,w,h,'clay');
  if(itemId==='ice') return SPORT_DRAW.ice;
  if(itemId.startsWith('football')||itemId==='football_indoor') return SPORT_DRAW.football;
  if(itemId==='basketball') return SPORT_DRAW.basketball;
  if(itemId==='volleyball') return SPORT_DRAW.volleyball;
  if(itemId==='universal') return SPORT_DRAW.universal;
  if(itemId==='reception') return SPORT_DRAW.reception;
  if(itemId==='cafe') return SPORT_DRAW.cafe;
  if(itemId==='trampoline') return SPORT_DRAW.trampoline;
  if(itemId==='climb') return SPORT_DRAW.climb;
  return null;
}

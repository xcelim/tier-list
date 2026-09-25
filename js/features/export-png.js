// Exportación de la tierlist actual como imagen PNG descargable.

// ============ EXPORT PNG ============
function expPNG(){
  const tl=S.workingTL;if(!tl)return;
  const TH=172,LW=120,W=1600;
  const canvas=document.createElement('canvas');
  canvas.width=W;canvas.height=52+(TH+3)*tl.tiers.length;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#12121a';ctx.fillRect(0,0,W,canvas.height);
  ctx.fillStyle='#e8e8f0';ctx.font='bold 22px sans-serif';ctx.textBaseline='middle';
  ctx.fillText(tl.title||'Tierlist',LW+10,26);
  const draw=async()=>{
    for(let i=0;i<tl.tiers.length;i++){
      const tier=tl.tiers[i];const y=50+(TH+3)*i;
      ctx.fillStyle=tier.color||'#888';ctx.fillRect(0,y,LW,TH);
      ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(tier.label||'?',LW/2,y+TH/2);ctx.textAlign='left';
      ctx.fillStyle='#1a1a26';ctx.fillRect(LW,y,W-LW,TH);
      ctx.strokeStyle='#2a2a45';ctx.lineWidth=1;ctx.strokeRect(0,y,W,TH);
      let cx=LW+4;
      for(const cid of tier.chars){
        const src=charImg(cid,tl);if(!src||cx+98>W)break;
        await new Promise(res=>{
          const im=new Image();im.crossOrigin='anonymous';
          im.onload=()=>{ctx.drawImage(im,cx,y+6,96,160);res();};
          im.onerror=()=>{
            const c=getChar(cid,tl);ctx.fillStyle='#2a2a45';ctx.fillRect(cx,y+6,96,160);
            ctx.fillStyle='#9090b0';ctx.font='7px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText((c&&c.name||'?').slice(0,10),cx+48,y+86);ctx.textAlign='left';res();
          };im.src=src;
        });cx+=102;
      }
    }
    ctx.fillStyle='#3a3a60';ctx.font='11px sans-serif';ctx.textBaseline='bottom';
    ctx.fillText('AnimeTier \u2014 '+tl.title,8,canvas.height-4);
    const a=document.createElement('a');a.href=canvas.toDataURL('image/png');
    a.download=(tl.title||'tierlist').replace(/[^a-z0-9]/gi,'_')+'.png';a.click();toast('PNG exportado \u2713');
  };draw();
}


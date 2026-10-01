
import * as THREE from "three";
import {LEVELS,WORLDS,CANNONS,MOBS,CHAMPIONS,MISSIONS} from "./content.js";

const $=q=>document.querySelector(q), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SAVE="crowdDominionSave";
const S={
 version:10,screen:"splash",level:1,coins:900,gems:55,cards:12,base:1,cannon:1,mob:1,champion:1,
 wins:0,gatesPassed:0,routeSections:0,champDeploys:0,bossWins:0,stars:0,score:0,shots:0,damage:0,combo:0,perfectGates:0,nearMisses:0,
 army:14,fortress:180,progress:0,aim:.5,route:0,championActive:false,abilityCd:0,
 abilityReady:true,phase:"run",running:false,time:0,dailyClaimed:false,reducedFx:false,quality:"auto",tutorialDone:false,
 selectedCannon:0,selectedMob:0,selectedChampion:0
};
try{Object.assign(S,JSON.parse(localStorage.getItem(SAVE)||"{}"))}catch{}
function save(){S.version=10;localStorage.setItem(SAVE,JSON.stringify(S))}
const QUALITY={auto:1,high:1.7,medium:1.25,low:0.9};
function applyQuality(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,QUALITY[S.quality]||1.25));}

const audio={
 ctx:null,on:true,
 init(){if(this.ctx||!this.on)return;const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C()},
 tone(f,d=.1,t="sine",g=.7,slide=0){if(!this.ctx||!this.on)return;const n=this.ctx.currentTime,o=this.ctx.createOscillator(),a=this.ctx.createGain();o.type=t;o.frequency.setValueAtTime(f,n);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),n+d);a.gain.setValueAtTime(.0001,n);a.gain.exponentialRampToValueAtTime(.06*g,n+.006);a.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(a).connect(this.ctx.destination);o.start(n);o.stop(n+d+.02)},
 click(){this.tone(360,.05)},fire(){this.tone(70,.08,"sawtooth",1,190)},gate(x){this.tone(x>=3?760:440,.15,"triangle",1,x*70)},
 impact(){this.tone(120,.09,"square",.7,-60)},boost(){this.tone(220,.12,"sawtooth",.8,480)},
 champion(){this.tone(260,.13,"triangle",1,520);setTimeout(()=>this.tone(680,.16,"triangle",.8,180),80)},
 win(){[520,660,820,1040].forEach((f,i)=>setTimeout(()=>this.tone(f,.14,"triangle",1,80),i*80))},
 boss(){this.tone(85,.45,"sawtooth",1,140)},danger(){this.tone(145,.12,"square",.8,-70)}
};

const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(48,1,.1,150);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,QUALITY[S.quality]||1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;
$("#game").appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x52665a,2.25));
const sun=new THREE.DirectionalLight(0xffefd2,3.4);sun.position.set(-7,14,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const world=new THREE.Group(),crowd=new THREE.Group(),fx=new THREE.Group();scene.add(world,crowd,fx);

const crowdBody=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.115,.23,4,8),new THREE.MeshStandardMaterial({color:0x37b4e8,roughness:.7}),420);
const crowdHead=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshStandardMaterial({color:0xf1c7a3,roughness:.8}),420);
crowdBody.castShadow=crowdHead.castShadow=true;crowd.add(crowdBody,crowdHead);
const dummy=new THREE.Object3D();

let cannon,fortress,champion,gates=[],splits=[],boosts=[],obstacles=[],enemies=[],last=performance.now(),fireT=0,down=false,shake=0;
let rewardCards=[],rewardRevealIndex=-1,levelMapPulse=0,bootTimer=null;

function mat(c,r=.72,m=.05){return new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m})}
function box(x,y,z,w,h,d,c,p=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m}
function sphere(x,y,z,r,c,p=world){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat(c));m.position.set(x,y,z);m.castShadow=true;p.add(m);return m}
function cyl(x,y,z,r,h,c,p=world){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18),mat(c,.5,.2));m.position.set(x,y,z);m.castShadow=true;p.add(m);return m}
function label(str,col="#fff",scale=.65){
 const c=document.createElement("canvas"),g=c.getContext("2d");c.width=512;c.height=128;g.font="900 72px Arial";g.textAlign="center";g.textBaseline="middle";g.lineWidth=14;g.strokeStyle="#172033";g.strokeText(str,256,64);g.fillStyle=col;g.fillText(str,256,64);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(2.5*scale,.62*scale,1);return s
}
function clear(g){while(g.children.length)g.remove(g.children[0])}
function palette(){return WORLDS[LEVELS[S.level-1].world-1]}
function selectedCannon(){return CANNONS[S.selectedCannon%CANNONS.length]}
function selectedMob(){return MOBS[S.selectedMob%MOBS.length]}
function selectedChampion(){return CHAMPIONS[S.selectedChampion%CHAMPIONS.length]}

function buildRoad(){
 const p=palette();box(0,-.35,-20,6.6,.7,54,p.road);box(-3.4,.02,-20,.4,.3,54,p.edge);box(3.4,.02,-20,.4,.3,54,p.edge);
 for(let z=1;z>-52;z-=3){box(-1.65,.04,z,.05,.06,1.7,0xffffff);box(1.65,.04,z,.05,.06,1.7,0xffffff)}
 for(let i=0;i<42;i++){const side=i%2?1:-1,x=side*(3.9+Math.random()*2.1),z=-Math.random()*49;cyl(x,.35,z,.13,.65,p.edge);sphere(x,1.0,z,.45,p.accent)}
}
function buildCannon(){
 cannon=new THREE.Group();cannon.position.set(0,.85,6.4);cannon.userData.baseY=.85;
 box(0,0,0,1.9,.48,1.2,0x26394b,cannon);sphere(-.62,.24,0,.27,0x527d92,cannon);sphere(.62,.24,0,.27,0x527d92,cannon);
 const b=new THREE.Mesh(new THREE.CylinderGeometry(.24,.34,2.4,18),mat(selectedCannon().color,.38,.55));b.rotation.x=Math.PI/2;b.position.set(0,.5,-.9);b.name="barrel";b.castShadow=true;cannon.add(b);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.68,.12,10,26),mat(palette().accent,.35,.55));ring.rotation.x=Math.PI/2;ring.position.y=.25;cannon.add(ring);world.add(cannon)
}
function buildFortress(){
 fortress=new THREE.Group();fortress.position.set(0,.2,-46);const p=palette();
 box(0,.8,0,5,1.4,2.5,p.edge,fortress);box(-1.7,1.9,0,1.05,3,1.3,0x718ca5,fortress);box(1.7,1.9,0,1.05,3,1.3,0x718ca5,fortress);
 box(0,3.1,0,1.6,1,1.25,p.accent,fortress);box(0,.9,1,.7,1.1,.2,0x293649,fortress);world.add(fortress)
}
function buildGate(d){
 const g=new THREE.Group();g.position.set(d.lane*2.1,.9,d.z);g.userData=d;for(const x of [-1.32,1.32])box(x,0,0,.18,1.8,.3,0x4a566e,g);
 box(0,1,0,2.95,.24,.3,d.value<0?0xd4505c:d.value>=3?0x409fe8:0x46b87c,g);
 const t=label(d.value<0?d.value:"x"+d.value,d.value<0?"#ffb1b1":"#fff",.72);t.position.set(0,1.55,.02);g.add(t);world.add(g);gates.push(g)
}
function buildSplit(d){
 const g=new THREE.Group();g.position.set(d.lane*1.7,.04,d.z);g.userData=d;box(0,.04,0,2.9,.07,1.1,d.kind==="split"?0x52cde0:0xf0c05a,g);
 const t=label(d.kind==="split"?"SPLIT":"MERGE",d.kind==="split"?"#a9f5ff":"#fff0a5",.48);t.position.set(0,.2,0);g.add(t);world.add(g);splits.push(g)
}
function buildBoost(d){
 const g=new THREE.Group();g.position.set(d.lane*2.1,.05,d.z);g.userData=d;box(0,.03,0,1.4,.06,1.05,0x43d79a,g);
 for(let i=-1;i<=1;i++)box(i*.35,.1,0,.17,.03,.55,0xf6e56c,g);world.add(g);boosts.push(g)
}
function buildObstacle(d){
 const g=new THREE.Group();g.position.set(d.lane*1.25,.55,d.z);g.userData=d;box(0,.4,0,1.2,.8,.8,0x414855,g);box(0,.84,0,.8,.08,.65,d.moving?0xe27251:0x616977,g);world.add(g);obstacles.push(g)
}
function buildEnemy(d){
 const g=new THREE.Group();g.position.set(0,.1,d.z);g.userData=d;const n=d.kind==="boss"?36:d.kind==="heavy"?28:20, color=d.kind==="shield"?0xb6c7d9:palette().enemy;
 for(let i=0;i<n;i++){const u=new THREE.Mesh(new THREE.CapsuleGeometry(d.kind==="boss"?.14:.11,d.kind==="boss"?.28:.22,4,8),mat(color));u.position.set((i%7-3)*.25,.22+(i%3)*.05,(Math.floor(i/7)-2)*.24);u.castShadow=true;g.add(u)}
 const t=label(d.power,d.kind==="boss"?"#ffd65c":"#fff",d.kind==="boss"?.58:.43);t.position.y=1.45;g.add(t);
 if(d.kind==="boss"){const b=label("BOSS","#ffd65c",.38);b.position.y=2.05;g.add(b)}
 world.add(g);enemies.push(g)
}
function setupBattle(){
 applyQuality();
 clear(world);clear(fx);gates=[];splits=[];boosts=[];obstacles=[];enemies=[];champion=null;
 const l=LEVELS[S.level-1];scene.background.set(palette().sky);camera.position.set(0,7.5,9.8);camera.lookAt(0,1,-10);
 buildRoad();buildCannon();buildFortress();l.gates.forEach(buildGate);l.splits.forEach(buildSplit);l.boosts.forEach(buildBoost);l.obstacles.forEach(buildObstacle);l.enemies.forEach(buildEnemy);
 S.army=l.start+S.mob*2;S.fortress=l.fortress;S.score=0;S.shots=0;S.damage=0;S.combo=0;S.perfectGates=0;S.nearMisses=0;S.progress=0;S.aim=.5;S.route=0;S.phase="run";S.running=true;S.time=0;S.championActive=false;S.abilityCd=0;S.abilityReady=true
}
function setupHome(){
 clear(world);clear(fx);clear(crowd);scene.background.set(WORLDS[0].sky);camera.position.set(0,8.4,11);camera.lookAt(0,1,-9);
 box(0,-.25,-8,7,.5,24,WORLDS[0].edge);box(0,0,-8,3.7,.06,20,WORLDS[0].road);
 for(let i=0;i<28;i++)sphere((i%2?1:-1)*(3.3+Math.random()*2),.8,-Math.random()*22,.45,WORLDS[0].edge);
 const b=new THREE.Group();b.position.z=-14;box(0,.8,0,5,1.6,2.6,0x526d83,b);box(-1.7,2,0,1.1,2.8,1.3,0x7894a6,b);box(1.7,2,0,1.1,2.8,1.3,0x7894a6,b);box(0,3,0,1.6,1.05,1.25,WORLDS[0].accent,b);world.add(b);S.running=false
}
function fire(){
 if(!S.running)return;S.shots++;S.score+=2;audio.init();const c=selectedCannon();S.army+=Math.max(1,Math.floor(c.power*(1+S.cannon*.05)));audio.fire();shake=Math.min(.1,shake+.025);
 cannon.scale.z=.92;setTimeout(()=>cannon&&(cannon.scale.z=1),55);spawnMuzzle()
}
function spawnMuzzle(){
 if(S.reducedFx)return;const p=new THREE.Vector3(cannon.position.x,1.0,5.1);for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),mat(selectedCannon().color));m.position.copy(p);m.userData.v=new THREE.Vector3((Math.random()-.5)*1.6,Math.random()*1.8,(Math.random()-.5)*1.6);m.userData.life=.25+Math.random()*.2;fx.add(m)}
}
function updateCrowd(dt){
 const n=Math.min(420,Math.max(0,Math.floor(S.army)));const mob=selectedMob();
 crowdBody.material.color.setHex(mob.color);
 for(let i=0;i<420;i++){
  if(i>=n){dummy.scale.set(0,0,0);dummy.updateMatrix();crowdBody.setMatrixAt(i,dummy.matrix);crowdHead.setMatrixAt(i,dummy.matrix);continue}
  const laneX=S.route*2.05,row=Math.floor(i/15),col=i%15;
  const density=Math.min(1.35,1+Math.max(0,n-80)/420);
  const bob=Math.sin(S.time*5+i*.7)*.025;
  const x=laneX+(col-7)*.18*density+Math.sin(S.time*3+i*.7)*.025;
  const z=-2.55-row*.22;
  dummy.position.set(x,.17+bob+(i%3)*.04,z);dummy.rotation.y=Math.sin(S.time*3+i)*.18;dummy.scale.setScalar(.72+(i%5)*.025);
  dummy.updateMatrix();crowdBody.setMatrixAt(i,dummy.matrix);
  dummy.position.y+=.28;dummy.scale.multiplyScalar(.78);dummy.updateMatrix();crowdHead.setMatrixAt(i,dummy.matrix);
 }
 crowdBody.instanceMatrix.needsUpdate=true;crowdHead.instanceMatrix.needsUpdate=true
}
function aim(dt){
 if(!cannon)return;cannon.position.x+=(S.aim-.5)*3.5-cannon.position.x*.18;cannon.position.y=cannon.userData.baseY+Math.sin(S.time*4)*.015;
 const b=cannon.getObjectByName("barrel");if(b)b.rotation.z+=(S.aim-.5)*.3-b.rotation.z*.18
}
function particle(pos,col,n=30,size=.055){
 if(S.reducedFx)return;for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(size,6,6),mat(col));m.position.copy(pos);m.userData.v=new THREE.Vector3((Math.random()-.5)*3,Math.random()*3.3,(Math.random()-.5)*3);m.userData.life=.35+Math.random()*.55;fx.add(m)}
}
function tickFx(dt){for(let i=fx.children.length-1;i>=0;i--){const m=fx.children[i];m.position.addScaledVector(m.userData.v,dt);m.userData.v.y-=5*dt;m.userData.life-=dt;m.scale.multiplyScalar(.94);if(m.userData.life<=0)fx.remove(m)}}
function moveWorld(){
 for(const g of gates){g.position.z=g.userData.z-S.progress*37;if(g.userData.moving)g.position.x=g.userData.lane*2.1+Math.sin(S.time*2+g.userData.z)*.7}
 for(const q of splits)q.position.z=q.userData.z-S.progress*37;
 for(const b of boosts){b.position.z=b.userData.z-S.progress*37;b.rotation.y+=.012}
 for(const o of obstacles){o.position.z=o.userData.z-S.progress*37;if(o.userData.moving)o.position.x=o.userData.lane*1.25+Math.sin(S.time*2.5+o.userData.z)*.85}
 for(const e of enemies)e.position.z=e.userData.z-S.progress*37;
 if(fortress)fortress.position.z=-46-S.progress*37
}
function gateTick(){
 for(const g of gates){const d=g.userData,z=g.position.z+S.progress*37;if(d.used||z<5.1||z>7)continue;d.used=true;
  if(Math.abs(S.route-d.lane)>.35){S.army=Math.max(1,S.army-Math.ceil(S.army*.1));S.combo=0;S.nearMisses++;audio.danger();toast("ROUTE MISSED");continue}
  if(d.value<0){S.army=Math.max(1,S.army+d.value);S.combo=0;S.score=Math.max(0,S.score-20);audio.danger();toast("DANGER GATE "+d.value);particle(g.position,0xe25462,30)}
  else{const old=S.army;S.army=Math.max(1,Math.round(S.army*d.value));S.gatesPassed++;S.combo++;S.score+=Math.round(20*d.value+S.combo*5);if(d.value>=3)S.perfectGates++;audio.gate(d.value);toast("x"+d.value+"  "+old+" → "+S.army);particle(g.position,d.value>=3?0xf5c746:0x55dff1,48)}
 }
}
function splitTick(){
 for(const q of splits){const d=q.userData,z=q.position.z+S.progress*37;if(d.used||z<5.1||z>7)continue;d.used=true;S.route=d.lane*.75+S.route*.25;S.routeSections++;toast(d.kind==="split"?"LANE SPLIT":"LANE MERGE");audio.click();particle(q.position,d.kind==="split"?0x5ad9ed:0xf2ca59,24)}
}
function boostTick(){
 for(const b of boosts){const d=b.userData,z=b.position.z+S.progress*37;if(d.used||z<5.1||z>7)continue;d.used=true;S.progress=Math.min(1,S.progress+.035);S.army+=Math.max(1,Math.floor(S.army*.05));audio.boost();toast("SPEED BOOST");particle(b.position,0x4be19c,30)}
}
function obstacleTick(){
 for(const o of obstacles){const d=o.userData,z=o.position.z+S.progress*37;if(d.used||z<5.1||z>7)continue;d.used=true;if(Math.abs(S.route-d.lane)<.36){const loss=Math.max(1,Math.floor(S.army*.08));S.army=Math.max(1,S.army-loss);audio.impact();toast("OBSTACLE IMPACT");particle(o.position,0xff9d62,24)}}
}
function enemyTick(){
 for(const e of enemies){const d=e.userData,z=e.position.z+S.progress*37;if(d.used||z<5||z>7)continue;d.used=true;
  const power=d.power*(1+d.tier*.2),player=S.army*(2+S.mob*.55)*selectedMob().power+(S.championActive?selectedChampion().power+S.champion*5:0);
  if(player>=power){S.army=Math.max(1,S.army-Math.max(1,Math.floor(power/(3+S.mob))));toast(d.kind==="boss"?"BOSS CRUSHED":"FORMATION BROKEN");particle(e.position,d.kind==="boss"?0xf6ca4d:0xffd56d,d.kind==="boss"?90:42);if(d.kind==="boss"){S.bossWins++;audio.boss()}}
  else{S.army=Math.max(0,S.army-Math.ceil(power/(2.2+S.mob)));toast("CROWD UNDER PRESSURE");audio.impact();particle(e.position,palette().enemy,35);if(S.army<=0)finish(false)}
 }
}
function championTick(dt){
 S.abilityCd=Math.max(0,S.abilityCd-dt);S.abilityReady=S.abilityCd<=0;if(!S.championActive){if(champion)world.remove(champion);champion=null;return}
 if(!champion){champion=new THREE.Group();const c=selectedChampion();sphere(0,.72,-5.8,.4,c.color,champion);sphere(0,1.2,-5.8,.2,0xf3c34e,champion);box(0,.85,-5.8,.6,.16,.28,c.color,champion);world.add(champion);audio.champion();particle(new THREE.Vector3(0,.8,-5.8),c.color,55)}
 champion.position.x+=(S.route*2.1-champion.position.x)*.08;champion.rotation.y+=.045
}
function fortressTick(dt){
 if(S.progress>.70&&S.army>0){const dealt=dt*(7+S.army*.21+S.mob*2.4+(S.championActive?selectedChampion().power*.18:0));S.fortress=Math.max(0,S.fortress-dealt);S.damage+=dealt;S.score+=Math.floor(dealt*.12)}
 if(fortress){const ratio=Math.max(0,S.fortress/LEVELS[S.level-1].fortress);fortress.scale.setScalar(.82+ratio*.18);S.phase=ratio<.3?"critical":ratio<.7?"assault":"run"}
 if(S.fortress<=0)finish(true)
}
function finish(win){
 if(!S.running)return;S.running=false;S.screen=win?"victory":"defeat";
 if(win){const r=120+S.level*32;S.coins+=r;S.cards+=2+Math.floor(S.level/3);S.wins++;S.stars++;rewardCards=generateRewardCards();rewardRevealIndex=-1;audio.win();particle(new THREE.Vector3(0,2,-8),0xf4c74e,100,.07)}
 save();render()
}
function generateRewardCards(){const out=[];for(let i=0;i<3;i++)out.push({rarity:Math.random()<.12?"EPIC":Math.random()<.35?"RARE":"COMMON",name:[...CANNONS,...MOBS,...CHAMPIONS][Math.floor(Math.random()*12)].name});return out}
function battleTick(dt){
 S.time+=dt;S.progress=Math.min(1,S.progress+dt*LEVELS[S.level-1].speed);if(down){fireT+=dt;const interval=Math.max(.16,.45-selectedCannon().rate*.08-S.cannon*.012);if(fireT>interval){fireT=0;fire()}}
 moveWorld();aim(dt);updateCrowd(dt);gateTick();splitTick();boostTick();obstacleTick();enemyTick();championTick(dt);fortressTick(dt);tickFx(dt);shake=Math.max(0,shake-dt*.7);
 if(S.time>8&&Math.floor(S.time)%4===0)save()
}

function toast(m){const t=$(".toast");t.textContent=m;t.classList.remove("hidden");clearTimeout(t.tm);t.tm=setTimeout(()=>t.classList.add("hidden"),1100)}
function topbar(){return `<div class="top"><div class="pill">💎 ${S.gems}</div><div class="season"><b>NEBULA FRONTIER</b><small>SEASON 01 • WORLD ${LEVELS[S.level-1].world}</small></div><div class="pill">🪙 ${S.coins}</div></div>`}

function render(){
 const h=$("#hud");h.innerHTML="";
 if(S.screen==="splash")renderSplash(h);
 else if(S.screen==="home")renderHome(h);
 else if(S.screen==="battle")renderBattle(h);
 else if(S.screen==="victory")renderVictory(h,true);
 else if(S.screen==="defeat")renderVictory(h,false);
 else if(S.screen==="map")renderMap(h);
 else if(S.screen==="collection")renderCollection(h);
 else if(S.screen==="settings")renderSettings(h);
 else renderMeta(h)
}

function renderSplash(h){
 setupHome();
 h.innerHTML=`<div class="splash"><div class="logoMark">✦</div><h1>CROWD DOMINION</h1><p>TACTICAL CROWD COMMAND</p><div class="loadingTrack"><i></i></div><small>VERSION 1.0 RC • OFFLINE READY</small></div>`;
 if(!bootTimer){bootTimer=setTimeout(()=>{S.screen="home";bootTimer=null;render()},1100)}
}

function renderHome(h){
 setupHome();h.innerHTML=topbar()+`<div class="baseBadge"><b>COMMAND BASE</b><span>LEVEL ${S.base}</span><em>POWER GRID ${Math.min(100,S.base*12)}%</em></div>
 <div class="upgradePeek"><b>${selectedCannon().name}</b><span>LV ${S.cannon}</span><button id="quick">🪙 ${100+S.cannon*85}</button></div>
 <button class="homeBattle" id="battle"><span>⚔</span><b>BATTLE</b><small>LEVEL ${S.level} • ${LEVELS[S.level-1].name}</small></button>
 <div class="homeNav"><button id="map">MAP</button><button id="collection">CARDS</button><button id="armory">ARMORY</button><button id="settings">SETTINGS</button></div>`;
 $("#battle").onclick=()=>{audio.init();S.screen="battle";setupBattle();render()};$("#quick").onclick=()=>upgrade("cannon");
 $("#map").onclick=()=>{S.screen="map";render()};$("#collection").onclick=()=>{S.screen="collection";render()};$("#armory").onclick=()=>{S.screen="armory";render()};$("#settings").onclick=()=>{S.screen="settings";render()}
}
function renderBattle(h){
 const l=LEVELS[S.level-1];
 h.innerHTML=`<div class="top battleHud"><div class="pill armyPill">0</div><div class="levelPill">WORLD ${l.world} • ${l.name}</div><div class="pill fortressPill">0</div></div>
 ${l.boss?'<div class="bossBar"><i></i></div>':''}
 <div class="phaseTag"></div><button class="champ" id="champ">${S.championActive?"★":"N"}</button><div class="aimHint">DRAG TO AIM • HOLD TO FIRE</div>`;
 $("#champ").onclick=()=>{audio.init();if(!S.championActive){S.championActive=true;S.champDeploys++;S.army+=4;toast(selectedChampion().name+" DEPLOYED")}else if(S.abilityReady){S.abilityCd=7;S.abilityReady=false;S.army+=8+S.champion*3;toast("SHOCKWAVE");audio.champion();particle(new THREE.Vector3(0,1,-7),selectedChampion().color,75,.07)}};
 updateHud()
}
function updateHud(){
 const a=$(".armyPill"),f=$(".fortressPill"),c=$("#champ"),p=$(".phaseTag");if(a)a.textContent=Math.max(0,Math.floor(S.army));if(f)f.textContent=Math.max(0,Math.ceil(S.fortress));
 if(c)c.textContent=!S.championActive?"N":S.abilityReady?"★":Math.ceil(S.abilityCd);if(p)p.textContent=S.phase==="critical"?"CRITICAL ASSAULT":S.phase==="assault"?"FORTRESS ASSAULT":"RUN";
 const b=$(".bossBar i");if(b)b.style.width=`${Math.max(0,S.fortress/LEVELS[S.level-1].fortress*100)}%`
}
function renderVictory(h,win){
 const rewards=rewardCards.map((r,i)=>`<div class="rewardCard ${i<=rewardRevealIndex?"revealed":""}" data-i="${i}"><b>${i<=rewardRevealIndex?r.rarity:"?"}</b><span>${i<=rewardRevealIndex?r.name:"REVEAL"}</span></div>`).join("");
 h.innerHTML=`<div class="modal"><div class="result"><div class="resultIcon">${win?"★":"!"}</div><h1>${win?"FORTRESS DESTROYED":"FORMATION LOST"}</h1><p>${win?`+${120+S.level*32} COINS • +${2+Math.floor(S.level/3)} CARDS`:`Rebuild your formation and retry.`}</p>${win?`<div class="battleStats"><span>SCORE<b>${Math.floor(S.score)}</b></span><span>SHOTS<b>${S.shots}</b></span><span>DAMAGE<b>${Math.floor(S.damage)}</b></span><span>PERFECT GATES<b>${S.perfectGates}</b></span></div><div class="rewardRow">${rewards}</div>`:""}<button class="homeBattle" id="next">${win?(rewardRevealIndex<2?"REVEAL REWARD":"NEXT LEVEL"):"RETRY"}</button></div></div>`;
 h.querySelector("#next").onclick=()=>{if(win&&rewardRevealIndex<2){rewardRevealIndex++;renderVictory(h,true);return}if(win){S.level=Math.min(20,S.level+1);S.screen="home"}else S.screen="battle";if(S.screen==="battle")setupBattle();render()}
}
function renderMap(h){
 setupHome();h.innerHTML=topbar()+`<div class="modal metaModal"><div class="metaWindow"><div class="metaHeader"><b>FRONTLINE MAP</b><span>${S.stars} ★</span></div><div class="levelMap">${LEVELS.map(l=>`<button class="${l.id<S.level?"done":l.id===S.level?"current":""}" data-level="${l.id}"><b>${l.id}</b><small>${l.boss?"BOSS":l.name.replace("FRONTLINE ","L")}</small></button>`).join("")}</div><button class="backBtn" id="back">BACK TO BASE</button></div></div>`;
 h.querySelector("#back").onclick=()=>{S.screen="home";render()};h.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>{const id=+b.dataset.level;if(id<=S.level){S.level=id;S.screen="battle";setupBattle();render()}else toast("LEVEL LOCKED")})
}
function renderCollection(h){
 setupHome();h.innerHTML=topbar()+`<div class="modal metaModal"><div class="metaWindow"><div class="metaHeader"><b>CARD COLLECTION</b><span>${S.cards} CARDS</span></div>
 <div class="collectionGrid">${[...CANNONS,...MOBS,...CHAMPIONS].map((x,i)=>`<div class="collectionCard" style="--c:#${x.color.toString(16).padStart(6,"0")}"><div class="cardOrb"></div><b>${x.name}</b><small>${i<4?"CANNON":i<8?"MOB":"CHAMPION"}</small><button data-card="${i}">SELECT</button></div>`).join("")}</div>
 <button class="backBtn" id="back">BACK TO BASE</button></div></div>`;
 h.querySelector("#back").onclick=()=>{S.screen="home";render()};
 h.querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{const i=+b.dataset.card;if(i<4)S.selectedCannon=i;else if(i<8)S.selectedMob=i-4;else S.selectedChampion=i-8;save();toast("CARD EQUIPPED")})
}
function renderSettings(h){
 setupHome();h.innerHTML=topbar()+`<div class="modal metaModal"><div class="metaWindow"><div class="metaHeader"><b>SETTINGS</b><span>v1.0 RC</span></div>
 <div class="settingsRow"><b>QUALITY</b><button id="quality">${S.quality.toUpperCase()}</button></div>
 <div class="settingsRow"><b>REDUCED VFX</b><button id="fx">${S.reducedFx?"ON":"OFF"}</button></div>
 <div class="settingsRow"><b>SOUND</b><button id="snd">${audio.on?"ON":"OFF"}</button></div>
 <div class="settingsRow"><b>RESET PROGRESS</b><button id="reset">RESET</button></div>
 <button class="backBtn" id="back">BACK TO BASE</button></div></div>`;
 h.querySelector("#quality").onclick=()=>{const q=["auto","high","medium","low"];S.quality=q[(q.indexOf(S.quality)+1)%q.length];applyQuality();save();render()};h.querySelector("#fx").onclick=()=>{S.reducedFx=!S.reducedFx;save();render()};h.querySelector("#snd").onclick=()=>{audio.on=!audio.on;render()};h.querySelector("#reset").onclick=()=>{localStorage.removeItem(SAVE);location.reload()};h.querySelector("#back").onclick=()=>{S.screen="home";render()}
}
function upgrade(k){const cost=k==="base"?100+S.base*110:100+S[k]*85;if(S.coins<cost){toast("NOT ENOUGH COINS");return}S.coins-=cost;S[k]++;save();audio.click();toast(k.toUpperCase()+" UPGRADED");render()}
function renderMeta(h){
 setupHome();let body="";
 if(S.screen==="armory")body=`<div class="metaGrid"><div class="metaCard"><b>${selectedCannon().name}</b><span>LV ${S.cannon}</span><button data-u="cannon">UPGRADE • ${100+S.cannon*85} 🪙</button></div><div class="metaCard"><b>${selectedMob().name}</b><span>LV ${S.mob}</span><button data-u="mob">UPGRADE • ${100+S.mob*85} 🪙</button></div><div class="metaCard"><b>${selectedChampion().name}</b><span>LV ${S.champion}</span><button data-u="champion">UPGRADE • ${100+S.champion*85} 🪙</button></div></div>`;
 else if(S.screen==="base")body=`<div class="metaCard wide"><b>COMMAND HALL • LEVEL ${S.base}</b><p>Expand your command network and unlock stronger systems.</p><div class="baseProgress"><i style="width:${Math.min(100,S.base*18)}%"></i></div><button data-u="base">UPGRADE • ${100+S.base*110} 🪙</button></div><div class="metaGrid"><div class="metaCard"><b>SHIELD TOWER</b><span>LV ${Math.max(1,S.base-1)}</span></div><div class="metaCard"><b>CARD FORGE</b><span>LV ${Math.max(1,S.base-2)}</span></div></div>`;
 else if(S.screen==="missions")body=`<div class="metaGrid">${MISSIONS.map(m=>{const v=m.id==="wins"?S.wins:m.id==="gates"?S.gatesPassed:m.id==="split"?S.routeSections:m.id==="champ"?S.champDeploys:S.bossWins;return `<div class="metaCard"><b>${m.label}</b><span>${Math.min(m.goal,v)}/${m.goal}</span><small>PROGRESS</small></div>`}).join("")}</div>`;
 else body=`<div class="metaGrid"><div class="metaCard wide"><b>DAILY DROP</b><p>+250 coins • +3 cards</p><button id="daily">${S.dailyClaimed?"CLAIMED":"CLAIM"}</button></div><div class="metaCard"><b>CARD CRATE</b><p>+10 cards</p><button id="crate">OPEN</button></div></div>`;
 const title={armory:"ARMORY",base:"COMMAND BASE",missions:"MISSIONS",shop:"SHOP"}[S.screen];
 h.innerHTML=`<div class="modal metaModal"><div class="metaWindow"><div class="metaHeader"><b>${title}</b><span>🪙 ${S.coins} • 💎 ${S.gems}</span></div>${body}<button class="backBtn" id="back">BACK TO BASE</button></div></div>`;
 h.querySelector("#back").onclick=()=>{S.screen="home";render()};h.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>upgrade(b.dataset.u));
 h.querySelector("#daily")?.addEventListener("click",()=>{if(S.dailyClaimed)return toast("ALREADY CLAIMED");S.dailyClaimed=true;S.coins+=250;S.cards+=3;save();render();toast("+250 COINS • +3 CARDS")});
 h.querySelector("#crate")?.addEventListener("click",()=>{S.cards+=10;save();render();toast("+10 CARDS")})
}

renderer.domElement.onpointerdown=e=>{if(S.screen!=="battle")return;audio.init();down=true;S.aim=clamp(e.clientX/innerWidth,.08,.92);fireT=.2;fire()};
renderer.domElement.onpointermove=e=>{if(down&&S.screen==="battle"){S.aim=clamp(e.clientX/innerWidth,.06,.94);S.route=clamp((S.aim-.5)*1.9,-.85,.85)}};
renderer.domElement.onpointerup=()=>down=false;renderer.domElement.onpointerleave=()=>down=false;renderer.domElement.onpointercancel=()=>down=false;addEventListener("visibilitychange",()=>{if(document.hidden)down=false});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}addEventListener("resize",resize);resize();render();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(S.screen==="battle"&&S.running){battleTick(dt);updateHud()}camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(S.screen==="battle"?7.5:8.4)+(Math.random()-.5)*shake;renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);

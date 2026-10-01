
export const WORLDS=[
 {id:1,name:"Verdant Frontier",sky:0xcce8dd,road:0xc9a77e,edge:0x5aaa68,accent:0x42c995,enemy:0xe25260},
 {id:2,name:"Ember Mesa",sky:0xe9d2a9,road:0xd19d5e,edge:0x965c3d,accent:0xf2a545,enemy:0xf05b4d},
 {id:3,name:"Frostline",sky:0xc8d9ea,road:0x849bb9,edge:0x536b9a,accent:0x5cd8ef,enemy:0xa95e78},
 {id:4,name:"Violet Ruins",sky:0xdac5df,road:0xb77779,edge:0x70435e,accent:0xd46aff,enemy:0xe25a77}
];

const PATTERNS=[
 [[-.56,2],[.56,2.5],[0,-8],[.56,3],[-.56,1.8]],
 [[.56,2.2],[-.56,1.7],[0,-10],[-.56,3.1],[.56,2.3]],
 [[0,2.4],[-.56,2.8],[.56,2.2],[0,-11],[-.56,3.5]],
 [[-.56,3],[.56,2.4],[-.56,2.6],[.56,3.2],[0,-10],[.56,4]]
];

export const CANNONS=[
 {id:"star",name:"STAR CANNON",rate:1,power:1,color:0x55d9ee},
 {id:"ember",name:"EMBER CANNON",rate:.88,power:1.22,color:0xff9a4d},
 {id:"flux",name:"FLUX CANNON",rate:.72,power:1.55,color:0xc18aff},
 {id:"nova",name:"NOVA CANNON",rate:.6,power:2.0,color:0xffdc5a}
];
export const MOBS=[
 {id:"arc",name:"ARC MOB",power:1,color:0x37b4e8},
 {id:"ember",name:"EMBER MOB",power:1.3,color:0xff7d56},
 {id:"frost",name:"FROST MOB",power:1.65,color:0x7ee7ff},
 {id:"violet",name:"VIOLET MOB",power:2.05,color:0xb877ff}
];
export const CHAMPIONS=[
 {id:"nova",name:"NOVA",power:20,color:0xd78cff},
 {id:"atlas",name:"ATLAS",power:28,color:0xffc35c},
 {id:"volt",name:"VOLT",power:34,color:0x5ee7ff},
 {id:"warden",name:"WARDEN",power:42,color:0x8be39c}
];

export function makeLevel(i){
 const id=i+1, world=Math.floor(i/5)+1, boss=id%5===0;
 const gates=PATTERNS[i%4].map((v,k)=>({
   z:-7-k*4.2-(i%2)*.4,lane:v[0],value:v[1],width:k%3===1?.68:.84,
   moving:(k+i)%3===2,used:false
 }));
 if(i%3===1)gates.splice(2,0,{z:-15,lane:0,value:-Math.round(8+i*1.5),width:.78,moving:false,used:false});
 const splits=[];
 if(i>=1)splits.push({z:-12,lane:i%2?-.56:.56,kind:"split",used:false});
 if(i>=5)splits.push({z:-22,lane:0,kind:"merge",used:false});
 if(i>=10)splits.push({z:-32,lane:i%2?.56:-.56,kind:"split",used:false});
 const boosts=i>=2?[{z:-18,lane:i%2?-.56:.56,used:false}]:[];
 const obstacles=Array.from({length:3+i%4},(_,k)=>({
   z:-10-k*3.8,lane:(k+i)%2?-.56:.56,moving:k%3===0,used:false
 }));
 const enemies=[
  {z:-19,power:25+i*9,tier:i>=8?2:1,kind:"basic",used:false},
  {z:-29,power:43+i*13,tier:i>=6?2:1,kind:i%3===0?"shield":"basic",used:false}
 ];
 if(i>=8)enemies.push({z:-38,power:66+i*16,tier:2,kind:"heavy",used:false});
 if(boss)enemies.push({z:-45,power:115+i*22,tier:3,kind:"boss",used:false});
 const waves = [
   {at:.58, count:1 + (i%3), kind:i>=10?"elite":"basic"},
   {at:.72, count:1 + (i%2), kind:i>=12?"heavy":"basic"}
 ];
 return {
   id,world,name:boss?`CITADEL ${id}`:`FRONTLINE ${id}`,start:12+i*3,waves,
   fortress:180+i*60,boss,speed:.058+Math.min(.022,i*.0017),
   gates,splits,boosts,obstacles,enemies
 };
}
export const LEVELS=Array.from({length:20},(_,i)=>makeLevel(i));

export const MISSIONS=[
 {id:"wins",label:"WIN 3 BATTLES",goal:3},
 {id:"gates",label:"PASS 10 POSITIVE GATES",goal:10},
 {id:"split",label:"USE 5 ROUTE SECTIONS",goal:5},
 {id:"champ",label:"DEPLOY CHAMPION 2 TIMES",goal:2},
 {id:"boss",label:"DEFEAT 1 BOSS",goal:1}
];

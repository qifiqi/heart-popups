import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

/* ─────────────────── CONFIG ─────────────────── */
const JELLY = [
  { pos:[ 0,  1.5,  0], s:1.30, c:[.05,.55,.95], spd:.70 },
  { pos:[-4, -0.5, -4], s:.85,  c:[.95,.35,.70], spd:1.00 },
  { pos:[ 3.5, 0,  -6], s:1.00, c:[.55,.25,.95], spd:.85  },
  { pos:[-2, -2,   -9], s:.60,  c:[.00,.85,.70], spd:1.10 },
  { pos:[ 5,  2.5, -3], s:.50,  c:[1.0,.55,.15], spd:1.15 },
];

/* ─────────────────── GLOBALS ─────────────────── */
let renderer, scene, camera, composer;
const jellyfishes = [];
let particles;
const clock  = new THREE.Clock();
const mouse  = new THREE.Vector2();
const mWorld = new THREE.Vector3();
let clickT   = -10;
let animId   = 0;

/* ═══════════════════ SHADERS ═══════════════════ */

/* ---- bell ---- */
const BELL_VS = `
uniform float uTime;
attribute float aH;
varying vec3  vN, vWPos;
varying vec3  vView;
varying float vH;
void main(){
  vH = aH;
  vN = normalize(normalMatrix * normal);
  float pulse = sin(uTime*1.8 + aH*3.14)*.06;
  float brth  = sin(uTime*.8)*.04;
  float noise = sin(position.x*3.0+uTime)*cos(position.z*3.0+uTime*.7)*.015;
  vec3 d = position + normal * ((pulse+brth)*(1.0-aH*.6) + noise);
  vec4 wp = modelMatrix * vec4(d,1.0);
  vWPos = wp.xyz;
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const BELL_FS = `
uniform vec3  uColor;
uniform float uTime, uOpacity;
varying vec3  vN, vWPos, vView;
varying float vH;
void main(){
  float fresnel = pow(1.0-max(dot(vView,vN),0.0),3.0);
  float band    = sin(vH*15.0+uTime*.5)*.5+.5;
  float shift   = sin(fresnel*5.0+uTime*.6+vH*4.0)*.5+.5;
  vec3 c1=uColor, c2=vec3(uColor.g,uColor.b,uColor.r);
  vec3 iri = mix(c1,c2,shift*.35);
  float sss = max(dot(vView,-vN),0.0)*.3;
  iri += uColor*sss;
  float pg = sin(uTime*1.5+vH*6.28)*.5+.5;
  iri += uColor*pg*.15;
  float a = mix(.08,.55,fresnel)*uOpacity + pg*.05;
  vec3 emi = uColor*fresnel*.8;
  gl_FragColor = vec4(iri+emi, clamp(a,0.0,0.7));
}`;

/* ---- tentacle ---- */
const TENT_VS = `
attribute float aA;
varying float vA;
void main(){ vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const TENT_FS = `
uniform vec3 uColor;
uniform float uTime;
varying float vA;
void main(){
  float g=.5+.5*sin(uTime*2.0+gl_FragCoord.y*.01);
  gl_FragColor=vec4(uColor*(.6+g*.4), vA*.45);
}`;

/* ---- particles ---- */
const PART_VS = `
attribute float aSz, aPh;
uniform float uTime, uPR;
uniform vec3  uMW;
uniform float uCT;
varying float vA;
varying vec3  vC;
void main(){
  vec3 p=position;
  p.y+=sin(uTime*.25+aPh)*.6;
  p.x+=cos(uTime*.18+aPh*1.3)*.4;
  p.z+=sin(uTime*.15+aPh*.7)*.3;
  float dt=uTime-uCT;
  if(dt<3.0 && dt>0.0){
    vec3 d=p-uMW;
    float l=length(d);
    float imp=exp(-l*.3)*exp(-dt*.8)*2.0;
    p+=normalize(d+.001)*imp;
  }
  vA=.2+.8*(sin(uTime*1.8+aPh*3.0)*.5+.5);
  vC=mix(vec3(.3,.7,1.0),vec3(.2,1.0,.8),sin(aPh*2.0)*.5+.5);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  gl_PointSize=aSz*uPR*(180.0/-mv.z);
  gl_Position=projectionMatrix*mv;
}`;

const PART_FS = `
varying float vA;
varying vec3  vC;
void main(){
  float d=length(gl_PointCoord-.5);
  if(d>.5)discard;
  float g=pow(1.0-d*2.0,1.5);
  gl_FragColor=vec4(vC, g*vA*.5);
}`;

/* ═══════════════════ GEOMETRY ═══════════════════ */

function bellGeometry(){
  const P = [
    [.001,1.10],[.12,1.08],[.35,1.00],[.60,.85],
    [.82,.60],[.95,.35],[1.0,.10],[.97,-.05],[.90,-.18],[.80,-.28]
  ];
  const geo = new THREE.LatheGeometry(P.map(p=>new THREE.Vector2(p[0],p[1])),64);
  const pos = geo.attributes.position;
  const h   = new Float32Array(pos.count);
  let lo=1e9,hi=-1e9;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<lo)lo=y;if(y>hi)hi=y;}
  const r=hi-lo||1;
  for(let i=0;i<pos.count;i++) h[i]=(pos.getY(i)-lo)/r;
  geo.setAttribute('aH',new THREE.BufferAttribute(h,1));
  return geo;
}

function ribbonGeo(seg,len,w0,w1){
  const vn=(seg+1)*2, pos=new Float32Array(vn*3), al=new Float32Array(vn), idx=[];
  for(let i=0;i<=seg;i++){
    const t=i/seg, y=-t*len, w=w0+(w1-w0)*t;
    pos[i*6]=-w; pos[i*6+1]=y; pos[i*6+2]=0;
    pos[i*6+3]=w;  pos[i*6+4]=y; pos[i*6+5]=0;
    al[i*2]=1-t*.8; al[i*2+1]=1-t*.8;
  }
  for(let i=0;i<seg;i++){
    const a=i*2,b=a+1,c=a+2,d=a+3;
    idx.push(a,c,b, b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('aA',new THREE.BufferAttribute(al,1));
  g.setIndex(idx);
  return g;
}

/* ═══════════════ JELLYFISH FACTORY ═══════════════ */

function makeJelly(cfg){
  const {pos,s:sc,c,col:color,spd} = cfg;
  const clr  = new THREE.Color(...cfg.c);
  const grp  = new THREE.Group();
  grp.position.set(...cfg.pos);
  grp.scale.setScalar(cfg.s);

  /* bell */
  const bGeo = bellGeometry();
  const bMat = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uColor:{value:clr},uOpacity:{value:1}},
    vertexShader:BELL_VS, fragmentShader:BELL_FS,
    transparent:true, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending
  });
  grp.add(new THREE.Mesh(bGeo,bMat));

  /* glow core */
  const gm = new THREE.Mesh(
    new THREE.SphereGeometry(.25,16,16),
    new THREE.MeshBasicMaterial({color:clr,transparent:true,opacity:.3})
  );
  gm.position.y=.4;
  grp.add(gm);

  /* point light */
  const lt = new THREE.PointLight(clr,2,8);
  lt.position.y=.3;
  grp.add(lt);

  /* tentacles */
  const tents=[];
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2, r=.65+Math.random()*.15;
    const tl=1+Math.random()*1.5, seg=24;
    const sx=Math.cos(a)*r, sz=Math.sin(a)*r;
    const w0=.02+Math.random()*.015, w1=.003;
    const geo=ribbonGeo(seg,tl,w0,w1);
    const mat=new THREE.ShaderMaterial({
      uniforms:{uColor:{value:clr.clone().multiplyScalar(.8)},uTime:{value:0}},
      vertexShader:TENT_VS, fragmentShader:TENT_FS,
      transparent:true, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending
    });
    const m=new THREE.Mesh(geo,mat);
    m.position.set(sx,-.25,sz);
    grp.add(m);
    tents.push({geo,mat,seg,len:tl,sx,sz,w0,w1,
      ph:Math.random()*Math.PI*2, wf:.8+Math.random()*.8, wa:.15+Math.random()*.15});
  }

  /* oral arms */
  const arms=[];
  for(let i=0;i<4;i++){
    const a=(i/4)*Math.PI*2+Math.PI/4, r=.2+Math.random()*.1;
    const al=.5+Math.random()*.5, seg=16;
    const sx=Math.cos(a)*r, sz=Math.sin(a)*r;
    const geo=ribbonGeo(seg,al,.04,.008);
    const mat=new THREE.ShaderMaterial({
      uniforms:{uColor:{value:clr.clone().multiplyScalar(1.2)},uTime:{value:0}},
      vertexShader:TENT_VS, fragmentShader:TENT_FS,
      transparent:true, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending
    });
    const m=new THREE.Mesh(geo,mat);
    m.position.set(sx,-.2,sz);
    grp.add(m);
    arms.push({geo,mat,seg,len:al,sx,sz,w0:.04,w1:.008,
      ph:Math.random()*Math.PI*2, wf:1+Math.random()*.5, wa:.1+Math.random()*.1});
  }

  return {
    grp, bMat, gm, lt, tents, arms,
    spd:cfg.spd,
    base:new THREE.Vector3(...cfg.pos),
    off:new THREE.Vector3((Math.random()-.5)*4,(Math.random()-.5)*2,(Math.random()-.5)*4),
    ph:Math.random()*Math.PI*2
  };
}

function updateRib(d,t){
  const p=d.geo.attributes.position.array;
  for(let i=0;i<=d.seg;i++){
    const s=i/d.seg, y=-s*d.len;
    const w=d.w0+(d.w1-d.w0)*s;
    const wx=Math.sin(t*d.wf+s*4+d.ph)*d.wa*s*s+Math.sin(t*d.wf*.7+s*2.5+d.ph*1.3)*d.wa*.5*s;
    const wz=Math.cos(t*d.wf*.8+s*3.5+d.ph*.7)*d.wa*.7*s*s+Math.cos(t*d.wf*1.3+s*2+d.ph*2.1)*d.wa*.3*s;
    p[i*6]=wx-w; p[i*6+1]=y; p[i*6+2]=wz;
    p[i*6+3]=wx+w; p[i*6+4]=y; p[i*6+5]=wz;
  }
  d.geo.attributes.position.needsUpdate=true;
}

/* ═══════════════ PARTICLES ═══════════════ */

function makeParticles(n){
  const pos=new Float32Array(n*3), sz=new Float32Array(n), ph=new Float32Array(n);
  for(let i=0;i<n;i++){
    pos[i*3]=(Math.random()-.5)*40; pos[i*3+1]=(Math.random()-.5)*25; pos[i*3+2]=(Math.random()-.5)*40;
    sz[i]=Math.random()*4+1; ph[i]=Math.random()*Math.PI*2;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('aSz',new THREE.BufferAttribute(sz,1));
  g.setAttribute('aPh',new THREE.BufferAttribute(ph,1));
  const m=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uPR:{value:Math.min(devicePixelRatio,2)},uMW:{value:new THREE.Vector3()},uCT:{value:-10}},
    vertexShader:PART_VS, fragmentShader:PART_FS,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  return new THREE.Points(g,m);
}

/* ═══════════════ INIT ═══════════════ */

function init(){
  const W=innerWidth, H=innerHeight, pr=Math.min(devicePixelRatio,2);
  const mobile = W<=768;

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('scene').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000814);
  scene.fog = new THREE.FogExp2(0x000814, .035);

  camera = new THREE.PerspectiveCamera(60, W/H, .1, 100);
  camera.position.set(0,2,12);
  camera.lookAt(0,0,0);

  /* post-processing */
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W,H),1.5,.5,.3));
  composer.addPass(new OutputPass());

  /* lights */
  scene.add(new THREE.AmbientLight(0x0a1628,.5));
  const dl=new THREE.DirectionalLight(0x4488cc,.4);
  dl.position.set(0,10,5);
  scene.add(dl);

  /* jellyfish */
  const count = mobile ? 3 : JELLY.length;
  for(let i=0;i<count;i++){
    const jf=makeJelly(JELLY[i]);
    jellyfishes.push(jf);
    scene.add(jf.grp);
  }

  /* particles */
  particles = makeParticles(mobile?400:800);
  scene.add(particles);

  /* events */
  addEventListener('mousemove', e=>{mouse.x=(e.clientX/innerWidth)*2-1; mouse.y=-(e.clientY/innerHeight)*2+1;});
  addEventListener('click',onClick);
  addEventListener('touchmove',e=>{if(e.touches[0]){const t=e.touches[0];mouse.x=(t.clientX/innerWidth)*2-1;mouse.y=-(t.clientY/innerHeight)*2+1;}},{passive:true});
  addEventListener('touchstart',onClick,{passive:true});
  addEventListener('resize',onResize);

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(animId);animId=0;}
    else if(!animId) animate();
  });

  const el=document.getElementById('loading');
  if(el) el.style.display='none';

  animate();
}

/* ═══════════════ INTERACTION ═══════════════ */

function onClick(e){
  const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  const ndc = new THREE.Vector2((cx/innerWidth)*2-1,-(cy/innerHeight)*2+1);
  const rc  = new THREE.Raycaster();
  rc.setFromCamera(ndc,camera);
  const plane = new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const hit   = new THREE.Vector3();
  if(rc.ray.intersectPlane(plane,hit)) mWorld.copy(hit);
  clickT = clock.getElapsedTime();
  if(particles){
    particles.material.uniforms.uMW.value.copy(mWorld);
    particles.material.uniforms.uCT.value = clickT;
  }
}

function onResize(){
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  composer.setSize(w,h);
  if(particles) particles.material.uniforms.uPR.value=Math.min(devicePixelRatio,2);
}

/* ═══════════════ ANIMATE ═══════════════ */

function animate(){
  animId=requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  const t =clock.getElapsedTime();

  /* project mouse to world z=0 for jelly targeting */
  const rc=new THREE.Raycaster();
  rc.setFromCamera(mouse,camera);
  const pl=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const tgt=new THREE.Vector3();
  rc.ray.intersectPlane(pl,tgt);

  for(const jf of jellyfishes){
    const tp=jf.base.clone().add(jf.off);
    tp.x+=Math.sin(t*.3+jf.ph)*1.5;
    tp.y+=Math.cos(t*.4+jf.ph*1.3)*.8;
    tp.z+=Math.sin(t*.2+jf.ph*.7)*1.0;
    tp.x+=(tgt.x-tp.x)*.03;
    tp.y+=(tgt.y-tp.y)*.03;

    jf.grp.position.lerp(tp,dt*jf.spd*.5);
    jf.grp.rotation.y+=dt*.1*Math.sin(t*.5+jf.ph);
    jf.grp.rotation.z=Math.sin(t*.3+jf.ph)*.05;

    jf.bMat.uniforms.uTime.value=t;
    jf.gm.material.opacity=.2+Math.sin(t*1.5+jf.ph)*.1;
    jf.lt.intensity=1.5+Math.sin(t*1.5+jf.ph)*.5;

    for(const d of jf.tents){d.mat.uniforms.uTime.value=t;updateRib(d,t);}
    for(const d of jf.arms){d.mat.uniforms.uTime.value=t;updateRib(d,t);}
  }

  if(particles) particles.material.uniforms.uTime.value=t;

  camera.position.x=Math.sin(t*.05)*.5;
  camera.position.y=2+Math.cos(t*.08)*.3;
  camera.lookAt(0,0,-2);

  composer.render();
}

/* ─── boot ─── */
init();

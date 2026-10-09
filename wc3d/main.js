import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as L from './lib.js';
import * as HUD from './hud.js';
import {buildTitle} from './scene_title.js';
import {buildHosts} from './scene_hosts.js';
import {buildNumbers} from './scene_numbers.js';
import {buildCities} from './scene_cities.js';
import {buildOpening} from './scene_opening.js';
import {buildFormat} from './scene_format.js';
import {buildFinal} from './scene_final.js';
import {buildOutro} from './scene_outro.js';

const W = 1280, H = 720;
const q = new URLSearchParams(location.search);
const only = q.get('scene');
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('gl'), antialias: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const FX = {
  uniforms: {tDiffuse: {value: null}, blur: {value: 0}, aberr: {value: 0}, flash: {value: 0}, fade: {value: 1}, time: {value: 0}, glitch: {value: 0}, dir: {value: new THREE.Vector2(1, 0.12)}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blur,aberr,flash,fade,time,glitch; uniform vec2 dir; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec2 uv=vUv;
    if(glitch>0.){ float row=floor(uv.y*38.+time*24.); float g=step(1.-glitch*0.5,h(vec2(row,floor(time*24.)))); uv.x+=g*(h(vec2(row,3.))-0.5)*0.12*glitch; }
    vec2 c=uv-0.5; float rad=length(c);
    vec2 ab=c*aberr*(0.4+rad);
    vec3 col=vec3(0.); float wsum=0.;
    for(int i=0;i<9;i++){
      float f=(float(i)/8.-0.5);
      vec2 o=dir*blur*f + c*blur*0.6*f;
      float w=1.-abs(f)*1.2;
      vec2 u=uv+o;
      col+=vec3(texture2D(tDiffuse,u+ab).r,texture2D(tDiffuse,u).g,texture2D(tDiffuse,u-ab).b)*w; wsum+=w;
    }
    col/=wsum;
    float lum=dot(col,vec3(0.299,0.587,0.114));
    col+=vec3(-0.012,0.006,0.03)*(1.-smoothstep(0.,0.6,lum))+vec3(0.03,0.012,-0.012)*smoothstep(0.4,1.4,lum);
    col*=1.-0.62*pow(rad*1.35,2.2);
    col+=(h(uv*vec2(1280.,720.)+time)-0.5)*0.035;
    col+=flash*vec3(1.,0.93,0.8)*(1.-rad*0.7);
    col*=fade;
    gl_FragColor=vec4(col,1.);
  }`,
};

async function init() {
  await Promise.all([L.loadFonts(), document.fonts.load('800 20px HudM', 'Ёё2026АаZz'), document.fonts.load('700 20px HudO', 'Ёё2026АаZz')]);
  const tl = await (await fetch('audio/timeline.json')).json();
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.035).texture;

  const builders = {title: buildTitle, hosts: buildHosts, numbers: buildNumbers, cities: buildCities, opening: buildOpening, format: buildFormat, final: buildFinal, outro: buildOutro};
  const CH = {hosts: ['02', 'ХОЗЯЕВА'], numbers: ['03', 'МАСШТАБ'], cities: ['04', 'ГОРОДА'], opening: ['05', 'ОТКРЫТИЕ'], format: ['06', 'ФОРМАТ'], final: ['07', 'ФИНАЛ']};
  const scenes = [];
  for (const s of tl.scenes) {
    if (!builders[s.name]) continue;
    s.chapter = CH[s.name]; scenes.push({meta: s, obj: builders[s.name](env, s)});
  }
  const rt = new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4});
  const composer = new EffectComposer(renderer, rt);
  const rp = new RenderPass(scenes[0].obj.scene, scenes[0].obj.camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.75, 0.55, 0.92);
  const fxp = new ShaderPass(FX);
  composer.addPass(rp); composer.addPass(bloom); composer.addPass(fxp); composer.addPass(new OutputPass());
  const out = document.getElementById('out'), octx = out.getContext('2d');
  const glc = document.getElementById('gl');

  window.TOTAL = tl.total; window.NFRAMES = Math.ceil(tl.total * 30);
  window.renderFrame = (t, jpeg = true) => {
    let sc = scenes[scenes.length - 1];
    for (const s of scenes) if (t < s.meta.start + s.meta.len) { sc = s; break; }
    if (only) { sc = scenes.find(s => s.meta.name === only) || sc; }
    const m = sc.meta, T = m.len, lt = only ? t : t - m.start;
    const P = m.phrases.map(p => ({t0: p.t0 - m.start, t1: p.t1 - m.start, caption: p.caption}));
    sc.obj.update(lt, T, P);
    // переход: whip + размытие + хроматика + вспышка вокруг стыков сцен
    const first = scenes[0] === sc, last = scenes[scenes.length - 1] === sc;
    const inn = first ? 0 : Math.pow(1 - L.prog(lt, 0, 0.55), 2.2);
    const outt = last ? 0 : Math.pow(L.prog(lt, T - 0.38, T), 2.0);
    const w = Math.max(inn, outt);
    const cam = sc.obj.camera;
    const off = (outt > inn ? 1 : -1) * w * w * 2.4;
    cam.translateX(off); cam.rotateZ((outt > inn ? 1 : -1) * w * w * 0.05);
    const dist = Math.min(first ? 99 : lt, last ? 99 : T - lt);
    const flash = Math.max(0, 1 - dist / 0.16) * 0.95;
    const u = fxp.uniforms;
    u.blur.value = w * w * 0.085; u.aberr.value = 0.004 + w * 0.02; u.flash.value = flash; u.time.value = t;
    u.glitch.value = Math.max(0, 1 - dist / 0.3) * 0.8; u.dir.value.set(1, 0.1);
    u.fade.value = first ? L.prog(lt, 0, 0.5) : last ? 1 - L.prog(lt, T - 1.0, T) : 1;
    rp.scene = sc.obj.scene; rp.camera = cam;
    bloom.strength = sc.obj.bloom ?? 0.75;
    composer.render();
    octx.drawImage(glc, 0, 0);
    const hudAlpha = 1 - Math.min(1, w * 1.4);
    octx.save(); octx.globalAlpha = hudAlpha;
    if (sc.obj.hud) sc.obj.hud(octx, lt, T, P);
    HUD.caption(octx, P, lt);
    if (m.chapter) HUD.chapter(octx, m.chapter[0], m.chapter[1], lt);
    octx.restore();
    HUD.brand(octx, t, tl.total);
    return jpeg ? out.toDataURL('image/jpeg', 0.94) : out.toDataURL('image/png');
  };
  window.ready = true;
}
init().catch(e => { console.error('INIT FAIL', e.stack || e); window.initError = String(e.stack || e); });

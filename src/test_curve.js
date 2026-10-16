import * as THREE from 'three';
import curveData from './curveData.json' assert { type: 'json' };

const camPts = curveData.cameraPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));
const targetPts = curveData.targetPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]));

const camCurve = new THREE.CatmullRomCurve3(camPts, true); // closed curve
const targetCurve = new THREE.CatmullRomCurve3(targetPts, true);

console.log('camCurve length:', camCurve.getLength());
console.log('targetCurve length:', targetCurve.getLength());

for (let t = 0; t <= 1; t += 0.25) {
  const p = camCurve.getPointAt(t);
  const look = targetCurve.getPointAt(t);
  console.log(`t=${t.toFixed(2)} Cam: [${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}] Look: [${look.x.toFixed(1)}, ${look.y.toFixed(1)}, ${look.z.toFixed(1)}]`);
}

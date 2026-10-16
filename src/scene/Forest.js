import * as THREE from 'three';
import treeData from './treeData.json';

export class Forest {
  constructor(scene, terrainMesh) {
    this.scene = scene;
    this.terrainMesh = terrainMesh;
    this.instancedMesh = null;
    this.uniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: 0.15 }
    };
  }

  buildTreeGeometry() {
    // Combine trunk and tiered foliage into one single geometry
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.4, 6);
    trunkGeo.translate(0, 0.7, 0);

    // 4 tiered coniferous foliage cones
    const tier1 = new THREE.ConeGeometry(1.4, 1.6, 7);
    tier1.translate(0, 1.6, 0);

    const tier2 = new THREE.ConeGeometry(1.15, 1.4, 7);
    tier2.translate(0, 2.3, 0);

    const tier3 = new THREE.ConeGeometry(0.85, 1.2, 7);
    tier3.translate(0, 2.9, 0);

    const tier4 = new THREE.ConeGeometry(0.5, 0.9, 7);
    tier4.translate(0, 3.4, 0);

    // Merge geometries
    const geometries = [trunkGeo, tier1, tier2, tier3, tier4];
    
    // We can merge them into a single buffer geometry with a custom color attribute for bark vs needles vs snow tip
    let totalVerts = 0;
    geometries.forEach(g => { totalVerts += g.attributes.position.count; });

    const posArray = new Float32Array(totalVerts * 3);
    const normArray = new Float32Array(totalVerts * 3);
    const colorArray = new Float32Array(totalVerts * 3);

    let offset = 0;
    geometries.forEach((g, gIdx) => {
      const p = g.attributes.position;
      const n = g.attributes.normal;
      const count = p.count;

      for (let i = 0; i < count; i++) {
        const vi = (offset + i) * 3;
        posArray[vi] = p.getX(i);
        posArray[vi + 1] = p.getY(i);
        posArray[vi + 2] = p.getZ(i);

        normArray[vi] = n.getX(i);
        normArray[vi + 1] = n.getY(i);
        normArray[vi + 2] = n.getZ(i);

        if (gIdx === 0) {
          // Trunk: deep bark brown
          colorArray[vi] = 0.22;
          colorArray[vi + 1] = 0.14;
          colorArray[vi + 2] = 0.09;
        } else {
          // Foliage: alpine deep evergreen needles
          const yNorm = p.getY(i);
          // Tips of higher cones get a touch of warm alpine sunlight
          const sunTip = Math.max(0, (yNorm - 2.2) * 0.3);
          colorArray[vi] = THREE.MathUtils.lerp(0.08, 0.38, sunTip);
          colorArray[vi + 1] = THREE.MathUtils.lerp(0.26, 0.58, sunTip);
          colorArray[vi + 2] = THREE.MathUtils.lerp(0.12, 0.22, sunTip);
        }
      }
      offset += count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    return merged;
  }

  generateForest(count = 1400) {
    const treeGeo = this.buildTreeGeometry();

    const treeMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true
    });

    // Add wind sway in vertex shader
    treeMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uWindStrength = this.uniforms.uWindStrength;

      shader.vertexShader = `
        uniform float uTime;
        uniform float uWindStrength;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Wind sway increases with height up the tree
        float heightFactor = max(0.0, transformed.y - 0.8);
        float sway = sin(uTime * 2.2 + instanceMatrix[3][0] * 0.15 + instanceMatrix[3][2] * 0.15);
        transformed.x += sway * heightFactor * uWindStrength * 0.25;
        transformed.z += cos(uTime * 1.8 + instanceMatrix[3][0] * 0.12) * heightFactor * uWindStrength * 0.2;
        `
      );
    };

    const instancedMesh = new THREE.InstancedMesh(treeGeo, treeMaterial, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    // Fast-path: use precomputed alpine tree placements (instantaneous load, 0 raycasts)
    if (Array.isArray(treeData) && treeData.length > 0) {
      const numTrees = Math.min(count, treeData.length);
      const raw = instancedMesh.instanceMatrix.array;
      for (let i = 0; i < numTrees; i++) {
        const mat = treeData[i];
        const offset = i * 16;
        for (let j = 0; j < 16; j++) {
          raw[offset + j] = mat[j];
        }
      }
      instancedMesh.count = numTrees;
      instancedMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(instancedMesh);
      this.instancedMesh = instancedMesh;
      return instancedMesh;
    }

    const dummy = new THREE.Object3D();
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    let placed = 0;
    const targets = this.terrainMesh ? [this.terrainMesh] : [];

    // Scatter trees across mountain foothills, valleys, and lake edges
    const bounds = {
      minX: -160, maxX: 160,
      minZ: -140, maxZ: 200
    };

    for (let i = 0; i < count * 3 && placed < count; i++) {
      // Clustered distribution along valleys
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.6) * 160;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius + 20;

      if (this.terrainMesh) {
        raycaster.set(new THREE.Vector3(x, 80, z), down);
        const hits = raycaster.intersectObjects(targets, false);

        if (hits.length > 0) {
          const hit = hits[0];
          const y = hit.point.y;
          const normal = hit.face.normal;

          // Trees grow between lake level (-45) up to alpine tree line (+12), and on slopes < 45 degrees
          if (y > -48 && y < 14 && normal.y > 0.65) {
            dummy.position.copy(hit.point);
            // Sink slightly so roots are grounded
            dummy.position.y -= 0.2;

            // Random rotation
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.rotation.x = (Math.random() - 0.5) * 0.08;
            dummy.rotation.z = (Math.random() - 0.5) * 0.08;

            // Varied tree heights: 1.8m to 4.2m
            const scale = THREE.MathUtils.randFloat(0.7, 1.4);
            dummy.scale.set(scale, scale * THREE.MathUtils.randFloat(0.9, 1.2), scale);

            dummy.updateMatrix();
            instancedMesh.setMatrixAt(placed, dummy.matrix);
            placed++;
          }
        }
      } else {
        // Fallback procedural placement if terrain mesh not yet available
        dummy.position.set(x, -25 + (Math.sin(x * 0.05) + Math.cos(z * 0.05)) * 10, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        const scale = THREE.MathUtils.randFloat(0.8, 1.3);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(placed, dummy.matrix);
        placed++;
      }
    }

    instancedMesh.count = placed;
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedMesh);
    this.instancedMesh = instancedMesh;
    console.log(`Placed ${placed} alpine pine trees on mountain slopes`);
    return instancedMesh;
  }

  update(dt, elapsedTime) {
    this.uniforms.uTime.value = elapsedTime;
  }
}

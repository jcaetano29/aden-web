import * as THREE from "three";
import { surfaceMaps } from "./materialAtlas.js";

/** The source models use palette UVs, so replacing their map loses faces and
 * clothing colours. Bind-pose triplanar detail adds actual material grain while
 * keeping those UVs, skinning, equipment variants and animation clips intact.
 * A subclass deliberately preserves the shader when Three clones enemy tints. */
export class CharacterMaterial extends THREE.MeshStandardMaterial {
  override customProgramCacheKey(): string { return "aden-character-finish-v1"; }

  override onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
    const steel = surfaceMaps("metal"), cloth = surfaceMaps("cloth");
    const leather = surfaceMaps("leather"), bone = surfaceMaps("bone");
    if (!steel || !cloth || !leather || !bone) return;
    shader.uniforms.adenSteel = { value: steel.color };
    shader.uniforms.adenCloth = { value: cloth.color };
    shader.uniforms.adenLeather = { value: leather.color };
    shader.uniforms.adenBone = { value: bone.color };
    shader.uniforms.adenUndead = { value: this.name.toLowerCase().includes("skeleton") ? 1 : 0 };
    shader.uniforms.adenMonster = { value: this.name.startsWith("monster_") ? 1 : 0 };
    shader.uniforms.adenDarkEyes = { value: /monster_(InfernalDemon|AncientDrake|OrcBrute)/.test(this.name) ? 1 : 0 };
    shader.vertexShader = `varying vec3 adenPosition; varying vec3 adenNormal;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nadenPosition = position; adenNormal = normal;");
    shader.fragmentShader = `
      varying vec3 adenPosition; varying vec3 adenNormal;
      uniform sampler2D adenSteel; uniform sampler2D adenCloth;
      uniform sampler2D adenLeather; uniform sampler2D adenBone;
      uniform float adenUndead;
      uniform float adenMonster; uniform float adenDarkEyes;
      vec3 adenSample(sampler2D surface) {
        vec3 w = pow(abs(normalize(adenNormal)), vec3(4.0));
        w /= max(dot(w, vec3(1.0)), 0.001);
        vec3 p = adenPosition * 1.8;
        return texture2D(surface, p.yz).rgb * w.x
          + texture2D(surface, p.xz).rgb * w.y
          + texture2D(surface, p.xy).rgb * w.z;
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
      #include <map_fragment>
      vec3 adenBase = diffuseColor.rgb;
      float adenMax = max(max(adenBase.r, adenBase.g), adenBase.b);
      float adenMin = min(min(adenBase.r, adenBase.g), adenBase.b);
      float adenSaturation = (adenMax - adenMin) / max(adenMax, 0.001);
      float adenSkin = step(adenBase.b * 1.35, adenBase.g) * step(adenBase.g * 1.15, adenBase.r);
      float adenMetal = (1.0 - smoothstep(0.12, 0.32, adenSaturation)) * step(0.09, adenMax);
      float adenIsBone = adenUndead * step(0.35, adenMax);
      adenMetal *= (1.0 - adenIsBone) * (1.0 - adenMonster);
      vec3 adenDetail;
      if (adenMonster > 0.5) adenDetail = adenSample(adenLeather);
      else if (adenIsBone > 0.5) adenDetail = adenSample(adenBone);
      else if (adenMetal > 0.5) adenDetail = adenSample(adenSteel);
      else if (adenSkin > 0.5 || adenMax < 0.1) adenDetail = adenSample(adenLeather);
      else adenDetail = adenSample(adenCloth);
      float adenGrain = dot(adenDetail, vec3(0.2126, 0.7152, 0.0722));
      float adenAmount = mix(0.75, 0.14, adenSkin * (1.0 - adenUndead));
      diffuseColor.rgb *= mix(1.0, 0.58 + adenGrain * 1.05, adenAmount);
      // Desaturate cloth gently; retain faces and readable team/variant colours.
      float adenLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(adenLuma), 0.16 * (1.0 - adenSkin));
      // Muted hide and dark ivory replace the source monsters' toy palette.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(adenLuma) * vec3(0.72, 0.77, 0.82), adenMonster * 0.48);
      float adenIvory = step(0.18, adenMin) * (1.0 - smoothstep(0.15, 0.35, adenSaturation));
      diffuseColor.rgb *= 1.0 - adenDarkEyes * adenIvory * 0.88;
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.86, 0.38 + adenGrain * 0.18, adenMetal);");
    shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>",
      "#include <metalnessmap_fragment>\nmetalnessFactor = adenMetal * 0.68;");
  }
}

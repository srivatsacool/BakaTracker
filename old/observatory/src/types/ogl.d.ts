declare module 'ogl' {
  export class Renderer {
    constructor(options?: {
      webgl?: number;
      alpha?: boolean;
      premultipliedAlpha?: boolean;
      antialias?: boolean;
      dpr?: number;
    });
    gl: any;
    setSize(width: number, height: number): void;
    render(options: { scene: any }): void;
  }

  export class Program {
    constructor(gl: any, options: {
      vertex: string;
      fragment: string;
      uniforms: Record<string, { value: any }>;
    });
    uniforms: Record<string, { value: any }>;
  }

  export class Mesh {
    constructor(gl: any, options: { geometry: any; program: any });
  }

  export class Triangle {
    constructor(gl: any);
  }
}

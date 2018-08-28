// Basic Javascript Rasterizer, made from Gabriel Gambetta's tutorial here: http://www.gabrielgambetta.com/computer-graphics-from-scratch/introduction.html

let canvasWidth = 600;
let canvasHeight = 600;

let BLACK = [0, 0, 0];
let WHITE = [255, 255, 255];
let RED = [255, 0, 0];
let GREEN = [0, 255, 0];
let BLUE = [0, 0, 255];
let YELLOW = [255, 255, 0];
let PURPLE = [255, 0, 255];
let CYAN = [0, 255, 255];
let bgColor = WHITE;

let viewportSize = 1;
let projPlaneZ = 1;

let Pt = function(x, y, h) {
    if (!(this instanceof Pt)) { return new Pt(x, y, h); }

    this.x = x;
    this.y = y;
    this.h = h;
}

let Vertex = function(x, y, z) {
    if (!(this instanceof Vertex)) { return new Vertex(x, y, z); }

    this.x = x;
    this.y = y;
    this.z = z;
}

let Vertex4 = function(x, y, z, w) {
    if (!(this instanceof Vertex4)) { return new Vertex4(x, y, z, w); }

    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
}


// A 4x4 matrix.
let Mat4x4 = function(data) {
    if (!(this instanceof Mat4x4)) { return new Mat4x4(data); }

    this.data = data;
}

let identity4 = Mat4x4([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
]);

let Triangle = function(v0, v1, v2, color) {
    if (!(this instanceof Triangle)) { return new Triangle(v0, v1, v2, color); }

    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.color = color;
}

let Model = function(vertices, triangles) {
    if (!(this instanceof Model)) { return new Model(vertices, triangles); }

    this.vertices = vertices;
    this.triangles = triangles;
}

function getCubeModel() {
    let vertices = [
        Vertex(1, 1, 1),
        Vertex(-1, 1, 1),
        Vertex(-1, -1, 1),
        Vertex(1, -1, 1),
        Vertex(1, 1, -1),
        Vertex(-1, 1, -1),
        Vertex(-1, -1, -1),
        Vertex(1, -1, -1)
    ];

    let triangles = [
        Triangle(0, 1, 2, RED),
        Triangle(0, 2, 3, RED),
        Triangle(4, 0, 3, GREEN),
        Triangle(4, 3, 7, GREEN),
        Triangle(5, 4, 7, BLUE),
        Triangle(5, 7, 6, BLUE),
        Triangle(1, 5, 6, YELLOW),
        Triangle(1, 6, 2, YELLOW),
        Triangle(4, 5, 1, PURPLE),
        Triangle(4, 1, 0, PURPLE),
        Triangle(2, 6, 7, CYAN),
        Triangle(2, 7, 3, CYAN)
    ];

    return Model(vertices, triangles);
}

let Instance = function(model, position, orientation = identity4, scale = 1.0) {
    if (!(this instanceof Instance)) { return new Instance(model, position, orientation, scale); }

    this.model = model;
    this.position = position;
    this.orientation = orientation;
    this.scale = scale;

    this.transform = multiplyMM4(makeTranslationMatrix(this.position), multiplyMM4(this.orientation, makeScalingMatrix(this.scale)));
}

let Camera = function(position, orientation) {
  if (!(this instanceof Camera)) { return new Camera(position, orientation); }

  this.position = position;
  this.orientation = orientation;
}

let Plane = function(normal, distance) {

}

// Helpers

function scalMult(n, v) {
    return Vertex(n * v.x, n * v.y, n * v.z);
}

function addVerticies(v1, v2) {
    return Vertex(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
}

function subtractVerticies(v1, v2) {
    return Vertex(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
}

function swap(a, b) {
    return [b, a];
}

// Makes a transform matrix for a rotation around the OY axis.
let makeOYRotationMatrix = function(degrees) {
  let cos = Math.cos(degrees*Math.PI/180.0);
  let sin = Math.sin(degrees*Math.PI/180.0);

  return Mat4x4([[cos, 0, -sin, 0],
                 [  0, 1,    0, 0],
                 [sin, 0,  cos, 0],
                 [  0, 0,    0, 1]])
}


// Makes a transform matrix for a translation.
let makeTranslationMatrix = function(translation) {
  return Mat4x4([[1, 0, 0, translation.x],
                 [0, 1, 0, translation.y],
                 [0, 0, 1, translation.z],
                 [0, 0, 0,             1]]);
}


// Makes a transform matrix for a scaling.
let makeScalingMatrix = function(scale) {
  return Mat4x4([[scale,     0,     0, 0],
                 [    0, scale,     0, 0],
                 [    0,     0, scale, 0],
                 [    0,     0,     0, 1]]);
}


// Multiplies a 4x4 matrix and a 4D vector.
let multiplyMV = function(mat4x4, vec4) {
  let result = [0, 0, 0, 0];
  let vec = [vec4.x, vec4.y, vec4.z, vec4.w];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i] += mat4x4.data[i][j]*vec[j];
    }
  }

  return Vertex4(result[0], result[1], result[2], result[3]);
}


// Multiplies two 4x4 matrices.
let multiplyMM4 = function(matA, matB) {
  let result = Mat4x4([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        result.data[i][j] += matA.data[i][k]*matB.data[k][j];
      }
    }
  }
  
  return result;
}


// Transposes a 4x4 matrix.
let transpose4 = function(mat) {
  let result = Mat4x4([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result.data[i][j] = mat.data[j][i];
    }
  }
  return result;
}

// /Helpers

function interpolate(i0, d0, i1, d1) {
    if (i0 == i1) return [d0];
    let values = [];
    let m = (d1 - d0) / (i1 - i0);
    let d = d0;
    for (let i = i0; i <= i1; i++) {
        values.push(d);
        d += m;
    }
    return values;
}

function drawPixel(x, y, color) {
    stroke(color);
    point(floor(x) + canvasWidth / 2, canvasHeight / 2 - floor(y));
}

function drawLine(p0, p1, color) {
    let dx = p1.x - p0.x;
    let dy = p1.y - p0.y;

    if (abs(dx) > abs(dy)) {
        // Horizontal-ish
        if (p0.x > p1.x) {
            [p0, p1] = swap(p0, p1);
        }
        let ys = interpolate(p0.x, p0.y, p1.x, p1.y);
        for (let x = p0.x; x <= p1.x; x++) {
            drawPixel(x, ys[(x - p0.x) | 0], color);
        }
    } else {
        // Vertical-ish
        if (p0.y > p1.y) {
            [p0, p1] = swap(p0, p1);
        }
        let xs = interpolate(p0.y, p0.x, p1.y, p1.x);
        for (let y = p0.y; y <= p1.y; y++) {
            drawPixel(xs[(y - p0.y) | 0], y, color);
        }
    }
}

function drawWireframeTriangle(p0, p1, p2, color) {
    drawLine(p0, p1, color);
    drawLine(p1, p2, color);
    drawLine(p2, p0, color);
}

function drawFilledTriangle(p0, p1, p2, color) {
    // Make y0 <= y1 <= y2
    if (p1.y < p0.y)[p1, p0] = swap(p1, p0);
    if (p2.y < p0.y)[p2, p0] = swap(p2, p0);
    if (p2.y < p1.y)[p2, p1] = swap(p2, p1);

    // Xs of edges
    let x01 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let x12 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let x02 = interpolate(p0.y, p0.x, p2.y, p2.x);

    x01.pop();
    let x012 = x01.concat(x12);

    // Left/Right
    let mid = (x012.length / 2) | 0;
    let xLeft, xRight;
    if (x02[mid] < x012[mid]) {
        xLeft = x02;
        xRight = x012;
    } else {
        xLeft = x012;
        xRight = x02;
    }

    // Draw Horiz Lines
    for (let y = p0.y; y <= p2.y; y++) {
        for (let x = xLeft[y - p0.y]; x <= xRight[y - p0.y]; x++) {
            drawPixel(x, y, color);
        }
    }
}

function drawShadedTriangle(p0, p1, p2, color) {
    // Make y0 <= y1 <= y2
    if (p1.y < p0.y)[p1, p0] = swap(p1, p0);
    if (p2.y < p0.y)[p2, p0] = swap(p2, p0);
    if (p2.y < p1.y)[p2, p1] = swap(p2, p1);

    // Xs of edges
    let x01 = interpolate(p0.y, p0.x, p1.y, p1.x);
    let h01 = interpolate(p0.y, p0.h, p1.y, p1.h);
    let x12 = interpolate(p1.y, p1.x, p2.y, p2.x);
    let h12 = interpolate(p1.y, p1.h, p2.y, p2.h);
    let x02 = interpolate(p0.y, p0.x, p2.y, p2.x);
    let h02 = interpolate(p0.y, p0.h, p2.y, p2.h);

    x01.pop();
    let x012 = x01.concat(x12);
    h01.pop();
    let h012 = h01.concat(h12);

    // Left/Right
    let mid = (x012.length / 2) | 0;
    let xLeft, xRight, hLeft, hRight;
    if (x02[mid] < x012[mid]) {
        xLeft = x02;
        xRight = x012;

        hLeft = h02;
        hRight = h012;
    } else {
        xLeft = x012;
        xRight = x02;

        hLeft = h012;
        hRight = h02;
    }

    // Draw Horiz Lines
    for (let y = p0.y; y <= p2.y; y++) {
        let xL = xLeft[y - p0.y] | 0;
        let xR = xRight[y - p0.y] | 0;
        let hL = hLeft[y - p0.y];
        let hR = hRight[y - p0.y];

        let hSegment = interpolate(xL, hL, xR, hR);

        for (let x = xL; x <= xR; x++) {
            let shadedColor = scalMult(hSegment[x - xL], color);
            drawPixel(x, y, shadedColor);
        }
    }
}

function viewportToCanvas(p2d) {
    return Pt(p2d.x * canvasWidth / viewportSize,
        p2d.y * canvasHeight / viewportSize);
}

function projectVertex(vertex) {
    return viewportToCanvas(Pt(vertex.x * projPlaneZ / vertex.z, vertex.y * projPlaneZ / vertex.z));
}

function renderTriangle(triangle, projected) {
    drawWireframeTriangle(projected[triangle.v0], projected[triangle.v1], projected[triangle.v2], triangle.color);
}

function renderModel(model, transform) {
    let projected = [];
    for (let vertex of model.vertices) {
        let vertexTransformed = vertex;
        let vertexH = Vertex4(vertex.x, vertex.y, vertex.z, 1);
        projected.push(projectVertex(multiplyMV(transform, vertexH)));
    }
    for (let triangle of model.triangles) {
        renderTriangle(triangle, projected);
    }
}

function renderScene(camera, instances) {
	let camMatrix = multiplyMM4(transpose4(camera.orientation), makeTranslationMatrix(scalMult(-1, camera.position)));

    for (let instance of instances) {
        let transform = multiplyMM4(camMatrix, instance.transform);
        renderModel(instance.model, transform);
    }
}

function setup() {
    createCanvas(canvasWidth, canvasHeight);
}

function draw() {
    background(bgColor);
    noLoop();

    let cubeModel = getCubeModel();

	let instances = [Instance(cubeModel, Vertex(-1.5, 0, 7), identity4, 0.75),
		Instance(cubeModel, Vertex(1.25, 2.5, 7.5), makeOYRotationMatrix(195)),
	];

	let camera = Camera(Vertex(-3, 1, 2), makeOYRotationMatrix(-30));

    renderScene(camera, instances);
}
// TODO(mgeorg) Pellets count is incorrect after buys.
const main_canvas = document.getElementById("main_canvas");
var ctx = main_canvas.getContext("2d");
var fractalDepth = 2;
var adaptiveScale = 1;
var click_list = [];
var click_list_path = null;

function AddFractalDepth(num) {
  if (num == 'adaptive') {
    fractalDepth = 'adaptive';
    adaptiveScale = Number(document.getElementById("adaptive_scale").value);
  } else {
    if (fractalDepth == 'adaptive') {
      fractalDepth = 2;
    } else {
      fractalDepth += num;
      if (fractalDepth < 0) {
        fractalDepth = 0;
      }
      if (fractalDepth > 10) {
        fractalDepth = 10;
      }
    }
  }
  document.getElementById("fractal_depth").textContent = fractalDepth;
  DrawOnCanvas();
}

function ClearClickList() {
  click_list = [];
  DrawOnCanvas();
}

function LoadPage() {
  ResizeCanvas();
}

var select_click_i = null;

function ProcessClick(e) {
  let elem = e.target.closest(".click_box");
  if (!elem) {
    return;
  }

  register_click = {x: e.clientX, y: e.clientY, target: e.target};
  click = PositionInCanvas(main_canvas, register_click);

  if (select_click_i != null) {
    click_list[select_click_i] = click;
    select_click_i = null;
    DrawOnCanvas();
    return;
  }

  if (click_list_path &&
      ctx.isPointInPath(click_list_path, click.x, click.y)) {
    let min_dist2 = null;
    for (let i = 0; i < click_list.length; ++i) {
      let x = click_list[i].x - click.x;
      let y = click_list[i].y - click.y;
      let cur_dist2 = x*x + y*y;
      if (!min_dist2 || cur_dist2 < min_dist2) {
        min_dist2 = cur_dist2;
        select_click_i = i;
      }
    }
    click_list[select_click_i] = click;
  } else {
    click_list.push(click);
    select_click_i = null;
    DrawOnCanvas();
  }
}

function ProcessMouseMove(e) {
  let elem = e.target.closest(".click_box");
  if (!elem) {
    return;
  }
  if (select_click_i == null) {
    return;
  }
  register_click = {x: e.clientX, y: e.clientY, target: e.target};
  click = PositionInCanvas(main_canvas, register_click);
  click_list[select_click_i] = click;

  DrawOnCanvas();
}

window.addEventListener('load', LoadPage, true);
window.addEventListener('resize', ResizeCanvas, true);
window.addEventListener('click', ProcessClick, true);
window.addEventListener('mousemove', ProcessMouseMove, true);

function DeepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ResizeCanvas() {
  let total_width = document.body.clientWidth;
  let total_height = document.body.clientHeight;
  main_canvas.width = total_width - 15;
  main_canvas.height = total_height * 0.8 - 10;

  DrawOnCanvas();
}

function get_polar(x, y) {
  let r = Math.sqrt(x*x+y*y)
  if (x >= 0) {
    return {theta: Math.asin(y/r), r: r};
  }
  return {theta: Math.PI - Math.asin(y/r), r: r};
}

function get_cartesian(theta, r) {
  return {x: Math.cos(theta)*r, y: Math.sin(theta)*r};
}

function DrawOnCanvas() {
  let width = main_canvas.width;
  let height = main_canvas.height;

  ctx.resetTransform();
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;

  ctx.clearRect(0, 0, width, height);

  click_list_path = null;

  if (click_list.length < 2) {
    return;
  }
  let start = click_list[0];
  let end = click_list[click_list.length-1];
  let main_polar = get_polar(end.x-start.x, end.y-start.y);

  let unbounded = false;

  let prev = start;
  let path = [];
  click_list_path = new Path2D();
  click_list_path.moveTo(start.x+10, start.y);
  click_list_path.arc(start.x, start.y, 10, 0, 2*Math.PI, false);
  for (let i = 1; i < click_list.length; ++i) {
    let cur = click_list[i];
    let polar  = get_polar(cur.x - prev.x, cur.y - prev.y);
    polar.theta -= main_polar.theta;
    polar.r /= main_polar.r;
    if (polar.r >= 1 && fractalDepth == 'adaptive') {
      unbounded = true;
    }
    path.push(polar);
    prev = cur;
    click_list_path.moveTo(cur.x+10, cur.y);
    click_list_path.arc(cur.x, cur.y, 10, 0, 2*Math.PI, false);
  }

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  if (unbounded) {
    DrawFractal(0, start, main_polar.theta, main_polar.r, path);
  } else {
    explosion = 0;
    DrawFractal(fractalDepth, start, main_polar.theta, main_polar.r, path);
  }
  ctx.moveTo(end.x, end.y);
  ctx.stroke();

  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.stroke(click_list_path);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
}

var explosionLimit = 100000;
var explosion = 0;

function DrawFractal(depth, start, angle, scale, path) {
  explosion += 1;
  let cur = start;
  let cur_scale = scale;
  let cur_angle = angle;
  for (let i = 0; i < path.length; ++i) {
    cur_scale = path[i].r * scale;
    cur_angle = path[i].theta + angle;
    let xy = get_cartesian(cur_angle, cur_scale);

    if (depth == 'adaptive') {
      if (cur_scale < adaptiveScale || explosion >= explosionLimit) {
        cur = {x: cur.x + xy.x, y: cur.y + xy.y};
        ctx.lineTo(cur.x, cur.y);
      } else {
        DrawFractal(depth, cur, cur_angle, cur_scale, path);
        cur = {x: cur.x + xy.x, y: cur.y + xy.y};
      }
    } else {
      if (depth != 0) {
        DrawFractal(depth-1, cur, cur_angle, cur_scale, path);
      }
      cur = {x: cur.x + xy.x, y: cur.y + xy.y};
      if (depth == 0) {
        ctx.lineTo(cur.x, cur.y);
      }
    }
  }
}
      
function DrawFractalSimple(depth, start, end) {
  if (depth == 0) {
    ctx.lineTo(end.x, end.y);
    return;
  }
  let third_offset = {x: (end.x-start.x)/3, y: (end.y-start.y)/3};
  let theta = -Math.PI/4;
  let third_offset_turned1 = {
      x: Math.cos(theta)*third_offset.x - Math.sin(theta)*third_offset.y,
      y: Math.sin(theta)*third_offset.x + Math.cos(theta)*third_offset.y};
  let theta2 = Math.PI/4;
  let third_offset_turned2 = {
      x: Math.cos(theta2)*third_offset.x - Math.sin(theta2)*third_offset.y,
      y: Math.sin(theta2)*third_offset.x + Math.cos(theta2)*third_offset.y};
  let points = [
    start,
    {x: start.x + third_offset.x, y: start.y + third_offset.y},
    {x: start.x + third_offset.x + third_offset_turned1.x,
     y: start.y + third_offset.y + third_offset_turned1.y},
    {x: start.x + third_offset.x + third_offset_turned2.x,
     y: start.y + third_offset.y + third_offset_turned2.y},
    {x: start.x + 2*third_offset.x, y: start.y + 2*third_offset.y},
    end
  ];
  for (let i = 1; i < points.length; ++i) {
    DrawFractal(depth-1, points[i-1], points[i]);
  }
}
      
function ClearDisplay() {
  document.getElementById("display_message6").textContent = '\xA0';
  document.getElementById("display_message5").textContent = '\xA0';
  document.getElementById("display_message4").textContent = '\xA0';
  document.getElementById("display_message3").textContent = '\xA0';
  document.getElementById("display_message2").textContent = '\xA0';
  document.getElementById("display_message1").textContent = '\xA0';
}

function WriteToDisplay(message) {
  let display = document.getElementById("display");
  document.getElementById("display_message6").textContent =
      document.getElementById("display_message5").textContent;
  document.getElementById("display_message5").textContent =
      document.getElementById("display_message4").textContent;
  document.getElementById("display_message4").textContent =
      document.getElementById("display_message3").textContent;
  document.getElementById("display_message3").textContent =
      document.getElementById("display_message2").textContent;
  document.getElementById("display_message2").textContent =
      document.getElementById("display_message1").textContent;
  document.getElementById("display_message1").textContent = message;
}

function PositionInCanvas(canvas, XY) {
  const canvas_bound = canvas.getBoundingClientRect();
  const y = XY.y - canvas_bound.top;
  const x = XY.x - canvas_bound.left;
  return {x:x, y:y};
}


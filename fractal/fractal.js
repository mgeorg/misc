const main_canvas = document.getElementById("main_canvas");
const ctx = main_canvas.getContext("2d");
var cursor_path = null;
var state = {'init': '0'}
var register_click = null;

window.addEventListener('load', function() {
  LoadFromCookie();
  ResizeCanvas();
  setInterval(SaveToCookie, 10000);
  setInterval(PerformTick, 100);
}, true);

window.addEventListener('resize', function() {
  ResizeCanvas();
}, true);

function GetCookieValue(key) {
  let cookies = document.cookie.split('; ');
  let cookie = cookies.find(x => x.startsWith(key + '='));
  if (cookie) {
    let value = decodeURIComponent(task_name_cookie.substring(key.length + 1));
    return value;
  }
  return null;
}

function LoadFromCookie() {
  let stored_state = localStorage.getItem('state');
  // let stored_state = GetCookieValue('state');
  if (stored_state) {
    state = JSON.parse(stored_state);
  }
}

function SaveToCookie() {
  console.log('saving to cookie.');
  localStorage.setItem('state', JSON.stringify(state));
  document.cookie =
      "state=" + encodeURIComponent(JSON.stringify(state)) + ";domain=localhost" /* + ";path=/"*/;
}


function PerformTick() {
  let click = register_click
  register_click = null;
  if (click) {
    if (cursor_path && ctx.isPointInPath(cursor_path, click.x, click.y)) {
      WriteToDisplay('In cursor: x: ' + click.x + ' y: ' + click.y);
    } else {
      WriteToDisplay('x: ' + click.x + ' y: ' + click.y);
    }
  }
}

function ResizeCanvas() {
  let total_width = document.body.clientWidth;
  let total_height = document.body.clientHeight;
  // let canvas = document.getElementById("canvas");
  main_canvas.width = total_width / 10;
  main_canvas.height = total_width / 10;
  DrawOnCanvas();
}

function DrawOnCanvas() {
  let width = main_canvas.width;
  let height = main_canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (state.init == 0) {
    return;
  }

  cursor_path = new Path2D();
  cursor_path.arc(width/2, height/2, width/2, Math.PI * 7 / 4, Math.PI * 2, true);
  cursor_path.arc(width/2, height/2, width*3/8, 0, Math.PI * 7 / 4, true);
  cursor_path.closePath();
  ctx.stroke(cursor_path);

  // ctx.fillStyle = "#FF0000";
  // ctx.fillRect(0, 0, width, height);
}

function WriteToDisplay(message) {
  let display = document.getElementById("display");
  let elem = document.createElement("DIV");
  elem.classList.add('display_message');
  elem.textContent = message;
  display.appendChild(elem);
}

function PositionInCanvas(canvas, e) {
  const canvas_bound = canvas.getBoundingClientRect();
  const y = e.clientY - canvas_bound.top;
  const x = e.clientX - canvas_bound.left;
  return {x:x, y:y};
}

document.addEventListener("click",  function (e) {
  register_click = {x: e.clientX, y: e.clientY};

}, false)


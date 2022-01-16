const main_canvas = document.getElementById("main_canvas");
const ctx = main_canvas.getContext("2d");
var cursor_path = null;
var state = null;
var register_click = null;
var points_per_tick = 0;
var cursor_clicks_per_tick = 0;

function CheatTick(num) {
  for (let i = 0; i < num; ++i) {
    PerformTick();
  }
}

function LoadPage() {
  if (typeof fractal_param == 'undefined') {
    WriteToDisplay('Waiting for fractal_param to load page.');
    setTimeout(LoadPage, 100);
    return;
  }
  state = DeepCopy(fractal_param['start_state']);
  LoadState();
  ResizeCanvas();
  setInterval(SaveState, 10000);
  setInterval(PerformTick, 100);

  window.addEventListener('resize', function() {
    ResizeCanvas();
  }, true);
  main_canvas.addEventListener("click",  function (e) {
    register_click = {x: e.clientX, y: e.clientY};
  }, false)
  shop.addEventListener("click",  function (e) {
    let elem = e.target.closest('.achievement');
    if (elem && elem.id && elem.id.startsWith('achievement_')) {
      let achievement = elem.id.substring('achievement_'.length);
      let data = fractal_param['achievements'][achievement];
      if (AchievementBuyable(achievement, data)) {
        BuyAchievement(achievement, data);
      }
      elem.remove();
    }
  }, false)
}

window.addEventListener('load', LoadPage, true);

function GetCookieValue(key) {
  let cookies = document.cookie.split('; ');
  let cookie = cookies.find(x => x.startsWith(key + '='));
  if (cookie) {
    let value = decodeURIComponent(task_name_cookie.substring(key.length + 1));
    return value;
  }
  return null;
}

function DeepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function Reset() {
  localStorage.removeItem('state');
  state = DeepCopy(fractal_param['start_state']);
  ResetVisuals();
  DrawOnCanvas();
}

function LoadState(slot) {
  let storage_name = 'state';
  let write_to_display = true;
  if (slot && slot > 0) {
    storage_name = 'state_' + slot;
  } else {
    write_to_display = false;
  }
  let stored_state = localStorage.getItem(storage_name);
  if (stored_state) {
    state = JSON.parse(stored_state);
    if (write_to_display) {
      ClearDisplay();
      WriteToDisplay('Loaded State from slot "' + storage_name + '"');
      DrawOnCanvas();
    }
  } else {
    if (write_to_display) {
      WriteToDisplay('Failed to load state from slot "' + storage_name + '"');
    }
  }
  ResetVisuals();
}

function ResetVisuals() {
  UpdateVariables();
  ClearAchievements();
  UpdateAchievements();
  UpdatePoints();
  if (state['show_pellets']) {
    document.getElementById('pellets_container').style.display = 'block';
  } else {
    document.getElementById('pellets_container').style.display = 'none';
  }
}

function UpdateVisuals() {
  UpdateVariables();
  UpdateAchievements();
  UpdatePoints();
}

function ClearAchievements() {
  let shop = document.getElementById('shop');
  while (shop.lastChild) {
    shop.lastChild.remove();
  }
}

function CreateAchievement(achievement, data) {
  elem = document.createElement("DIV");
  elem.id = 'achievement_' + achievement;
  elem.classList.add('achievement');
  let sub = document.createElement("DIV");
  sub.classList.add('achievement_title');
  sub.textContent = data['title'];
  elem.appendChild(sub);
  sub = document.createElement("DIV");
  sub.classList.add('achievement_cost');
  let txt = '(';
  for (let [type, quantity] of Object.entries(data['unlock'])) {
    if (txt != '(') {
      txt += ', ';
    }
    txt += type + ': ' + quantity;
  }
  txt += ')';
  sub.textContent = txt;
  elem.appendChild(sub);
  sub = document.createElement("DIV");
  sub.textContent = data['text'];
  elem.appendChild(sub);
  document.getElementById('shop').appendChild(elem);
}

function AchievementBuyable(achievement, data) {
  for (let [type, quantity] of Object.entries(data['unlock'])) {
    if (!(type in state)) {
      return false;
    }
    if (state[type] < quantity) {
      return false;
    }
  }
  return true;
}

function BuyAchievement(achievement, data) {
  for (let [type, quantity] of Object.entries(data['unlock'])) {
    state[type] -= quantity;
  }
  if (achievement in state['bought']) {
    state['bought'][achievement] += 1;
  } else {
    state['bought'][achievement] = 1;
  }
  delete state['unlocked'][achievement];
  UpdateAchievements();
  WriteToDisplay(data['display_message']);
}

function UpdateAchievements() {
  for (let [achievement, data] of
       Object.entries(fractal_param['achievements'])) {
    if (achievement in state['bought'] && data['max_buy'] >=
        state['bought'][achievement]) {
      continue;
    }
    if (achievement in state['unlocked']) {
      let elem = document.getElementById('achievement_' + achievement);
      if (!elem) {
        CreateAchievement(achievement, data);
      }
      continue;
    }
    if (AchievementBuyable(achievement, data)) {
      state['unlocked'][achievement] = true;
      CreateAchievement(achievement, data);
    }
  }
}

function UpdateVariables() {
  points_per_tick = 0;
  cursor_clicks_per_tick = 0;
  if ('auto_cursor_click' in state['bought']) {
    cursor_clicks_per_tick = 0.1;
  }
  if ('buy_pellets' in state['bought']) {
    if (!('pellets' in state)) {
      state['pellets'] = 0;
    }
    state['pellets'] += 2;
    state['show_pellets'] = true;
    delete state['bought']['buy_pellets'];
    if (state['init']['phase'] == 'idle' && state['pellets'] > 0 &&
        state['line'] < 10) {
      state['init']['phase'] = 'make_line';
      state['init']['make_line'] = 0;
    }
  }
  // TODO(mgeorg) make_box.
}

function SaveState(slot) {
  let storage_name = 'state';
  if (slot && slot > 0) {
    storage_name = 'state_' + slot;
    WriteToDisplay('Save State in slot "' + storage_name + '"');
  }
  localStorage.setItem(storage_name, JSON.stringify(state));
}

function UpdatePoints() {
  document.getElementById('points_counter').textContent =
      Math.floor(state['points']);
  if ('pellets' in state && state['pellets'] > 0) {
    // Probably move this into an enable/disable section.
    document.getElementById('pellets_container').style.display = 'block';
    document.getElementById('pellets_counter').textContent =
        Math.floor(state['pellets']);
  }
}

function PerformTick() {
  ++state['tick'];
  if (points_per_tick > 0) {
    state['points'] += points_per_tick;
  }
  if (cursor_clicks_per_tick > 0) {
    state['cursor_clicks'] += cursor_clicks_per_tick;
  }
  let click = register_click
  register_click = null;
  if (click) {
    ++state['click'];
    let canvas_click = PositionInCanvas(main_canvas, click);
    if (cursor_path &&
        ctx.isPointInPath(cursor_path, canvas_click.x, canvas_click.y)) {
      state['cursor_clicks'] += 1;
    }
  }
  if (state['cursor_clicks'] >= 1) {
    let num = Math.floor(state['cursor_clicks']);
    state['cursor_clicks'] -= num;
    CursorClick(num);
  }
  UpdateVisuals();
  DrawOnCanvas();
}

function CursorClick(num) {
  state['points'] += num;
  if (state['init']) {
    let phase = state['init']['phase'];
    if (phase in fractal_param['init']) {
      state['init'][phase] += num;
      if (state['init'][phase] >= fractal_param['init'][phase][0]) {
        state['init'][phase] = fractal_param['init'][phase][0];
        state['init']['phase'] = fractal_param['init'][phase][1]
        state['init'][fractal_param['init'][phase][1]] = 0;
        for (let [v, quantity] of
             Object.entries(fractal_param['init'][phase][2])) {
          if (!(v in state)) {
            state[v] = 0;
          }
          state[v] += quantity;
        }
      }
    }
    if (state['init']['phase'] == 'idle' && state['pellets'] > 0 &&
        state['line'] < 10) {
      state['init']['phase'] = 'make_line';
      state['init']['make_line'] = 0;
    }
  }
}

function ResizeCanvas() {
  let total_width = document.body.clientWidth;
  let total_height = document.body.clientHeight;
  // let canvas = document.getElementById("canvas");
  main_canvas.width = total_width * .6;
  main_canvas.height = total_width * .4;
  document.getElementById("shop").style.height =
      Math.floor(Number(total_width * .4)) + 'px';
  document.getElementById("resources").style.height =
      Math.floor(Number(total_width * .4)) + 'px';
  DrawOnCanvas();
}

function DrawOnCanvas() {
  let width = main_canvas.width;
  let height = main_canvas.height;
  ctx.clearRect(0, 0, width, height);

  let mouth_direction = 0;
  let mouth_arc = Math.PI / 4;
  let cursor_radius = height/4;
  let pellet_radius = height/16;
  let mouth_ratio = 3/4;
  let cursor_center = {x: cursor_radius + width/20, y: height/2};
  let x_offset = 0;
  let y_offset = 15;
  let crush_text = 1;
  let first_pellet_size = 1;

  if (state['init'] && state['init']['phase'] in fractal_param['init']) {
    ctx.font = "40px Arial";
    let measure = ctx.measureText("Click");
    let draw_text = false;
    let draw_line = false;
    let phase = state['init']['phase'];
    let max_click = fractal_param['init'][phase][0];
    let ratio =  state['init'][phase] / max_click;
    let external_line_size = 0;
    if (phase == 'intro') {
      cursor_radius = cursor_radius + width * (1-ratio);
      mouth_ratio = 1;
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'make_mouth') {
      mouth_ratio = mouth_ratio + 1/4 * (1-ratio);
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'turn_mouth') {
      mouth_direction = 2 * Math.PI * ratio;
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'move_text') {
      x_offset = (cursor_radius - measure.width/2) * ratio;
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'crush_text') {
      x_offset = cursor_radius - measure.width/2;
      mouth_arc = Math.PI *(1 / 4 - 1/360) * (1-ratio) + Math.PI / 360;
      if (ratio > .5) {
        crush_text = 1-(ratio*2 - 1);
        line_width = (1-crush_text)*5+.1;
        draw_line = true;
      }
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'open_mouth') {
      mouth_arc = Math.PI *(1 / 4 - 1/360) * (ratio) + Math.PI / 360;
      line_width = 5
      draw_line = true;
      first_pellet_size = 0;
    } else if (phase == 'make_line1') {
      let mod_val =  (state['init'][phase] % 8);
      if (mod_val == 0) {
        mouth_ratio = 3/4;
      } else if (mod_val == 1) {
        mouth_ratio = 1;
      } else if (mod_val == 2) {
        mouth_ratio = 3/4;
      } else if (mod_val == 3) {
        mouth_ratio = 1/2;
      } else if (mod_val == 4) {
        mouth_ratio = 1/3;
      } else if (mod_val == 5) {
        mouth_ratio = 1/4;
      } else if (mod_val == 6) {
        mouth_ratio = 1/3;
      } else if (mod_val == 7) {
        mouth_ratio = 1/2;
      }
      line_width = 5 * (1-ratio) + .1;
      draw_line = true;
      external_line_size = Math.floor(state['init'][phase] / 8) * 8 / max_click;
      first_pellet_size = 0;
    } else if (phase == 'cut_line') {
      mouth_arc = Math.PI *(1 / 4 - 1/360) * (1-ratio) + Math.PI / 360;
      external_line_size = 1;
      first_pellet_size = 0;
    } else if (phase == 'open_mouth2') {
      mouth_arc = Math.PI *(1 / 4 - 1/360) * (ratio) + Math.PI / 360;
    } else if (phase == 'idle') {
    } else if (phase == 'make_line') {
      let mod_val =  (state['init'][phase] % 14);
      if (mod_val == 0) {
        mouth_ratio = 3/4;
      } else if (mod_val == 1) {
        mouth_ratio = 1;
      } else if (mod_val == 2) {
        mouth_ratio = 3/4;
      } else if (mod_val == 3) {
        mouth_ratio = 1/2;
      } else if (mod_val == 4) {
        mouth_ratio = 1/3;
      } else if (mod_val == 5) {
        mouth_ratio = 1/4;
      } else if (mod_val == 6) {
        mouth_ratio = 1/6;
      } else if (mod_val == 7) {
        mouth_ratio = 1/8;
      } else if (mod_val == 8) {
        mouth_ratio = 1/16;
      } else if (mod_val == 9) {
        mouth_ratio = 1/8;
      } else if (mod_val == 10) {
        mouth_ratio = 1/6;
      } else if (mod_val == 11) {
        mouth_ratio = 1/4;
      } else if (mod_val == 12) {
        mouth_ratio = 1/3;
      } else if (mod_val == 13) {
        mouth_ratio = 1/2;
      }
      first_pellet_size = 1-ratio;
      external_line_size =
          Math.floor(state['init'][phase] / 14) * 14 / max_click;
    }
    if (draw_text) {
      if (crush_text != 1) {
        ctx.scale(1, crush_text);
      }
      if (state['init']['intro'] % 2 == 0) {
        ctx.fillText("Click", cursor_center.x - measure.width/2 + x_offset,
                     (cursor_center.y)/crush_text + y_offset);
      } else {
        ctx.strokeText("Click", cursor_center.x - measure.width/2 + x_offset,
                       (cursor_center.y)/crush_text + y_offset);
      }
      if (crush_text != 1) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    if (draw_line) {
      ctx.lineWidth = line_width;
      ctx.beginPath();
      ctx.moveTo(cursor_center.x, cursor_center.y);
      ctx.lineTo(cursor_center.x + cursor_radius, cursor_center.y);
      ctx.stroke();
    }
    if (external_line_size > 0) {
      ctx.lineWidth = 1
      ctx.beginPath();
      ctx.moveTo(cursor_center.x + cursor_radius, cursor_center.y);
      ctx.lineTo(cursor_center.x + cursor_radius + width/2 * external_line_size,
                 cursor_center.y);
      ctx.stroke();
    }
  }

  ctx.lineWidth = 2;
  cursor_path = new Path2D();
  cursor_path.arc(cursor_center.x, cursor_center.y, cursor_radius,
                  mouth_arc/2 + mouth_direction,
                  - mouth_arc/2 + mouth_direction, false);
  cursor_path.arc(cursor_center.x, cursor_center.y, cursor_radius * mouth_ratio,
                  - mouth_arc/2 + mouth_direction,
                  mouth_arc/2 + mouth_direction, false);
  cursor_path.closePath();
  ctx.stroke(cursor_path);

  if ('line' in state && state['line'] > 0) {
    ctx.lineWidth = 1
    ctx.beginPath();
    for (let i = 0; i < state['line']; ++i) {
      ctx.moveTo(cursor_center.x + cursor_radius, height*(19-i)/20);
      ctx.lineTo(cursor_center.x + cursor_radius + width/2, height*(19-i)/20);
    }
    ctx.stroke();
  }

  if ('pellets' in state && state['pellets'] > 0) {
    ctx.beginPath();
    ctx.arc(cursor_center.x, cursor_center.y,
            pellet_radius*first_pellet_size, 0, 2*Math.PI, false);
    for (let i = 1; i < state['pellets']; ++i) {
      let y = cursor_center.y
              - pellet_radius * 1.5 - (1 + (i-1)/4) * cursor_radius;
      ctx.moveTo(cursor_center.x, y);
      ctx.arc(cursor_center.x, y, pellet_radius, 0, 2*Math.PI, false);
    }
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.stroke();
  }

  // ctx.fillStyle = "#FF0000";
  // ctx.fillRect(0, 0, width, height);
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
  //let elem = document.createElement("DIV");
  //elem.classList.add('display_message');
  //elem.textContent = message;
  //display.appendChild(elem);
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


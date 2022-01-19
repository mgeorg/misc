const main_canvas = document.getElementById("main_canvas");
var ctx = main_canvas.getContext("2d");
var cursor_path = null;
var garden_boundary_path = null;
var garden_pellets_path = null;
var state = null;
var register_click = null;
var garden_prng = null;

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
  ResizeCanvas();
  LoadState();
  setInterval(SaveState, 1000);
  setInterval(PerformTick, 100);

  window.addEventListener('resize', function() {
    ResizeCanvas();
    DrawBox();
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
        elem.remove();
      }
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
  ClearAchievements();
  ResetVisuals();
  DrawOnCanvas();
}

function LoadState(slot) {
  if (fractal_param['disable_load']) {
    return;
  }
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
    }
  } else {
    if (write_to_display) {
      WriteToDisplay('Failed to load state from slot "' + storage_name + '"');
    }
  }
  ClearAchievements();
  ResetVisuals();
  DrawOnCanvas();
}

function DrawBox() {
  const box_canvas = document.getElementById("box_canvas");
  const box_ctx = box_canvas.getContext("2d");
  let width = box_canvas.width;
  let height = box_canvas.height;
  box_ctx.clearRect(0, 0, width, height);
  if (state['show_box'] == 'line') {
    box_ctx.lineWidth = 1;
    box_ctx.beginPath();
    box_ctx.moveTo(width/8, height/2);
    box_ctx.lineTo(width*7/8, height/2);
    box_ctx.stroke();
  }
}

function ResetVisuals() {
  if (state['show_pellets']) {
    document.getElementById('pellets_container').style.display = 'block';
  } else {
    document.getElementById('pellets_container').style.display = 'none';
  }
  if (state['show_box']) {
    document.getElementById('box_container').style.display = 'block';
    DrawBox();
  } else {
    document.getElementById('box_container').style.display = 'none';
  }
  UpdateVisuals();
}

function UpdateVisuals() {
  UpdateVariables();
  UpdateAchievements();
  UpdateResources();
}

function ClearAchievements() {
  let shop = document.getElementById('shop');
  while (shop.lastChild) {
    shop.lastChild.remove();
  }
}

function ParseQuantity(achievement, quantity) {
  if (typeof quantity == 'number') {
    return quantity;
  } else if (typeof quantity == 'string') {
    let n = NumBought(achievement) + 1;
    let replaced_quantity = quantity.replaceAll('n', n);
    return Function('"use strict";return (' + replaced_quantity + ');')();
  }
  return null;
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
  for (let [type, quantity] of Object.entries(data['cost'])) {
    if (txt != '(') {
      txt += ', ';
    }
    txt += type + ': ' + ParseQuantity(achievement, quantity);
  }
  txt += ')';
  sub.textContent = txt;
  elem.appendChild(sub);
  sub = document.createElement("DIV");
  sub.textContent = data['text'];
  elem.appendChild(sub);
  document.getElementById('shop').appendChild(elem);
}

function NumBought(achievement) {
  let quantity = state['bought'][achievement];
  if (quantity) {
    return quantity;
  }
  return 0;
}

function AchievementBuyable(achievement, data) {
  for (let [type, quantity] of Object.entries(data['cost'])) {
    if (!(type in state)) {
      return false;
    }
    let parsed_quantity = ParseQuantity(achievement, quantity);
    if (parsed_quantity && state[type] < parsed_quantity) {
      return false;
    }
  }
  return true;
}

function AchievementUnlockable(achievement, data) {
  for (let [type, quantity] of Object.entries(data['unlock'])) {
    if (!(type in state)) {
      return false;
    }
    let parsed_quantity = ParseQuantity(achievement, quantity);
    if (parsed_quantity && state[type] < parsed_quantity) {
      return false;
    }
  }
  return true;
}

function BuyAchievement(achievement, data) {
  for (let [type, quantity] of Object.entries(data['cost'])) {
    let parsed_quantity = ParseQuantity(achievement, quantity);
    if (parsed_quantity && parsed_quantity > 0) {
      state[type] -= parsed_quantity;
    }
  }
  for (let [type, quantity] of Object.entries(data['benefit'])) {
    if (typeof quantity == 'string' && quantity.startsWith('set:')) {
      state[type] = quantity.substring(4);
      continue
    }
    let parsed_quantity = ParseQuantity(achievement, quantity);
    if (parsed_quantity) {
      if (!(type in state)) {
        state[type] = 0;
      }
      state[type] += parsed_quantity;
    }
  }
  if (achievement in state['bought']) {
    state['bought'][achievement] += 1;
  } else {
    state['bought'][achievement] = 1;
  }
  delete state['unlocked'][achievement];
  ResetVisuals();
  WriteToDisplay(data['display_message']);
}

function UpdateAchievements() {
  for (let [achievement, data] of
       Object.entries(fractal_param['achievements'])) {
    let num_bought = NumBought(achievement);
    if (data['max_buy'] >= 0 && num_bought >= data['max_buy']) {
      continue;
    }
    if (achievement in state['unlocked']) {
      let elem = document.getElementById('achievement_' + achievement);
      if (!elem) {
        CreateAchievement(achievement, data);
      }
    } else if (AchievementUnlockable(achievement, data)) {
      state['unlocked'][achievement] = true;
      CreateAchievement(achievement, data);
    }
    let elem = document.getElementById('achievement_' + achievement);
    if (elem) {
      if (AchievementBuyable(achievement, data)) {
        elem.classList.add('achievement_buyable');
      } else {
        elem.classList.remove('achievement_buyable');
      }
    }
  }
}

function UpdateVariables() {

  if (state['init']['phase'] == 'idle' && state['pellets'] == 0) {
    // TODO(mgeorg) Beg for pellets.
  }
}

function SaveState(slot) {
  let storage_name = 'state';
  if (slot && slot > 0) {
    storage_name = 'state_' + slot;
    WriteToDisplay('Save State in slot "' + storage_name + '"');
  }
  localStorage.setItem(storage_name, JSON.stringify(state));
}

function UpdateResources() {
  document.getElementById('points_counter').textContent =
      Math.floor(state['points']);
  if (state['pellets'] > 0) {
    document.getElementById('pellets_counter').textContent =
        Math.floor(state['pellets']);
  }
  if (state['show_box']) {
    document.getElementById('box_counter').textContent =
        state[state['show_box']];
  }
}

function PerformTick() {
  ++state['tick'];
  state['points'] += state['points_per_tick'];
  state['cursor_clicks'] += state['cursor_clicks_per_tick'];

  let click = register_click
  register_click = null;
  if (click) {
    ++state['click'];
    let canvas_click = PositionInCanvas(main_canvas, click);
    if (cursor_path &&
        ctx.isPointInPath(cursor_path, canvas_click.x, canvas_click.y)) {
      state['cursor_clicks'] += 1;
    }
    if (garden_boundary_path &&
        ctx.isPointInPath(garden_boundary_path,
                          canvas_click.x, canvas_click.y)) {
      // TODO(mgeorg) create increase in click harvest amount.
      GardenClick(1, canvas_click);
    }
  }
  if (state['cursor_clicks'] >= 1) {
    let num = Math.floor(state['cursor_clicks']);
    state['cursor_clicks'] -= num;
    CursorClick(num);
  }

  GrowGarden();

  UpdateVisuals();
  DrawOnCanvas();
}

function GrowGarden() {
  if (!garden_prng) {
    var sr = Math.seedrandom;
    if (typeof state['garden_seed'] == 'string') {
      garden_prng = sr(state['garden_seed'], {'state': true});
    } else {
      garden_prng = sr('', {'state': state['garden_seed']});
    }
  }
  let grow_threshold = 1/(10*10*60); // On average once every 10 minutes.
  grow_threshold *= state['garden_speed'];

  let garden_size = 8**(state['garden']-1);
  for (let i = 0; i < garden_size; ++i) {
    if (garden_prng() < grow_threshold) {
      if (!state['garden_pellets']) {
        state['garden_pellets'] = {};
      }
      state['garden_pellets'][i] = true;
    }
  }
  
  state['garden_seed'] = garden_prng.state();
}

function CursorClick(num) {
  if (state['init']['phase'] != 'idle') {
    state['points'] += num;
  }
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
  if (state['pellet_loaded'] < 1 && state['pellets'] >= 1) {
    state['pellet_loaded'] = 1;
    state['pellets'] -= 1;
  }
  if (state['init']['phase'] == 'idle' &&
      state['pellet_loaded'] > 0 &&
      (state['line'] < 10 || state['show_box'])
      ) {
    state['init']['phase'] = 'make_line';
    state['init']['make_line'] = 0;
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
  box_canvas.width = total_width * .2 - 8;
  box_canvas.height = total_width * .1 - 4;
  document.getElementById("resources").style.height =
      Math.floor(Number(total_width * .4)) + 'px';
  ctx = main_canvas.getContext("2d");
  DrawOnCanvas();
}

function DrawOnCanvas() {
  let width = main_canvas.width;
  let height = main_canvas.height;

  ctx.resetTransform();
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;

  ctx.clearRect(0, 0, width, height);

  if (state['garden'] > 0) {
    DrawGarden();
    DrawCursor({scale: .5, x: 0, y: height/2});
  } else {
    DrawCursor({scale: 1, x: 0, y: 0});
  }
}
      
function GetXYForGardenPlot(i) {
  let fractal_iter = state['garden'] - 1;
  if (fractal_iter == 0) {
    return {x: 0, y: 0, w: 1, h: 1};
  }
  let x = 0;
  let y = 0;
  let cur = i;
  let block_size = 1;
  for (let f = 0; f < fractal_iter; ++f) {
    let sub_plot = cur % 8;
    cur = Math.floor(cur / 8);
    if (sub_plot >= 4) {
      sub_plot += 1;
    }
    block_size /= 3;
    x += (sub_plot % 3) * block_size;
    y += Math.floor(sub_plot / 3) * block_size;
  }
  return {x: x, y: y, w: block_size, h: block_size};

}

function DrawGarden() {
  let width = main_canvas.width;
  let height = main_canvas.height;

  let garden_size = Math.min(width/2, height/2);
  let center = {x: width/4, y: height/4};
  let upper_left = {x: center.x - garden_size/2, y: center.y - garden_size/2};

  ctx.fillStyle = 'black';
  ctx.lineWidth = 1;

  let pellet_radius = height/48;
  if (state['garden_pellets']) {
    if (state['garden'] == 1) {
      ctx.fillStyle = "#EEEEEE";
    } else if (state['garden'] == 2) {
      ctx.fillStyle = "#AAAAAA";
    } else if (state['garden'] == 3) {
      ctx.fillStyle = "#666666";
    } else {
      ctx.fillStyle = "black";
    }
    ctx.beginPath();
    for (let [i, unused] of Object.entries(state['garden_pellets'])) {
      let XY = GetXYForGardenPlot(i);
      ctx.rect(upper_left.x+garden_size*XY.x,
               upper_left.y+garden_size*XY.y,
               garden_size*XY.w,
               garden_size*XY.h);
    }
    ctx.fill();
    if (state['garden'] <= 2) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      ctx.strokeStyle = "black";
    }
  }

  // TODO(mgeorg) pick font size so it fits.
  ctx.font = "25px Arial";
  let measure = ctx.measureText("Garden");
  ctx.fillStyle = "black";
  ctx.fillText("Garden", center.x - measure.width/2, center.y+12);
  if (state['garden'] <= 2 && 'garden_pellets' in state &&
      Object.keys(state['garden_pellets']).length > 0) {
    measure = ctx.measureText("Click to Harvest");
    ctx.fillStyle = "black";
    ctx.fillText("Click to Harvest",
                 center.x - measure.width/2, center.y+12+garden_size/4);
  }

  garden_boundary_path = new Path2D();
  garden_boundary_path.lineWidth = 2;
  garden_boundary_path.moveTo(upper_left.x, upper_left.y);
  garden_boundary_path.lineTo(upper_left.x+garden_size, upper_left.y);
  garden_boundary_path.lineTo(
      upper_left.x+garden_size, upper_left.y+garden_size);
  garden_boundary_path.lineTo(upper_left.x, upper_left.y+garden_size);
  garden_boundary_path.closePath();
  ctx.stroke(garden_boundary_path);

}

function GardenClick(num, click) {
  let width = main_canvas.width;
  let height = main_canvas.height;

  let garden_size = Math.min(width/2, height/2);
  let center = {x: width/4, y: height/4};
  let upper_left = {x: center.x - garden_size/2, y: center.y - garden_size/2};

  if (state['garden_pellets']) {
    let dists = [];
    for (let [i, unused] of Object.entries(state['garden_pellets'])) {
      let XY = GetXYForGardenPlot(i);
      let x = upper_left.x+garden_size*(XY.x+XY.w/2);
      let y = upper_left.y+garden_size*(XY.y+XY.h/2);
      let dist2 = (click.x - x)*(click.x - x) + (click.y - y)*(click.y - y);
      dists.push([dist2, Number(i)]);
    }
    dists.sort(function(a, b){return a[0]-b[0]});
    for (let iter = 0; iter < num && iter < dists.length; ++iter) {
      state['pellets'] += 1;
      delete state['garden_pellets'][dists[iter][1]];
    }
  }
}

function DrawCursor(params) {
  let width = main_canvas.width * params.scale;
  let height = main_canvas.height * params.scale;

  ctx.fillStyle = 'black';
  ctx.lineWidth = 1;

  // ctx.lineWidth = 3;
  // ctx.beginPath();
  // ctx.moveTo(params.x, params.y);
  // ctx.lineTo(params.x+width, params.y);
  // ctx.lineTo(params.x+width, params.y+height);
  // ctx.lineTo(params.x, params.y+height);
  // ctx.lineTo(params.x, params.y);
  // ctx.stroke();

  let mouth_direction = 0;
  let outer_mouth_arc = Math.PI / 4;
  let inner_mouth_arc = Math.PI / 4;
  let cursor_radius = height/4;
  let pellet_radius = height/24;
  let mouth_ratio = 3/4;
  let cursor_center = {x: params.x + cursor_radius + width/20,
                       y: params.y + height/2};
  let x_offset = 0;
  let y_offset = 15 * params.scale;
  let font_size = Math.floor(40 * params.scale);
  let crush_text = 1;
  let first_pellet_size = 1;
  if (state['show_box']) {
    cursor_center.y = main_canvas.height - cursor_radius - width/20;
  }

  if (state['init'] && state['init']['phase'] in fractal_param['init']) {
    ctx.font = font_size + "px Arial";
    let measure = ctx.measureText("Click");
    let draw_text = false;
    let draw_line = false;
    let phase = state['init']['phase'];
    let max_click = fractal_param['init'][phase][0];
    let ratio =  state['init'][phase] / max_click;
    let external_line_size = 0;
    if (phase == 'intro') {
      cursor_radius = cursor_radius + width*11/16 * (1-ratio);
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
      outer_mouth_arc = Math.PI *(1 / 4 - 1/360) * (1-ratio) + Math.PI / 360;
      inner_mouth_arc = Math.PI *(1 / 4 - 1/360) * (1-ratio) + Math.PI / 360;
      if (ratio > .5) {
        crush_text = 1-(ratio*2 - 1);
        line_width = (1-crush_text)*4.9 + .1;
        draw_line = true;
      }
      draw_text = true;
      first_pellet_size = 0;
    } else if (phase == 'open_mouth') {
      outer_mouth_arc = Math.PI *(1 / 4 - 1/360) * (ratio) + Math.PI / 360;
      inner_mouth_arc = Math.PI *(1 / 4 - 1/360) * (ratio) + Math.PI / 360;
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
      line_width = 4 * (1-ratio) + 1;
      draw_line = true;
      external_line_size = Math.floor(state['init'][phase] / 8) * 8 / max_click;
      first_pellet_size = 0;
    } else if (phase == 'cut_line') {
      outer_mouth_arc = Math.PI *(1 / 4 - 1/360) * (1-ratio) + Math.PI / 360;
      inner_mouth_arc = Math.PI *(1 / 4 - 1/8) * (1-ratio) + Math.PI / 8;
      external_line_size = 1;
      line_width=1;
      draw_line = true;
      first_pellet_size = 0;
    } else if (phase == 'open_mouth2') {
      line_width=1;
      draw_line = true;
      outer_mouth_arc = Math.PI *(1 / 4 - 1/360) * (ratio) + Math.PI / 360;
      inner_mouth_arc = Math.PI *(1 / 4 - 1/8) * (ratio) + Math.PI / 8;
    } else if (phase == 'idle') {
      line_width=1;
      draw_line = true;
    } else if (phase == 'make_line') {
      let mod_val =  (state['init'][phase] % 14);
      if (mod_val == 0) {
        mouth_ratio = 3/4;
      } else if (mod_val == 1) {
        mouth_ratio = 1/2;
      } else if (mod_val == 2) {
        mouth_ratio = 1/3;
      } else if (mod_val == 3) {
        mouth_ratio = 1/4;
      } else if (mod_val == 4) {
        mouth_ratio = 1/6;
      } else if (mod_val == 5) {
        mouth_ratio = 1/8;
      } else if (mod_val == 6) {
        mouth_ratio = 1/16;
      } else if (mod_val == 7) {
        mouth_ratio = 1/8;
      } else if (mod_val == 8) {
        mouth_ratio = 1/6;
      } else if (mod_val == 9) {
        mouth_ratio = 1/4;
      } else if (mod_val == 10) {
        mouth_ratio = 1/3;
      } else if (mod_val == 11) {
        mouth_ratio = 1/2;
      } else if (mod_val == 12) {
        mouth_ratio = 3/4;
      } else if (mod_val == 13) {
        mouth_ratio = 1;
      }
      line_width=1;
      draw_line = true;
      gated_ratio = Math.floor((state['init'][phase]+1) / 14) * 14 / max_click;
      first_pellet_size = 1-gated_ratio;
      external_line_size = gated_ratio;
    }
    if (draw_text) {
      let stored_transform = ctx.getTransform();
      ctx.lineWidth = 1;
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
        ctx.setTransform(stored_transform);
      }
    }
    if (draw_line) {
      ctx.beginPath();
      ctx.lineWidth = line_width;
      ctx.moveTo(cursor_center.x, cursor_center.y);
      ctx.lineTo(cursor_center.x + cursor_radius, cursor_center.y);
      ctx.stroke();
    }
    if (external_line_size > 0) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.moveTo(cursor_center.x + cursor_radius, cursor_center.y);
      ctx.lineTo(params.x+2*cursor_radius+width/20+
                 (width*18/20-2*cursor_radius)*external_line_size,
                 cursor_center.y);
      ctx.stroke();
    }
  }

  cursor_path = new Path2D();
  cursor_path.arc(cursor_center.x, cursor_center.y, cursor_radius,
                  outer_mouth_arc/2 + mouth_direction,
                  - outer_mouth_arc/2 + mouth_direction, false);
  cursor_path.arc(cursor_center.x, cursor_center.y, cursor_radius * mouth_ratio,
                  - inner_mouth_arc/2 + mouth_direction,
                  inner_mouth_arc/2 + mouth_direction, false);
  cursor_path.closePath();
  ctx.lineWidth = 2;
  ctx.stroke(cursor_path);

  if ('line' in state && state['line'] > 0 && !state['show_box']) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    for (let i = 0; i < state['line']; ++i) {
      ctx.moveTo(cursor_center.x + cursor_radius,
                 params.y+height*(19-i)/20);
      ctx.lineTo(params.x+width*19/20,
                 params.y+height*(19-i)/20);
    }
    ctx.stroke();
  }

  if (state['pellets'] > 0 || state['pellet_loaded'] > 0) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'transparent';
    ctx.fillStyle = 'black';
    if (state['pellet_loaded'] > 0) {
      ctx.arc(cursor_center.x, cursor_center.y,
              pellet_radius*first_pellet_size, 0, 2*Math.PI, false);
    }
    for (let i = 0; i < state['pellets']; ++i) {
      let x = cursor_center.x
              - (pellet_radius * 2.5 + cursor_radius) * Math.sqrt(2) / 2;
      let y = cursor_center.y
              - (pellet_radius * 2.5 + cursor_radius) * Math.sqrt(2) / 2
              - (2.5*i) * pellet_radius;
      ctx.moveTo(x+pellet_radius, y);
      ctx.arc(x, y, pellet_radius, 0, 2*Math.PI, false);
      if (y < - pellet_radius) {
        break;
      }
    }
    ctx.fill();
    ctx.strokeStyle = 'black';
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


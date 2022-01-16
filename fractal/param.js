var fractal_param = {
  'start_state': {
    'init': {'phase': 'intro', 'intro': 0},
    'bought': {},
    'unlocked': {},
    'tick': 0,
    'cursor_clicks': 0,
    'pellets': 1,
    'click': 0,
    'points': 0
  },
  'init': {
    'intro': [100, 'make_mouth', {}],
    'make_mouth': [25, 'turn_mouth', {}],
    'turn_mouth': [100, 'move_text', {}],
    'move_text': [100, 'crush_text', {}],
    'crush_text': [100, 'open_mouth', {}],
    'open_mouth': [25, 'make_line1', {}],
    'make_line': [14*25, 'cut_line', {}],
    'make_line1': [8*25, 'cut_line', {}],
    'cut_line': [25, 'open_mouth2', {'line': 1, 'pellets': -1}],
    'open_mouth2': [25, 'idle', {}],
    'unknown': 'unknown'
  },
  'achievements': {
    'auto_cursor_click': {
      'unlock': {'points': 10},
      'cost': {'points': 60},
      'title': 'Auto Cursor Click',
      'text': 'Save that finger.',
      'max_buy': 1,
      'display_message': 'With great relief, a snail emerges into the world.',
    },
    'buy_pellets': {
      'unlock': {'line': 1},
      'cost': {'line': 1},
      'title': 'Buy Pellets',
      'text': 'Without fuel nothing moves.',
      'max_buy': 1,
      'display_message': 'Tied to a never ending cycle...',
    },
    'make_box': {
      'unlock': {'line': 4},
      'cost': {'line': 4},
      'title': 'Make a box',
      'text': 'To put things in',
      'max_buy': 1,
      'display_message': 'It is the packaging that matters more than the contents.',
    },
    'unknown': {'unlock': {'unknown': 1}, 'cost': {'unknown': 1}}
  },
  'unknown': {}
};

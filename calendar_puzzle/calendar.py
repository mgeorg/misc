#!/usr/bin/python3

import sys
import datetime

solve_for_all = True
print_impossible = False

use_cross = None
use_line = None
normal_rectangle = True

use_current_day = True
month = 'Feb'
day = 29

month_abbr = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

if use_current_day:
  current_time = datetime.datetime.now()
  month = month_abbr[current_time.month-1]
  day = current_time.day

empty_board = [True] * (7*7)
empty_board[0*7+6] = False
empty_board[1*7+6] = False
empty_board[6*7+3] = False
empty_board[6*7+4] = False
empty_board[6*7+5] = False
empty_board[6*7+6] = False

month_to_index = {
  month_abbr[0]: 0*7+0,
  month_abbr[1]: 0*7+1,
  month_abbr[2]: 0*7+2,
  month_abbr[3]: 0*7+3,
  month_abbr[4]: 0*7+4,
  month_abbr[5]: 0*7+5,
  month_abbr[6]: 1*7+0,
  month_abbr[7]: 1*7+1,
  month_abbr[8]: 1*7+2,
  month_abbr[9]: 1*7+3,
  month_abbr[10]: 1*7+4,
  month_abbr[11]: 1*7+5,
}

day_to_index = {
  1: 2*7+0,
  2: 2*7+1,
  3: 2*7+2,
  4: 2*7+3,
  5: 2*7+4,
  6: 2*7+5,
  7: 2*7+6,
  8: 3*7+0,
  9: 3*7+1,
  10: 3*7+2,
  11: 3*7+3,
  12: 3*7+4,
  13: 3*7+5,
  14: 3*7+6,
  15: 4*7+0,
  16: 4*7+1,
  17: 4*7+2,
  18: 4*7+3,
  19: 4*7+4,
  20: 4*7+5,
  21: 4*7+6,
  22: 5*7+0,
  23: 5*7+1,
  24: 5*7+2,
  25: 5*7+3,
  26: 5*7+4,
  27: 5*7+5,
  28: 5*7+6,
  29: 6*7+0,
  30: 6*7+1,
  31: 6*7+2,
}

index_to_name = [
  month_abbr[0],
  month_abbr[1],
  month_abbr[2],
  month_abbr[3],
  month_abbr[4],
  month_abbr[5],
  '---',

  month_abbr[6],
  month_abbr[7],
  month_abbr[8],
  month_abbr[9],
  month_abbr[10],
  month_abbr[11],
  '---',

  ' 1 ',
  ' 2 ',
  ' 3 ',
  ' 4 ',
  ' 5 ',
  ' 6 ',
  ' 7 ',

  ' 8 ',
  ' 9 ',
  ' 10',
  ' 11',
  ' 12',
  ' 13',
  ' 14',

  ' 15',
  ' 16',
  ' 17',
  ' 18',
  ' 19',
  ' 20',
  ' 21',

  ' 22',
  ' 23',
  ' 24',
  ' 25',
  ' 26',
  ' 27',
  ' 28',

  ' 29',
  ' 30',
  ' 31',
  '---',
  '---',
  '---',
  '---',
]

pieces = [
  [
    'xxx\n'
    'xxx\n',

    'xx\n'
    'xx\n'
    'xx\n',
  ],
  [
    '.xx\n'
    'xxx\n',

    'xx.\n'
    'xxx\n',

    'xxx\n'
    'xx.\n',

    'xxx\n'
    '.xx\n',

    '.x\n'
    'xx\n'
    'xx\n',

    'x.\n'
    'xx\n'
    'xx\n',

    'xx\n'
    'xx\n'
    'x.\n',

    'xx\n'
    'xx\n'
    '.x\n',
  ],
  [
    'x..\n'
    'x..\n'
    'xxx\n',

    'xxx\n'
    'x..\n'
    'x..\n',

    'xxx\n'
    '..x\n'
    '..x\n',

    '..x\n'
    '..x\n'
    'xxx\n',
  ],
  [
    'x.x\n'
    'xxx\n',

    'xxx\n'
    'x.x\n',

    'xx\n'
    'x.\n'
    'xx\n',

    'xx\n'
    '.x\n'
    'xx\n',
  ],
  [
    'xxxx\n'
    '...x\n',

    '...x\n'
    'xxxx\n',

    'xxxx\n'
    'x...\n',

    'x...\n'
    'xxxx\n',

    'xx\n'
    'x.\n'
    'x.\n'
    'x.\n',

    'x.\n'
    'x.\n'
    'x.\n'
    'xx\n',

    'xx\n'
    '.x\n'
    '.x\n'
    '.x\n',

    '.x\n'
    '.x\n'
    '.x\n'
    'xx\n',
  ],
  [
    'xxxx\n'
    '..x.\n',

    '..x.\n'
    'xxxx\n',

    'xxxx\n'
    '.x..\n',

    '.x..\n'
    'xxxx\n',

    'x.\n'
    'xx\n'
    'x.\n'
    'x.\n',

    'x.\n'
    'x.\n'
    'xx\n'
    'x.\n',

    '.x\n'
    'xx\n'
    '.x\n'
    '.x\n',

    '.x\n'
    '.x\n'
    'xx\n'
    '.x\n',
  ],
  [
    'xxx.\n'
    '..xx\n',

    '..xx\n'
    'xxx.\n',

    '.xxx\n'
    'xx..\n',

    'xx..\n'
    '.xxx\n',

    '.x\n'
    'xx\n'
    'x.\n'
    'x.\n',

    'x.\n'
    'x.\n'
    'xx\n'
    '.x\n',

    'x.\n'
    'xx\n'
    '.x\n'
    '.x\n',

    '.x\n'
    '.x\n'
    'xx\n'
    'x.\n',
  ],
  [
    'xx.\n'
    '.x.\n'
    '.xx\n',

    '.xx\n'
    '.x.\n'
    'xx.\n',

    'x..\n'
    'xxx\n'
    '..x\n',

    '..x\n'
    'xxx\n'
    'x..\n',
  ],
]

if use_cross is not None:
  pieces[use_cross] = [
    '.x.\n'
    'xxx\n'
    '.x.\n',
  ]

if not normal_rectangle:
  pieces[0] = [
    'xx.\n'
    'xxx\n'
    '.x.\n',

    '.xx\n'
    'xxx\n'
    '.x.\n',

    '.x.\n'
    'xxx\n'
    '.xx\n',

    '.x.\n'
    'xxx\n'
    'xx.\n',
  ]

if use_line is not None:
  if use_line == 0:
    pieces[use_line] = [
      'xxxxxx\n',

      'x\n'
      'x\n'
      'x\n'
      'x\n'
      'x\n'
      'x\n',
    ]
  else:
    pieces[use_line] = [
      'xxxxx\n',

      'x\n'
      'x\n'
      'x\n'
      'x\n'
      'x\n',
    ]

unicode_to_ascii_art = {
  '─': '-',
  '│': '|',
  '┐': '\\',
  '└': '\\',
  '┘': '/',
  '┌': '/',
}

for p in pieces:
  for i in range(len(p)):
    p[i] = [[char == 'x' for char in line.strip()] for line in p[i].strip().splitlines()]

def BoardForDate(month, day):
  b = Board()
  b.InitWithDate(month, day)
  return b

class Board(object):
  def __init__(self):
    pass

  def InitWithDate(self, month, day):
    self.uncovered = empty_board[:]
    self.target = [month_to_index[month], day_to_index[day]]
    self.uncovered[self.target[0]] = False
    self.uncovered[self.target[1]] = False
    self.used = [None] * len(pieces)

  def Clone(self):
    b = Board()
    b.uncovered = self.uncovered[:]
    b.used = self.used[:]
    b.target = self.target
    return b

  def IsImpossible(self):
    for row in range(7):
      for col in range(7):
        if self.uncovered[row*7+col]:
          # print((row, col))
          # Find something that covers this block.
          found = False
          for piece_index in range(len(pieces)):
            if self.used[piece_index] is not None:
              continue
            # print((piece_index, row, col))
            for orientation in range(len(pieces[piece_index])):
              # print((piece_index, orientation, row, col))
              cover = pieces[piece_index][orientation]
              for i in range(len(cover)):
                for j in range(len(cover[0])):
                  if cover[i][j]:
                    new_row = row-i
                    new_col = col-j
                    if new_row >= 0 and new_col >= 0:
                      b = self.Place(piece_index, orientation, new_row, new_col)
                      if b is not None:
                        # print('FOUND' + str((piece_index, orientation, row, col)))
                        # print(cover)
                        # print(str(b))
                        found = True
                        break
                if found:
                  break
              if found:
                break
            if found:
              break
          if not found:
            return True
    return False
              
    
  def Place(self, piece_index, orientation, row, col):
    if self.used[piece_index] is not None:
      return None
    cover = pieces[piece_index][orientation]
    if len(cover) + row > 7:
      return None
    if len(cover[0]) + col > 7:
      return None
    for i in range(len(cover)):
      for j in range(len(cover[i])):
        if cover[i][j]:
          if not self.uncovered[(row+i)*7+col+j]:
            return None
    b = self.Clone()
    b.used[piece_index] = (orientation, row, col)
    for i in range(len(cover)):
      for j in range(len(cover[i])):
        if cover[i][j]:
          b.uncovered[(row+i)*7+col+j] = False
    return b

  def All(self, piece_index):
    if self.used[piece_index] is not None:
      return
    for orientation in range(len(pieces[piece_index])):
      cover = pieces[piece_index][orientation]
      for row in range(7-len(cover)+1):
        for col in range(7-len(cover[0])+1):
          b = self.Place(piece_index, orientation, row, col)
          if b is not None:
            yield b

  def IsCovered(self, row, col):
    return not self.uncovered[row*7+col]
    
  def PrettyStr(self):
    grid = list()
    for i in range(len(empty_board)):
      grid.append(['       ', '  ', index_to_name[i], '  ', '       '])
    # grid[self.target[0]] = (
        # [' ***** ', ' *', index_to_name[self.target[0]], '* ', ' ***** '])
    # grid[self.target[1]] = (
        # [' ***** ', ' *', index_to_name[self.target[1]], '* ', ' ***** '])
    for piece_index, elem in enumerate(self.used):
      if elem is None:
        continue
      orientation, row, col = elem
      cover = pieces[piece_index][orientation]
      for i in range(len(cover)):
        for j in range(len(cover[0])):
          if cover[i][j]:
            pic = grid[(row+i)*7+col+j]
            left = False
            up = False
            right = False
            down = False
            upright = False
            upleft = False
            downright = False
            downleft = False
            if i-1 >= 0 and cover[i-1][j]:
              up = True
            if i+1 < len(cover) and cover[i+1][j]:
              down = True
            if j-1 >= 0 and cover[i][j-1]:
              left = True
            if j+1 < len(cover[0]) and cover[i][j+1]:
              right = True
            if (i-1 >= 0 and j-1 >= 0 and
                cover[i-1][j-1] and cover[i-1][j-1]):
              upleft = True
            if (i-1 >= 0 and j+1 < len(cover[0]) and
                cover[i-1][j+1] and cover[i-1][j+1]):
              upright = True
            if (i+1 < len(cover) and j-1 >= 0 and
                cover[i+1][j-1] and cover[i+1][j-1]):
              downleft = True
            if (i+1 < len(cover) and j+1 < len(cover[0]) and
                cover[i+1][j+1] and cover[i+1][j+1]):
              downright = True
            pic = [' ───── ', ' │', index_to_name[(row+i)*7+col+j],
                   '│ ', ' ───── ']
            if up:
              pic[0] = ''
              if left:
                if upleft:
                  pic[0] += '  '
                else:
                  pic[0] += '-┘'
              else:
                pic[0] += ' │'
              pic[0] += '   '
              if right:
                if upright:
                  pic[0] += '  '
                else:
                  pic[0] += '└-'
              else:
                pic[0] += '│ '
            else:
              pic[0] = ''
              if left:
                pic[0] += '--'
              else:
                pic[0] += ' ┌'
              pic[0] += '---'
              if right:
                pic[0] += '--'
              else:
                pic[0] += '\\ '
            if down:
              pic[4] = ''
              if left:
                if downleft:
                  pic[4] += '  '
                else:
                  pic[4] += '-\\'
              else:
                pic[4] += ' │'
              pic[4] += '   '
              if right:
                if downright:
                  pic[4] += '  '
                else:
                  pic[4] += '┌-'
              else:
                pic[4] += '│ '
            else:
              pic[4] = ''
              if left:
                pic[4] += '--'
              else:
                pic[4] += ' └'
              pic[4] += '---'
              if right:
                pic[4] += '--'
              else:
                pic[4] += '┘ '
            if left:
              pic[1] = '  '
            if right:
              pic[3] = '  '
            grid[(row+i)*7+col+j] = pic
    output = list()
    for row in range(7):
      output.append('')
      output.append('')
      output.append('')
      for col in range(7):
        if row == 0 and col == 6:
          continue
        if row == 1 and col == 6:
          continue
        if row == 6 and col >= 3:
          continue
        pic = grid[row*7+col]
        output[-3] += pic[0]
        output[-2] += pic[1]+pic[2]+pic[3]
        output[-1] += pic[4]
    return '\n'.join(output)

  def PrettyStrLarge(self):
    solved = False
    if sum([x is not None for x in self.used]) == len(self.used):
      solved = True
    grid = list()
    for i in range(len(empty_board)):
      grid.append(['           ', '  ', '  ' + index_to_name[i] + '  ',
                   '  ', '           '])
    if not solved:
      i = self.target[0]
      grid[i] = ['           ', '   ┌───┐   ', '  ',
                 ' │' + index_to_name[i] + '│ ',
                 '  ','   └───┘   ', '           ']
      i = self.target[1]
      grid[i] = ['           ', '   ┌───┐   ', '  ',
                 ' │' + index_to_name[i] + '│ ',
                 '  ','   └───┘   ', '           ']
    for piece_index, elem in enumerate(self.used):
      if elem is None:
        continue
      orientation, row, col = elem
      cover = pieces[piece_index][orientation]
      for i in range(len(cover)):
        for j in range(len(cover[0])):
          if cover[i][j]:
            pic = grid[(row+i)*7+col+j]
            left = False
            up = False
            right = False
            down = False
            upright = False
            upleft = False
            downright = False
            downleft = False
            if i-1 >= 0 and cover[i-1][j]:
              up = True
            if i+1 < len(cover) and cover[i+1][j]:
              down = True
            if j-1 >= 0 and cover[i][j-1]:
              left = True
            if j+1 < len(cover[0]) and cover[i][j+1]:
              right = True
            if (i-1 >= 0 and j-1 >= 0 and
                cover[i-1][j-1] and cover[i-1][j-1]):
              upleft = True
            if (i-1 >= 0 and j+1 < len(cover[0]) and
                cover[i-1][j+1] and cover[i-1][j+1]):
              upright = True
            if (i+1 < len(cover) and j-1 >= 0 and
                cover[i+1][j-1] and cover[i+1][j-1]):
              downleft = True
            if (i+1 < len(cover) and j+1 < len(cover[0]) and
                cover[i+1][j+1] and cover[i+1][j+1]):
              downright = True
            pic = [' ───────── ', ' │', '  '+ index_to_name[(row+i)*7+col+j] + '  ',
                   '│ ', ' ───────── ']
            if up:
              pic[0] = ''
              if left:
                if upleft:
                  pic[0] += '  '
                else:
                  pic[0] += '─┘'
              else:
                pic[0] += ' │'
              pic[0] += '       '
              if right:
                if upright:
                  pic[0] += '  '
                else:
                  pic[0] += '└─'
              else:
                pic[0] += '│ '
            else:
              pic[0] = ''
              if left:
                pic[0] += '──'
              else:
                pic[0] += ' ┌'
              pic[0] += '───────'
              if right:
                pic[0] += '──'
              else:
                pic[0] += '┐ '
            if down:
              pic[4] = ''
              if left:
                if downleft:
                  pic[4] += '  '
                else:
                  pic[4] += '─┐'
              else:
                pic[4] += ' │'
              pic[4] += '       '
              if right:
                if downright:
                  pic[4] += '  '
                else:
                  pic[4] += '┌─'
              else:
                pic[4] += '│ '
            else:
              pic[4] = ''
              if left:
                pic[4] += '──'
              else:
                pic[4] += ' └'
              pic[4] += '───────'
              if right:
                pic[4] += '──'
              else:
                pic[4] += '┘ '
            if left:
              pic[1] = '  '
            if right:
              pic[3] = '  '
            grid[(row+i)*7+col+j] = pic
    output = list()
    for row in range(7):
      output.append('')
      output.append('')
      output.append('')
      output.append('')
      output.append('')
      for col in range(7):
        if row == 0 and col == 6:
          continue
        if row == 1 and col == 6:
          continue
        if row == 6 and col >= 3:
          continue
        pic = grid[row*7+col]
        if not solved and ((row*7 + col) == self.target[0] or
                           (row*7 + col) == self.target[1]):
          output[-5] += pic[0]
          output[-4] += pic[1]
          output[-3] += pic[2]+pic[3]+pic[4]
          output[-2] += pic[5]
          output[-1] += pic[6]
        else:
          output[-5] += pic[0]
          output[-4] += pic[1]+'       '+pic[3]
          output[-3] += pic[1]+pic[2]+pic[3]
          output[-2] += pic[1]+'       '+pic[3]
          output[-1] += pic[4]
    return '\n'.join(output)

  def __str__(self):
    return self.PrettyStrLarge()
    output = list()
    for row in range(7):
      output.append('')
      output.append('')
      output.append('')
      for col in range(7):
        if row == 0 and col == 6:
          continue
        if row == 1 and col == 6:
          continue
        if row == 6 and col >= 3:
          continue
        if self.IsCovered(row, col):
          output[-3] += 'XXXXX'
          output[-2] += 'X' + index_to_name[row*7+col] + 'X'
          output[-1] += 'XXXXX'
        else:
          output[-3] += '     '
          output[-2] += ' ' + index_to_name[row*7+col] + ' '
          output[-1] += '     '
    return '\n'.join(output)

# print(pieces)
orig = BoardForDate(month, day)

# a = orig.Place(0,1,4,1)
# print(str(a))
# print(a.IsImpossible())

# a = a.Place(2,0,6,0)
# print(str(a))

solved = list()
# print(str(orig))
for b in orig.All(6):
  if b.IsImpossible():
    if print_impossible:
      print()
      print('IMPOSSIBLE')
      print(str(b))
    continue
  for b2 in b.All(7):
    if b2.IsImpossible():
      if print_impossible:
        print()
        print('IMPOSSIBLE')
        print(str(b2))
      continue
    # print(str(b2))
    for b3 in b2.All(2):
      if b3.IsImpossible():
        continue
      # print(str(b3))
      for b4 in b3.All(5):
        if b4.IsImpossible():
          continue
        for b5 in b4.All(4):
          if b5.IsImpossible():
            continue
          for b6 in b5.All(3):
            if b6.IsImpossible():
              continue
            for b7 in b6.All(0):
              if b7.IsImpossible():
                continue
              for b8 in b7.All(1):
                solved.append(b8)
                print('SOLUTION' + str(len(solved)))
                print(b8.used)
                print(str(b8))
                if not solve_for_all:
                  sys.exit(0)

total = len(solved)

common_counts = dict()
for s in solved:
  for piece_index, elem in enumerate(s.used):
    if elem is None:
      continue
    orientation, row, col = elem
    pos = (piece_index, orientation, row, col)
    common_counts[pos] = common_counts.get(pos, 0) + 1
    # cover = pieces[piece_index][orientation]

common_counts2 = dict()
for s in solved:
  for piece_index1, elem1 in enumerate(s.used):
    if elem1 is None:
      continue
    orientation1, row1, col1 = elem1
    for piece_index2 in range(piece_index1+1, len(s.used)):
      elem2 = s.used[piece_index2]
      if elem2 is None:
        continue
      orientation2, row2, col2 = elem2
      pos1 = (piece_index1, orientation1, row1, col1)
      pos2 = (piece_index2, orientation2, row2, col2)
      common_counts2[(pos1, pos2)] = common_counts2.get((pos1, pos2), 0) + 1

# print(common_counts)
common = sorted(common_counts.items(), key=lambda x: (x[1], x[0]))
common = list(filter(lambda x: x[1] > 1, common))
print(common)

for i in range(max(0, len(common)-10), len(common)):
  piece_index, orientation, row, col = common[i][0]
  count = common[i][1]
  print()
  print(f'Most common position {count} of {total} ({count/total*100:.2f}%)')
  b = orig.Place(piece_index, orientation, row, col)
  assert b
  print(str(b))

common2 = sorted(common_counts2.items(), key=lambda x: (x[1], x[0]))
common2 = list(filter(lambda x: x[1] > 1, common2))
print(common2)

print('X' * 78)
print('X' * 78)
print('X' * 78)

for i in range(max(0, len(common2)-10), len(common2)):
  pos1, pos2 = common2[i][0]
  piece_index1, orientation1, row1, col1 = pos1
  piece_index2, orientation2, row2, col2 = pos2
  count = common2[i][1]
  print()
  print(f'Most common double position {count} of {total} ({count/total*100:.2f}%)')
  b = orig.Place(piece_index1, orientation1, row1, col1)
  assert b
  b = b.Place(piece_index2, orientation2, row2, col2)
  assert b
  print(str(b))

print('X' * 78)
print('X' * 78)
print('X' * 78)
print('Found ' + str(len(solved)) + ' solutions')
print('X' * 78)
print('X' * 78)
print('X' * 78)

print('\n\n'.join([str(x) for x in solved]))
# print('\n\n'.join([str(x.used) for x in solved]))
print('Found ' + str(len(solved)) + ' solutions')



#!/usr/bin/python3

empty_board = [True] * (7*7)
empty_board[0*7+6] = False
empty_board[1*7+6] = False
empty_board[6*7+3] = False
empty_board[6*7+4] = False
empty_board[6*7+5] = False
empty_board[6*7+6] = False

month_to_index = {
  'jan': 0*7+0,
  'feb': 0*7+1,
  'mar': 0*7+2,
  'apr': 0*7+3,
  'may': 0*7+4,
  'jun': 0*7+5,
  'jul': 1*7+0,
  'aug': 1*7+1,
  'sep': 1*7+2,
  'oct': 1*7+3,
  'nov': 1*7+4,
  'dec': 1*7+5,
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
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  '---',

  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
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
    self.uncovered[month_to_index[month]] = False
    self.uncovered[day_to_index[day]] = False
    self.used = [None] * len(pieces)

  def Clone(self):
    b = Board()
    b.uncovered = self.uncovered[:]
    b.used = self.used[:]
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
                        print('FOUND' + str((piece_index, orientation, row, col)))
                        print(str(self))
                        print(cover)
                        print(str(b))
                        found = True
                        break
                if found:
                  break
              if found:
                break
            if found:
              break
          if not found:
            return False
    return True
              
    
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
    
  def __str__(self):
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
orig = BoardForDate('jan', 1)

a = orig.Place(0,1,4,1)
print(str(a))
print(a.IsImpossible())
a = a.Place(2,0,6,0)
print(str(a))

assert False
print(str(orig))
for b in orig.All(0):
  if b.IsImpossible():
    print()
    print('IMPOSSIBLE')
    print(str(b))
    continue
  break
  for b2 in b.All(1):
    # print(str(b2))
    for b3 in b2.All(2):
      # print(str(b3))
      for b4 in b3.All(3):
        for b5 in b4.All(4):
          for b6 in b5.All(5):
            for b7 in b6.All(6):
              for b8 in b7.All(7):
                print(str(b8))
                print(b8.pieces)



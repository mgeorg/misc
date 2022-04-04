#!/usr/bin/python3

import copy
import datetime

unicode_to_ascii_art = {
  '─': '-',
  '│': '|',
  '┐': '\\',
  '└': '\\',
  '┘': '/',
  '┌': '/',
}

class Board(object):
  def __init__(self, context):
    self.context = context

  def InitWithDate(self, month, day):
    self.uncovered = self.context.empty_board[:]
    self.target = [self.context.month_to_index[month],
                   self.context.day_to_index[day]]
    self.uncovered[self.target[0]] = False
    self.uncovered[self.target[1]] = False
    self.used = [None] * len(self.context.pieces)

  def InitWithUsed(self, target, used):
    self.used = used[:]
    self.target = target[:]
    self.ResetUncovered()

  def ResetUncovered(self):
    self.uncovered = self.context.empty_board[:]
    self.uncovered[self.target[0]] = False
    self.uncovered[self.target[1]] = False
    for piece_index, elem in enumerate(self.used):
      if elem is None:
        continue
      orientation, row, col = elem
      cover = self.context.pieces[piece_index][orientation]
      for i in range(len(cover)):
        for j in range(len(cover[0])):
          if cover[i][j]:
            index = (row+i)*7+col+j
            self.uncovered[index] = False
    
  def Clone(self):
    b = Board(self.context)
    b.uncovered = self.uncovered[:]
    b.used = self.used[:]
    b.target = self.target
    return b

  def FloodFill(self, group_id, row, col, visited, num_neighbors):
    if visited[row*7+col] == -1:
      neighbor_count = 0
      count = 1
      visited[row*7+col] = group_id
      if row-1 >= 0 and self.uncovered[(row-1)*7+col]:
        neighbor_count += 1
        count += self.FloodFill(group_id, row-1, col, visited, num_neighbors)
      if row+1 < 7 and self.uncovered[(row+1)*7+col]:
        neighbor_count += 1
        count += self.FloodFill(group_id, row+1, col, visited, num_neighbors)
      if col-1 >= 0 and self.uncovered[row*7+col-1]:
        neighbor_count += 1
        count += self.FloodFill(group_id, row, col-1, visited, num_neighbors)
      if col+1 < 7 and self.uncovered[row*7+col+1]:
        neighbor_count += 1
        count += self.FloodFill(group_id, row, col+1, visited, num_neighbors)
      num_neighbors[row*7+col] = neighbor_count
      return count
    else:
      return 0

  def AddPossible(self, possible, piece_index, orientation, row, col):
    cover = self.context.pieces[piece_index][orientation]
    for i in range(len(cover)):
      for j in range(len(cover[0])):
        if cover[i][j]:
          index = (row+i)*7+col+j
          if possible[index] is None:
            possible[index] = set()
          possible[index].add((piece_index, orientation, row, col))

  def IsImpossiblePreliminaryCheck(self):
    visited = [-1]*len(self.uncovered)
    num_neighbors = [-1]*len(self.uncovered)
    group_id = 0
    have_six = self.used[self.context.have_six_piece_index] is None
    for row in range(7):
      for col in range(7):
        if self.uncovered[row*7+col]:
          count = self.FloodFill(group_id, row, col, visited, num_neighbors)
          if count > 0:
            if count % 5 != 0 and (not have_six or count % 5 != 1):
              return True
            group_id += 1
    return False

  def IsImpossible(self):
    # Flood fill.
    visited = [-1]*len(self.uncovered)
    num_neighbors = [-1]*len(self.uncovered)
    group_id = 0
    size_of_group = list()
    have_six = self.used[self.context.have_six_piece_index] is None
    for row in range(7):
      for col in range(7):
        if self.uncovered[row*7+col]:
          count = self.FloodFill(group_id, row, col, visited, num_neighbors)
          if count > 0:
            if count % 5 != 0 and (not have_six or count % 5 != 1):
              return (True, None)
            size_of_group.append(count)
            group_id += 1
    # print(visited)
    # print(size_of_group)
    # print(num_neighbors)
    # print(str(self))

    order = list()
    for row in range(7):
      for col in range(7):
        if self.uncovered[row*7+col]:
          # print(row*7+col)
          order.append(
              (num_neighbors[row*7+col],
               size_of_group[visited[row*7+col]],
               row, col))
    order.sort()
    # print(order)

    possible = [None]*len(self.uncovered)
    for unused_num_neighbors, unused_group_size, row, col in order:
      if possible[row*7+col] is not None:
        continue
      # print((row, col))
      # Find something that covers this block.
      found = False
      for piece_index in range(len(self.context.pieces)):
        if self.used[piece_index] is not None:
          continue
        # print((piece_index, row, col))
        for orientation in range(len(self.context.pieces[piece_index])):
          # print((piece_index, orientation, row, col))
          cover = self.context.pieces[piece_index][orientation]
          for i in range(len(cover)):
            for j in range(len(cover[0])):
              if cover[i][j]:
                new_row = row-i
                new_col = col-j
                if new_row >= 0 and new_col >= 0:
                  b = self.Place(piece_index, orientation, new_row, new_col)
                  if b is not None:
                    if b.IsImpossiblePreliminaryCheck():
                      continue
                    # print('FOUND' + str((piece_index, orientation, row, col)))
                    # print(cover)
                    # print(str(b))
                    self.AddPossible(possible, piece_index, orientation,
                                     new_row, new_col)
                    found = True
                    break
            if found:
              break
          if found:
            break
        if found:
          break
      if not found:
        return (True, None)

    # print('Found one for everything.')
    # print(possible)
    # Check for more than one.
    for unused_num_neighbors, unused_group_size, row, col in order:
      if len(possible[row*7+col]) >= 2:
        continue
      # print(f'Need something more for ({row}, {col}).')
      # Find something (else) that covers this block.
      found = False
      for piece_index in range(len(self.context.pieces)-1, -1, -1):
        if self.used[piece_index] is not None:
          continue
        # print((piece_index, row, col))
        for orientation in range(len(self.context.pieces[piece_index])-1, -1, -1):
          # print((piece_index, orientation, row, col))
          cover = self.context.pieces[piece_index][orientation]
          for i in range(len(cover)):
            for j in range(len(cover[0])):
              if cover[i][j]:
                new_row = row-i
                new_col = col-j
                if new_row >= 0 and new_col >= 0:
                  if (piece_index, orientation, new_row, new_col
                     ) in possible[row*7+col]:
                    continue
                  b = self.Place(piece_index, orientation, new_row, new_col)
                  if b is not None:
                    # Check that the placed piece is actually possible later
                    # down the line.
                    # Doing a more in depth check is not worth it.
                    if b.IsImpossiblePreliminaryCheck():
                      continue
                    # print('FOUND' + str((piece_index, orientation, row, col)))
                    # print(cover)
                    # print(str(b))
                    self.AddPossible(possible, piece_index, orientation,
                                     new_row, new_col)
                    found = True
                    break
            if found:
              break
          if found:
            break
        if found:
          break
        # if found and len(possible[row*7+col]) >= 2:
        # else:
        #   # Try to find two pieces.
        #   found = False
      if not found:
        # Returning early before checking all the other positions is
        # a large optimization.
        return (False, list(possible[row*7+col])[0])
    return (False, None)


  def Place(self, piece_index, orientation, row, col):
    if self.used[piece_index] is not None:
      return None
    cover = self.context.pieces[piece_index][orientation]
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
    for orientation in range(len(self.context.pieces[piece_index])):
      cover = self.context.pieces[piece_index][orientation]
      for row in range(7-len(cover)+1):
        for col in range(7-len(cover[0])+1):
          b = self.Place(piece_index, orientation, row, col)
          if b is not None:
            yield b

  def IsCovered(self, row, col):
    return not self.uncovered[row*7+col]
    
  def PrettyStrLarge(self):
    solved = False
    if sum([x is not None for x in self.used]) == len(self.used):
      solved = True
    grid = list()
    for i in range(len(self.context.empty_board)):
      grid.append(['           ', '  ',
                   '  ' + self.context.index_to_name[i] + '  ',
                   '  ', '           '])
    if not solved:
      i = self.target[0]
      grid[i] = ['           ', '   ┌───┐   ', '  ',
                 ' │' + self.context.index_to_name[i] + '│ ',
                 '  ','   └───┘   ', '           ']
      i = self.target[1]
      grid[i] = ['           ', '   ┌───┐   ', '  ',
                 ' │' + self.context.index_to_name[i] + '│ ',
                 '  ','   └───┘   ', '           ']
    for piece_index, elem in enumerate(self.used):
      if elem is None:
        continue
      orientation, row, col = elem
      cover = self.context.pieces[piece_index][orientation]
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
            pic = [' ───────── ', ' │', '  '+ self.context.index_to_name[(row+i)*7+col+j] + '  ',
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

  def SimpleStr(self):
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
          output[-2] += 'X' + self.context.index_to_name[row*7+col] + 'X'
          output[-1] += 'XXXXX'
        else:
          output[-3] += '     '
          output[-2] += ' ' + self.context.index_to_name[row*7+col] + ' '
          output[-1] += '     '
    return '\n'.join(output)

  def __str__(self):
    return self.PrettyStrLarge()


def RotatePiece(piece):
  cur =  [[char for char in line.strip()]
          for line in piece.splitlines()]
  new = list()
  for col in range(len(cur[0])):
    new.append([' '] * len(cur))
  for row in range(len(cur)):
    assert len(cur[row]) == len(cur[0])
    for col in range(len(cur[row])):
      new[col][len(cur)-row-1] = cur[row][col]
  return '\n'.join([''.join(x) for x in new])


def MirrorPiece(piece):
  cur =  [[char for char in line.strip()]
          for line in piece.splitlines()]
  new = list()
  for col in range(len(cur)):
    new.append([' '] * len(cur[0]))
  for row in range(len(cur)):
    assert len(cur[row]) == len(cur[0])
    for col in range(len(cur[row])):
      new[row][len(cur[0])-col-1] = cur[row][col]
  return '\n'.join([''.join(x) for x in new])


def AllOrientations(piece):
  orig = piece.strip()
  orientations = set()
  orientations.add(orig)
  # Non-mirrored rotations.
  p = RotatePiece(orig)
  orientations.add(p)
  p = RotatePiece(p)
  orientations.add(p)
  p = RotatePiece(p)
  orientations.add(p)
  # Mirror rotations.
  p = MirrorPiece(orig)
  orientations.add(p)
  p = RotatePiece(p)
  orientations.add(p)
  p = RotatePiece(p)
  orientations.add(p)
  p = RotatePiece(p)
  orientations.add(p)
  return sorted(orientations)


class BoardContext(object):
  def __init__(self, options=dict(), pieces=None):
    self.solve_for_all = options.get('solve_for_all', True)
    self.print_impossible = options.get('print_impossible', False)
    self.print_solutions = options.get('print_solutions', False)

    self.use_cross = options.get('use_cross', None)
    self.use_line = options.get('use_line', None)
    self.normal_rectangle = options.get('normal_rectangle', True)
    
    piece_ordering = [0, 7, 3, 2, 5, 6, 1, 4]
    
    self.solved = None
    
    self.month_abbr = [
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
    
    self.empty_board = [True] * (7*7)
    self.empty_board[0*7+6] = False
    self.empty_board[1*7+6] = False
    self.empty_board[6*7+3] = False
    self.empty_board[6*7+4] = False
    self.empty_board[6*7+5] = False
    self.empty_board[6*7+6] = False
    
    self.month_to_index = {
      self.month_abbr[0]: 0*7+0,
      self.month_abbr[1]: 0*7+1,
      self.month_abbr[2]: 0*7+2,
      self.month_abbr[3]: 0*7+3,
      self.month_abbr[4]: 0*7+4,
      self.month_abbr[5]: 0*7+5,
      self.month_abbr[6]: 1*7+0,
      self.month_abbr[7]: 1*7+1,
      self.month_abbr[8]: 1*7+2,
      self.month_abbr[9]: 1*7+3,
      self.month_abbr[10]: 1*7+4,
      self.month_abbr[11]: 1*7+5,
    }
    
    self.day_to_index = {
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
    
    self.index_to_name = [
      self.month_abbr[0],
      self.month_abbr[1],
      self.month_abbr[2],
      self.month_abbr[3],
      self.month_abbr[4],
      self.month_abbr[5],
      '---',
    
      self.month_abbr[6],
      self.month_abbr[7],
      self.month_abbr[8],
      self.month_abbr[9],
      self.month_abbr[10],
      self.month_abbr[11],
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
    
    if pieces is None:
      self.pieces = [
        'xxx\n'
        'xxx\n',

        'xx.\n'
        'xxx\n',

        'x..\n'
        'x..\n'
        'xxx\n',

        'xxx\n'
        'x.x\n',

        'xxxx\n'
        '...x\n',

        'xxxx\n'
        '..x.\n',

        'xxx.\n'
        '..xx\n',

        'xx.\n'
        '.x.\n'
        '.xx\n',
      ]
      
      if self.use_cross is not None:
        self.pieces[self.use_cross] = (
          '.x.\n'
          'xxx\n'
          '.x.\n')
      
      if not self.normal_rectangle:
        self.pieces[0] = (
          'xx.\n'
          'xxx\n'
          '.x.\n')
      
      if self.use_line is not None:
        if self.use_line == 0:
          self.pieces[self.use_line] = 'xxxxxx\n'
        else:
          self.pieces[self.use_line] = 'xxxxx\n'

      pieces2 = list()
      for piece_index in piece_ordering:
        pieces2.append(AllOrientations(self.pieces[piece_index]))
      for piece_index in range(len(pieces2)):
        if sum([x == 'x' for x in pieces2[piece_index][0]]) == 6:
          self.have_six_piece_index = piece_index
          break
      self.pieces = pieces2
      del pieces2

      for p in self.pieces:
        for i in range(len(p)):
          p[i] = [[char == 'x' for char in line.strip()]
                  for line in p[i].strip().splitlines()]
    else:
      self.pieces = copy.deepcopy(pieces)


  def StringForPiece(self, piece_index, orientation):
    cover = self.pieces[piece_index][orientation]
    return '\n'.join(
        [''.join(['x' if val else '.' for val in x]) for x in cover])


  def FindSolutions(self, b, pieces_left):
    if len(pieces_left) == 0:
      if self.print_solutions:
        print('SOLUTION ' + str(len(self.solved)))
        print(str(b))
      self.solved.append(b)
      return True
    piece_index = pieces_left[0]
    new_left = pieces_left[1:]
    found_solution = False
    for new_board in b.All(piece_index):
      impossible, only_move = new_board.IsImpossible()
      if impossible:
        if self.print_impossible and len(pieces_left) >= 6:
          print()
          print('IMPOSSIBLE')
          print(str(new_board))
        continue
      if only_move is not None:
        while only_move is not None:
          new_board = new_board.Place(
              only_move[0], only_move[1], only_move[2], only_move[3])
          impossible, only_move = new_board.IsImpossible()
          if impossible:
            break
        if impossible:
          continue
        only_move_pieces = list()
        for p in new_left:
          if new_board.used[p] is None:
            only_move_pieces.append(p)
        if self.FindSolutions(new_board, only_move_pieces):
          found_solution = True
          if not self.solve_for_all:
            return found_solution
      else:
        if self.FindSolutions(new_board, new_left):
          found_solution = True
          if not self.solve_for_all:
            return found_solution
    return found_solution

  def BoardForDate(self, month, day):
    b = Board(self)
    b.InitWithDate(month, day)
    return b

  def SetSolved(self, dict_dump):
    self.solved = list()
    target = dict_dump['target']
    used = [None] * len(self.pieces)
    for board_pieces in dict_dump['boards']:
      for full_elem in board_pieces:
        (piece_index, orientation, row, col) = full_elem
        used[piece_index] = (orientation, row, col)
      b = Board(self)
      b.InitWithUsed(target, used)
      self.solved.append(b)

  def Solve(self, month=None, day=None):
    if month is None or day is None:
      current_time = datetime.datetime.now()
      if month is None:
        month = self.month_abbr[current_time.month-1]
      if day is None:
        day = current_time.day
    
    self.solved = list()
    self.orig = self.BoardForDate(month, day)
    self.FindSolutions(self.orig, list(range(len(self.pieces))))

  def WriteSolutionsToFile(self, file_name):
    assert self.solved is not None
    with open(file_name, 'w') as f:
      for s in self.solved:
        f.write(str(s))
        f.write('\n')
      f.write('Found ' + str(len(self.solved)) + ' solutions')
      f.write('\n')
    
  def ToDict(self):
    assert self.solved is not None
    boards = []
    target = None
    for s in self.solved:
      board_pieces = list()
      if target is None:
        target = s.target[:]
      else:
        assert target == s.target
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        orientation, row, col = elem
        board_pieces.append((piece_index, orientation, row, col))
      boards.append(board_pieces)
    dump = dict()
    dump['pieces'] = self.pieces
    dump['target'] = target
    dump['boards'] = boards

    return dump
    
  def PrintCommonSingleConfigurations(self):
    assert self.solved is not None

    common_counts = dict()
    for s in self.solved:
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        orientation, row, col = elem
        pos = (piece_index, orientation, row, col)
        common_counts[pos] = common_counts.get(pos, 0) + 1
        # cover = pieces[piece_index][orientation]

    common = sorted(common_counts.items(), key=lambda x: (x[1], x[0]))
    common = list(filter(lambda x: x[1] > 1, common))

    total = len(self.solved)
    
    for i in range(max(0, len(common)-10), len(common)):
      piece_index, orientation, row, col = common[i][0]
      count = common[i][1]
      print()
      print(f'Most common position {count} of {total} ({count/total*100:.2f}%)')
      b = self.orig.Place(piece_index, orientation, row, col)
      assert b
      print(str(b))
    
  def PrintCommonDoubleConfigurations(self):
    assert self.solved is not None

    common_counts2 = dict()
    for s in self.solved:
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
    
    common2 = sorted(common_counts2.items(), key=lambda x: (x[1], x[0]))
    common2 = list(filter(lambda x: x[1] > 1, common2))
    
    total = len(self.solved)

    for i in range(max(0, len(common2)-10), len(common2)):
      pos1, pos2 = common2[i][0]
      piece_index1, orientation1, row1, col1 = pos1
      piece_index2, orientation2, row2, col2 = pos2
      count = common2[i][1]
      print()
      print(f'Most common double position {count} of {total} '
            f'({count/total*100:.2f}%)')
      b = self.orig.Place(piece_index1, orientation1, row1, col1)
      assert b
      b = b.Place(piece_index2, orientation2, row2, col2)
      assert b
      print(str(b))
    
  def OrderSolutionsMostCommonToLeast(self):
    assert self.solved is not None

    common_counts = dict()
    for s in self.solved:
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        orientation, row, col = elem
        pos = (piece_index, orientation, row, col)
        common_counts[pos] = common_counts.get(pos, 0) + 1

    score = [0] * len(self.solved)
    for i, s in enumerate(self.solved):
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        orientation, row, col = elem
        pos = (piece_index, orientation, row, col)
        score[i] += common_counts[pos]

    sorted_score = sorted(zip(score, range(len(score))))
    sorted_score.reverse()
    return [self.solved[x[1]] for x in sorted_score]
    
  def PrintSolutions(self, order_common_to_least=True):
    assert self.solved is not None
    solved = self.solved
    if order_common_to_least:
      solved = self.OrderSolutionsMostCommonToLeast()
    print('\n\n'.join([str(x) for x in solved]))
    print('Found ' + str(len(solved)) + ' solutions')


if __name__ == '__main__':
  import sys
  import random
  file_name = 'output.txt'
  # context = BoardContext({'print_solutions': True, 'solve_for_all': False})
  context = BoardContext()

  month = None
  day = None
  if len(sys.argv) > 2:
    month = context.month_abbr[
        [x.lower() for x in context.month_abbr].index(sys.argv[1].lower())]
    day = int(sys.argv[2])
  context.Solve(month, day)
  if file_name:
    context.WriteSolutionsToFile(file_name)
  if not context.solved:
    sys.exit(0)

  if len(context.solved) > 1:
    context.PrintCommonSingleConfigurations()
    print('X' * 78)
    print('X' * 78)
    print('X' * 78)
    context.PrintCommonDoubleConfigurations()

    print('X' * 78)
    print('X' * 78)
    print('X' * 78)
    print('Found ' + str(len(context.solved)) + ' solutions')
    print('X' * 78)
    print('X' * 78)
    print('X' * 78)

  context.PrintSolutions()


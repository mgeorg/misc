#include <stdio.h>
#include <stdlib.h>

const kBufferSize = 100000000;  // 100 MB
const kMaxProgramSize = 1000000;  // 1 MB

int main(int argc, char** argv) {
  int verbose = 0;
  FILE* file;
  if (argc <= 1) {
    printf("not enough arguments\n");
    return 1;
  }
  unsigned char program[kMaxProgramSize];
  unsigned char* inst_ptr = program;
  printf("Opening program '%s'\n", argv[1]);
  file = fopen(argv[1], "r");
  if (file == NULL) {
    printf("Could not open file '%s'\n", argv[1]);
    return 1;
  }
  int bracket_count = 0;
  while (!feof(file)) {
    unsigned char command;
    fread(&command, 1, 1, file);
    switch (command) {
    case '[':
      bracket_count+=2;  // adds 1 to count (after the decrement);
    case ']':
      bracket_count--;
    case '>':
    case '<':
    case '+':
    case '-':
    case '.':
    case ',':
      *inst_ptr = command;
      printf("%c", command);
      inst_ptr++;
      break;
    default:
      break;
    }
  }
  *inst_ptr = '\0';
  fclose(file);
  printf("\n");

  if (bracket_count != 0) {
    printf("non-matching '[' or ']'\n");
    return 1;
  }

  printf("Clearing buffer\n");
  unsigned char *buffer = malloc(sizeof(unsigned char)*kBufferSize);
  int i;
  for (i = 0; i < kBufferSize; ++i) {
    buffer[i] = 0;
  }
  printf("Executing program\n");
  unsigned char* ptr = buffer;
  inst_ptr = program;
  while (*inst_ptr != '\0') {
    if (verbose) {
      printf("Executing instruction '%c'\n", *inst_ptr);
    }
    switch (*inst_ptr) {
    case '<':
      ptr--;
      if (ptr < buffer) {
        printf("pointer is out of bounds (lower limit)\n");
        return 1;
      }
      break;
    case '>':
      ptr++;
      if (ptr >= buffer + kBufferSize) {
        printf("pointer is out of bounds (upper limit)\n");
        return 1;
      }
      break;
    case '-':
      (*ptr)--;
      break;
    case '+':
      (*ptr)++;
      break;
    case '.':
      if (verbose) {
        printf("printing character number %d, which looks like '%c'\n",
               *ptr,*ptr);
      } else {
        putchar(*ptr);
      }
      break;
    case ',':
      *ptr = getchar();
      break;
    case '[':
      if (! *ptr) {
        // Advance instruction pointer to next matching ']'
        int counter = 1;
        while (counter > 0) {
          inst_ptr++;
          if (*inst_ptr == '[') {
            counter++;
          } else if (*inst_ptr == ']') {
            counter--;
          }
        }
      }
      break;
    case ']':
      if (*ptr) {
        // Rewind instruction pointer to last matching '['
        int counter = 1;
        while (counter > 0) {
          inst_ptr--;
          if (*inst_ptr == ']') {
            counter++;
          } else if (*inst_ptr == '[') {
            counter--;
          }
        }
      }
      break;
    }
    inst_ptr++;

    if (verbose) {
      for (i = 0; i < 20; ++i) {
        if (buffer + i == ptr) {
          printf("*");
        }
        printf("%u,", buffer[i]);
      }
      printf("\n");
    }
  }
  free(buffer);
  printf("\n");
  return 0;
}

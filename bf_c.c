#include <stdio.h>
#include <stdlib.h>

const kMaxProgramSize = 1000000;  // 1 MB

int main(int argc, char** argv) {
  int verbose = 0;
  if (argc <= 1) {
    printf("not enough arguments\n");
    return 1;
  }
  unsigned char program[kMaxProgramSize];
  unsigned char* inst_ptr = program;
  printf("Opening program '%s'\n", argv[1]);
  char brainfuck_filename[1000];
  char c_filename[1000];
  sprintf(brainfuck_filename, "%s.bf", argv[1]);
  FILE* file = fopen(brainfuck_filename, "r");
  if (file == NULL) {
    printf("Could not open file '%s'\n", brainfuck_filename);
    return 1;
  }
  sprintf(c_filename, "%s.bf.c", argv[1]);
  FILE* output_file = fopen(c_filename, "w");
  if (output_file == NULL) {
    printf("Could not open file '%s'\n", c_filename);
    return 1;
  }
  fprintf(output_file, "#include <stdio.h>\nint main() {char buf[1000];int i=0;for(;i<1000;++i)buf[i]=0;char* ptr=buf;");
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

  printf("Compiling program to C\n");
  inst_ptr = program;
  while (*inst_ptr != '\0') {
    switch (*inst_ptr) {
    case '<':
      fprintf(output_file, "ptr--;");
      break;
    case '>':
      fprintf(output_file, "ptr++;");
      break;
    case '-':
      fprintf(output_file, "(*ptr)--;");
      break;
    case '+':
      fprintf(output_file, "(*ptr)++;");
      break;
    case '.':
      fprintf(output_file, "putchar(*ptr);");
      break;
    case ',':
      fprintf(output_file, "*ptr = getchar();");
      break;
    case '[':
      fprintf(output_file, "while(*ptr){");
      break;
    case ']':
      fprintf(output_file, "}");
      break;
    }
    inst_ptr++;
  }
  fprintf(output_file, "}");
  fclose(output_file);
  char gcc_command[1000];
  sprintf(gcc_command, "gcc -o %s %s", argv[1], c_filename);
  system(gcc_command);
  return 0;
}

export const parseCliArgs = (argv: string[]): Map<string, string> => {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument ${argument}`);
    }

    const option = argument.slice(2);
    const separatorIndex = option.indexOf("=");

    if (separatorIndex >= 0) {
      const key = option.slice(0, separatorIndex);
      const value = option.slice(separatorIndex + 1);

      if (!value) {
        throw new Error(`Missing value for --${key}`);
      }

      values.set(key, value);
      continue;
    }

    const key = option;
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    values.set(key, value);
    index += 1;
  }

  return values;
};
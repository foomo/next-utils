import path from 'path';
import enhancedResolve from 'enhanced-resolve';
import escalade from 'escalade/sync';

/**
 * Return the root path (package.json directory) of a given module
 * @param {string} module
 * @returns {string}
 */
export const getPackageRootDirectory = (resolveSymlinks: boolean, basePath: string = process.cwd()) => {
  const resolve = enhancedResolve.create.sync({
    symlinks: resolveSymlinks,
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.css', '.scss', '.sass'],
    mainFields: ['main', 'module', 'source'],
    // Is it right? https://github.com/webpack/enhanced-resolve/issues/283#issuecomment-775162497
    conditionNames: ['require'],
  });

  return (module: string) => {
    let packageDirectory;
    let packageRootDirectory;
    try {
      // Get the module path
      packageDirectory = resolve(basePath, module);

      if (!packageDirectory) {
        throw new Error(
          `next-transpile-modules - could not resolve module "${module}". Are you sure the name of the module you are trying to transpile is correct?`
        );
      }

      // Get the location of its package.json
      const pkgPath = escalade(packageDirectory, (dir: string, names: string[]) => {
        if (names.includes('package.json')) {
          return 'package.json';
        }
        return false;
      }) as string;
      if (pkgPath == null) {
        throw new Error(
          `next-transpile-modules - an error happened when trying to get the root directory of "${module}". Is it missing a package.json?`
        );
      }
      packageRootDirectory = path.dirname(pkgPath);
    } catch (err) {
      throw new Error(
        `next-transpile-modules - an unexpected error happened when trying to resolve "${module}"\n${err}`
      );
    }
    return packageRootDirectory;
  };
};

/**
 * compare two RegEx objects via String conversion
 * two regex are equal if they both are a regex and their string representation (state machine) is equal
 * @param x
 * @param y
 * @returns
 */
export const regexEqual = (x: any, y: any) => {
  return typeof x === typeof y && typeof y === typeof RegExp && String(x) === String(y);
};

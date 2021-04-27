/**
 * next-transpile-modules is based on the wonderful work at
 *  https://github.com/martpie/next-transpile-modules
 * The intention behind this project is to extend it to work better with exotic
 * module setups probably not required by the normal user of next-transpile-modules, also TypeScript
 */

import { RuleSetRule } from 'webpack';
import { getPackageRootDirectory, regexEqual } from './utils/path';
import { createLogger } from './utils/logger';

const CWD = process.cwd();

/**
 * Matcher function for webpack to decide which modules to transpile
 * @param {string[]} modulesToTranspile
 * @param {function} logger
 * @returns {(path: string) => boolean}
 */
const createWebpackMatcher = (modulesToTranspile: string[], logger = createLogger(false)) => {
  return (filePath: string) => {
    const isNestedNodeModules = (filePath.match(/node_modules/g) || []).length > 1;

    if (isNestedNodeModules) {
      return false;
    }

    return modulesToTranspile.some((modulePath) => {
      const transpiled = filePath.startsWith(modulePath);
      if (transpiled) {
        logger.info(`transpiled: ${filePath}`);
      }
      return transpiled;
    });
  };
};

export type TranspileModuleOptions = {
  resolveSymlinks: boolean;
  debug: boolean;
};

const baseOptions: TranspileModuleOptions = {
  resolveSymlinks: true,
  debug: false,
};

/**
 * Transpile modules with Next.js Babel configuration
 * @param {string[]} modules
 * @param {{resolveSymlinks?: boolean, debug?: boolean, __unstable_matcher: (path: string) => boolean}} options
 */
const withTmInitializer = (
  modules: string[] = [],
  options: Partial<TranspileModuleOptions> = {},
  modulePathResolver?: (moduleName: string) => string
) => {
  const { debug, resolveSymlinks } = { ...baseOptions, ...options };
  const logger = createLogger(debug);
  const packageRootDirResolver = modulePathResolver ?? getPackageRootDirectory(resolveSymlinks, CWD);

  const withTM = (nextConfig: Record<string, any> = {}) => {
    if (modules.length === 0) {
      return nextConfig;
    }

    const isWebpack5 = (nextConfig.future && nextConfig.future.webpack5) || false;

    /**
     * Our own Node.js resolver that can ignore symlinks resolution and  can support
     * PnP
     */

    // Resolve modules to their real paths
    const modulesPaths = modules.map(packageRootDirResolver);

    if (isWebpack5) logger.warn(`experimental Webpack 5 support enabled`);

    logger.debug(`the following paths will get transpiled:\n${modulesPaths.map((mod) => `  - ${mod}`).join('\n')}`);

    // Generate Webpack condition for the passed modules
    // https://webpack.js.org/configuration/module/#ruleinclude
    const matcher = createWebpackMatcher(modulesPaths, logger);

    return Object.assign({}, nextConfig, {
      // FIXME: try using typed config after switching to webpack 5 (e.g. config: WebpackOptionsNormalized)
      webpack(config: any, options: Record<string, any>) {
        if (resolveSymlinks !== undefined) {
          // Avoid Webpack to resolve transpiled modules path to their real path as
          // we want to test modules from node_modules only. If it was enabled,
          // modules in node_modules installed via symlink would then not be
          // transpiled.
          config.resolve.symlinks = resolveSymlinks;
        }

        const loaderOptions = {
          test: /\.+(js|jsx|mjs|ts|tsx)$/,
          loader: options.defaultLoaders.babel,
          include: matcher,
        };

        // Add a rule to include and parse all modules (js & ts)
        if (isWebpack5) {
          config.module.rules.push({
            ...loaderOptions,
            type: 'javascript/auto',
          });

          if (resolveSymlinks === false) {
            // IMPROVE ME: we are losing all the cache on node_modules, which is terrible
            // The problem is managedPaths does not allow to isolate specific specific folders
            config.snapshot = Object.assign(config.snapshot || {}, {
              managedPaths: [],
            });
          }
        } else {
          config.module.rules.push(loaderOptions);
        }

        // Support CSS modules + global in node_modules
        // TODO ask Next.js maintainer to expose the css-loader via defaultLoaders
        const nextCssLoaders = config.module.rules.find((rule: any) => typeof rule.oneOf === 'object');

        // .module.css
        if (nextCssLoaders) {
          const nextCssLoader = (nextCssLoaders as RuleSetRule).oneOf.find(
            (rule: any) => rule.sideEffects === false && regexEqual(rule.test, /\.module\.css$/)
          ) as any;

          const nextSassLoader = (nextCssLoaders as RuleSetRule).oneOf.find(
            (rule) => rule.sideEffects === false && regexEqual(rule.test, /\.module\.(scss|sass)$/)
          ) as any;

          if (nextCssLoader) {
            nextCssLoader.issuer.or = nextCssLoader.issuer.and ? nextCssLoader.issuer.and.concat(matcher) : matcher;
            delete nextCssLoader.issuer.not;
            delete nextCssLoader.issuer.and;
          } else {
            console.warn('next-transpile-modules - could not find default CSS rule, CSS imports may not work');
          }

          if (nextSassLoader) {
            nextSassLoader.issuer.or = nextSassLoader.issuer.and ? nextSassLoader.issuer.and.concat(matcher) : matcher;
            delete nextSassLoader.issuer.not;
            delete nextSassLoader.issuer.and;
          } else {
            console.warn('next-transpile-modules - could not find default SASS rule, SASS imports may not work');
          }
        }

        // Make hot reloading work!
        // FIXME: not working on Wepback 5
        // https://github.com/vercel/next.js/issues/13039
        config.watchOptions.ignored = [
          ...config.watchOptions.ignored.filter((pattern: string) => pattern !== '**/node_modules/**'),
          `**node_modules/{${modules.map((mod) => `!(${mod})`).join(',')}}/**/*`,
        ];

        // Overload the Webpack config if it was already overloaded
        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options);
        }

        return config;
      },
    });
  };

  return withTM;
};

module.exports = withTmInitializer;

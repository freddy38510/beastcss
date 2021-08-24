import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import Beastcss from '../src/index';

export const instantiateBeastcss = (fixture = null, options = {}) =>
  new Beastcss({
    logLevel: 'silent',
    path: fixture ? path.join(__dirname, `fixtures/${fixture}/`) : __dirname,
    ...options,
  });

export const copyDir = async (src, dest) => {
  try {
    await fs.promises.access(dest);
  } catch (_e) {
    await fs.promises.mkdir(dest, { recursive: true });
  }

  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  entries.forEach(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);

      return;
    }

    if (path.join(src, entry.name) === dest) {
      return;
    }

    await copyDir(srcPath, destPath);
  });
};

/**
 * Delete the distributable folder from the passed fixture folder
 *
 * @param {string} fixture fixture dir name
 */
export async function cleanDist(fixture) {
  await new Promise((resolve, reject) => {
    try {
      rimraf(path.resolve(__dirname, `fixtures/${fixture}`, 'dist'), resolve);
    } catch (e) {
      reject(e);
    }
  });
}

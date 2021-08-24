/**
 * Read the contents of a file from the specified filesystem
 *
 * @param {string} filePath path to file
 * @returns {Promise<string>} a Promise resolved to file content
 */
export async function readFile(filePath) {
  if (this.readFile.constructor.name === 'Function') {
    return new Promise((resolve, reject) => {
      this.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
    });
  }

  return this.readFile(filePath, 'utf8');
}

/**
 * Remove a file from the specified filesystem
 *
 * @param {string} filePath path to file
 * @returns {Promise<void>}
 */
export async function removeFile(filePath) {
  if (this.rm.constructor.name === 'Function') {
    return new Promise((resolve, reject) => {
      this.rm(filePath, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  return this.rm(filePath);
}

/**
 * Writes data to a file from the specified filesystem
 *
 * @param {string} filePath path to file
 * @param {string|Buffer} data the data to write
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, data) {
  if (this.writeFile.constructor.name === 'Function') {
    return new Promise((resolve, reject) => {
      this.writeFile(filePath, data, 'utf-8', (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  return this.writeFile(filePath, data, 'utf-8');
}

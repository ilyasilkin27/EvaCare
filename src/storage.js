
import fs from 'fs/promises';

export const readData = async (path) => {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      const initial = { userId: null, tablets: [] };
      await writeData(path, initial);
      return initial;
    }
    throw err;
  }
};

export const writeData = async (path, data) => fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');

export const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

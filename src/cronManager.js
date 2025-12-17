
import cron from 'node-cron';

const jobs = new Map();

export const scheduleDaily = (id, hhmm, cb) => {
  if (jobs.has(id)) {
    jobs.get(id).stop();
    jobs.delete(id);
  }
  const [hh, mm] = hhmm.split(':').map((s) => s.padStart(2, '0'));
  const expr = `${mm} ${hh} * * *`;
  const job = cron.schedule(expr, cb, { scheduled: true });
  jobs.set(id, job);
  return job;
};

export const cancel = (id) => {
  if (!jobs.has(id)) return;
  jobs.get(id).stop();
  jobs.delete(id);
};

export const clearAll = () => {
  jobs.forEach((job) => job.stop());
  jobs.clear();
};

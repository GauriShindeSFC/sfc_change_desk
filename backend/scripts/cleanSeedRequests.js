import { ChangeRequest } from '../models/index.js';

async function cleanSeedRequests() {
  try {
    const deleted = await ChangeRequest.destroy({
      where: {
        id: ['CR-2038', 'CR-2041', 'CR-2044', 'CR-2048', 'CR-2049', 'CR-2050', 'CR-2051', 'CR-2052']
      }
    });
    console.log(`[DB Clean] Successfully deleted ${deleted} static seed requests.`);
    process.exit(0);
  } catch (err) {
    console.error('[DB Clean Error]:', err.message);
    process.exit(1);
  }
}

cleanSeedRequests();

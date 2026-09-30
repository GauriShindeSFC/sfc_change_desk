import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../utils/corsOriginMatcher.js';

assert.equal(isAllowedOrigin('https://hello.stfox.com', ['https://stfox.com']), true);
assert.equal(isAllowedOrigin('https://stfox.com', ['https://stfox.com']), true);
assert.equal(isAllowedOrigin('https://example.com', ['https://stfox.com']), false);
console.log('cors origin matcher tests passed');

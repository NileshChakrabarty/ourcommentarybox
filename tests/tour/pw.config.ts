// Screenshot tour (not part of `npm run test:e2e`): OUT=<dir> npx playwright test --config tests/tour/pw.config.ts
import base from '../../playwright.config';
export default { ...base, testDir: '.', reporter: [['line']] };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('chalk', () => ({
    default: {
        red: (str) => str,
        yellow: (str) => str,
        green: (str) => str,
        blue: (str) => str,
        gray: (str) => str,
        bold: (str) => str,
        dim: (str) => str,
        cyan: (str) => str,
        magenta: (str) => str,
    },
}));
vitest_1.vi.mock('ora', () => ({
    default: () => ({
        start: vitest_1.vi.fn().mockReturnThis(),
        stop: vitest_1.vi.fn().mockReturnThis(),
        succeed: vitest_1.vi.fn().mockReturnThis(),
        fail: vitest_1.vi.fn().mockReturnThis(),
        warn: vitest_1.vi.fn().mockReturnThis(),
        info: vitest_1.vi.fn().mockReturnThis(),
        text: '',
    }),
}));
global.console = {
    ...console,
    log: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn(),
    info: vitest_1.vi.fn(),
};
afterEach(() => {
    vitest_1.vi.clearAllTimers();
});
afterEach(() => {
    vitest_1.vi.resetAllMocks();
});
//# sourceMappingURL=vitest-setup.js.map